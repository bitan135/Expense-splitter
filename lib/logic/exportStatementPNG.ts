import { Group } from "@/types";
import { calculateBalances } from "./calculateBalances";
import { optimizeSettlement } from "./optimizeSettlement";

export const exportStatementPNG = (group: Group) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Configuration ---
    const scale = 2; // High DPI
    const width = 800;
    const padding = 60;
    const backgroundColor = "#0E1116"; // Deep Charcoal
    const surfaceColor = "#161B22"; // Card Surface
    const textColor = "#FFFFFF";
    const mutedColor = "#8B949E";
    const accentColor = "#22C55E"; // Green
    const dangerColor = "#F85149"; // Red
    const borderColor = "#21262D";

    // --- Data Prep ---
    const balances = calculateBalances(group);
    const settlements = optimizeSettlement(balances);
    // Recent expenses (Last 8)
    const recentExpenses = group.expenses
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 8);

    // --- Layout Calculation ---
    const headerHeight = 180;

    // Net Balances Section
    const validBalances = Object.entries(balances).filter(([, bal]) => Math.abs(bal) > 0.01);
    const balancesHeight = 80 + (validBalances.length * 60) + 40; // Title + items + padding

    // Settings Section (Settlements)
    const settlementsHeight = settlements.length > 0 ? 80 + (settlements.length * 70) + 40 : 0;

    // Expenses Section
    const expensesHeight = recentExpenses.length > 0 ? 80 + (recentExpenses.length * 60) + 40 : 0;

    const footerHeight = 100;

    const totalHeight = headerHeight + balancesHeight + settlementsHeight + expensesHeight + footerHeight;

    // --- Setup Canvas ---
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    ctx.scale(scale, scale);

    // --- Background ---
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, totalHeight);

    // --- Helpers ---
    const drawLine = (y: number) => {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    };

    const drawCard = (x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = surfaceColor;
        // Rounded rect manual or just rect for now
        // Simple rounded rect:
        const r = 16;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    };

    let y = padding;

    // --- 1. Header ---
    // Group Name
    ctx.fillStyle = textColor;
    ctx.font = "bold 42px -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(group.name, padding, y + 40);

    // Date & Total
    y += 80;
    ctx.fillStyle = mutedColor;
    ctx.font = "500 18px -apple-system, sans-serif";
    ctx.fillText(`Statement · ${new Date().toLocaleDateString()}`, padding, y);

    const totalSpend = group.expenses.reduce((sum, e) => sum + e.amount, 0);
    ctx.fillStyle = textColor;
    ctx.font = "bold 24px -apple-system, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Total: ₹${totalSpend.toFixed(2)}`, width - padding, y);

    y += 60;
    drawLine(y);
    y += 40;

    // --- 2. Net Balances ---
    if (validBalances.length > 0) {
        ctx.fillStyle = mutedColor;
        ctx.font = "600 14px -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("NET BALANCES", padding, y);
        y += 30;

        validBalances.sort(([, a], [, b]) => b - a).forEach(([id, amount]) => {
            const member = group.members.find(m => m.id === id);
            if (!member) return;

            const isPos = amount > 0;
            const color = isPos ? accentColor : dangerColor;

            // Name
            ctx.fillStyle = textColor;
            ctx.font = "600 20px -apple-system, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(member.name, padding, y + 25);

            // Amount
            ctx.fillStyle = color;
            ctx.font = "bold 20px -apple-system, sans-serif"; // Monospace-ish nums not avail in standdard fonts easily without loading
            ctx.textAlign = "right";
            const prefix = isPos ? "+" : "";
            ctx.fillText(`${prefix}₹${amount.toFixed(2)}`, width - padding, y + 25);

            // Subtext
            ctx.fillStyle = isPos ? "#22c55e80" : "#F8514980";
            ctx.font = "600 12px -apple-system, sans-serif";
            ctx.fillText(isPos ? "GETS BACK" : "OWES", width - padding, y + 45);

            y += 68;
        });

        y += 20;
    }

    // --- 3. Settlements (Action Plan) ---
    if (settlements.length > 0) {
        y += 20;
        ctx.fillStyle = mutedColor;
        ctx.font = "600 14px -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("SETTLEMENT PLAN", padding, y);
        y += 30;

        settlements.forEach(s => {
            const from = group.members.find(m => m.id === s.from)?.name;
            const to = group.members.find(m => m.id === s.to)?.name;

            // Draw Card
            drawCard(padding, y, width - (padding * 2), 60);

            // Text inside card
            const centerY = y + 36;

            ctx.fillStyle = mutedColor;
            ctx.font = "18px -apple-system, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`${from}`, padding + 20, centerY);

            ctx.fillStyle = "#444"; // Arrow color
            ctx.font = "16px -apple-system, sans-serif";
            ctx.fillText("➔", padding + 140, centerY);

            ctx.fillStyle = textColor;
            ctx.font = "bold 18px -apple-system, sans-serif";
            ctx.fillText(`${to}`, padding + 180, centerY);

            ctx.fillStyle = textColor;
            ctx.textAlign = "right";
            ctx.font = "bold 20px -apple-system, sans-serif";
            ctx.fillText(`₹${s.amount.toFixed(2)}`, width - padding - 20, centerY);

            y += 75;
        });
        y += 20;
    }

    // --- 4. Recent Activity ---
    if (recentExpenses.length > 0) {
        y += 20;
        ctx.fillStyle = mutedColor;
        ctx.font = "600 14px -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`RECENT ACTIVITY (${recentExpenses.length})`, padding, y);
        y += 30;

        recentExpenses.forEach(e => {
            const payer = group.members.find(m => m.id === e.paidBy)?.name || "Unknown";

            ctx.fillStyle = textColor;
            ctx.font = "500 18px -apple-system, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(e.title, padding, y + 20);

            ctx.fillStyle = mutedColor;
            ctx.font = "14px -apple-system, sans-serif";
            ctx.fillText(`${payer} paid`, padding, y + 42);

            ctx.fillStyle = textColor;
            ctx.font = "bold 18px -apple-system, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(`₹${e.amount.toFixed(2)}`, width - padding, y + 30);

            y += 60;
        });
    }

    // --- Footer ---
    y += 60;
    ctx.fillStyle = surfaceColor;
    ctx.fillRect(0, y, width, 100); // Footer bg

    ctx.fillStyle = mutedColor;
    ctx.font = "14px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Generated by Expense Splitter", width / 2, y + 55);

    // --- Download ---
    const link = document.createElement("a");
    link.download = `${group.name.replace(/\s+/g, "_")}_statement.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
};
