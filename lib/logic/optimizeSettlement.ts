import { safeFloat } from "./rounding";

export interface Transaction {
    from: string;
    to: string;
    amount: number;
}

/**
 * Optimizes settlement calculations to minimize the number of transactions.
 * Uses a greedy algorithm matching largest debtors with largest creditors.
 */
export const optimizeSettlement = (balances: Record<string, number>): Transaction[] => {
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(balances).forEach(([id, amount]) => {
        // Filter out negligible amounts (floating point dust)
        if (Math.abs(amount) < 0.01) return;

        if (amount > 0) {
            creditors.push({ id, amount });
        } else {
            debtors.push({ id, amount: -amount }); // Store positive magnitude
        }
    });

    // Sort by magnitude descending to handle largest debts first (Greedy)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: Transaction[] = [];

    // --- EXACT MATCH PASS ---
    // If a debtor exactly matches a creditor, settle them 1-1 immediately to prevent greedy fragmentation.
    for (let di = 0; di < debtors.length; di++) {
        if (debtors[di].amount < 0.01) continue;
        for (let ci = 0; ci < creditors.length; ci++) {
            if (creditors[ci].amount < 0.01) continue;

            // Check if exact match (accounting for rounding dust)
            if (Math.abs(debtors[di].amount - creditors[ci].amount) < 0.01) {
                transactions.push({
                    from: debtors[di].id,
                    to: creditors[ci].id,
                    amount: safeFloat(debtors[di].amount)
                });

                // Zero them out
                debtors[di].amount = 0;
                creditors[ci].amount = 0;
                break; // Move to next debtor
            }
        }
    }

    // --- GREEDY PASS ---
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        // Skip if already zeroed out by Exact Match pass
        if (debtor.amount < 0.01) {
            i++;
            continue;
        }
        if (creditor.amount < 0.01) {
            j++;
            continue;
        }

        // The amount to settle is the minimum of what debtor owes and what creditor is owed
        const amount = Math.min(debtor.amount, creditor.amount);

        // safeFloat to avoid 0.000000000002
        const safeAmount = safeFloat(amount);

        if (safeAmount > 0) {
            transactions.push({
                from: debtor.id,
                to: creditor.id,
                amount: safeAmount,
            });
        }

        // Update remaining amounts
        debtor.amount = safeFloat(debtor.amount - amount);
        creditor.amount = safeFloat(creditor.amount - amount);

        // If fully settled, move to next
        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }

    return transactions;
};
