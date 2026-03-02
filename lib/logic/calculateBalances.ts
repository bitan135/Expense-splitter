import { Group } from "@/types";
import { calculateShares } from "./calculateShares";
import { safeFloat } from "./rounding";

/**
 * Calculates the net balance for each member in the group.
 * Positive balance = owed money (gets back).
 * Negative balance = owes money (pays).
 */
export const calculateBalances = (group: Group): Record<string, number> => {
    const balances: Record<string, number> = {};

    // Initialize 0 balance
    group.members.forEach(m => balances[m.id] = 0);

    group.expenses.forEach(expense => {
        try {
            // Strike Iota Fix: Construct historical members exclusively from the frozen expense.splits array.
            // This prevents Dynamic Ledger Corruption if group members are later deleted or excluded.
            // We NO LONGER pass active `group.members` because that forces historical expenses to adapt
            // to modern membership permutations, corrupting historical balances natively.
            const historicMembers = Object.keys(expense.splits).map(id => ({ id, name: "Historical" } as any));

            const shares = calculateShares(
                expense.amount,
                expense.type,
                expense.splits,
                historicMembers
            );

            // 1. Payer gets credit (only if they still exist in balances)
            if (balances[expense.paidBy] !== undefined) {
                balances[expense.paidBy] = safeFloat(balances[expense.paidBy] + expense.amount);
            }

            // 2. Splitters get debit
            Object.entries(shares).forEach(([memberId, shareAmount]) => {
                if (balances[memberId] !== undefined) {
                    balances[memberId] = safeFloat(balances[memberId] - shareAmount);
                }
            });

        } catch (e) {
            console.warn(`Error calculating shares for expense ${expense.id}:`, e);
        }
    });

    // --- Consistency Guard (Strike Lambda Skill 2: Financial Precision) ---
    // The sum of all balances in a closed group MUST algebraically equal strictly 0.
    // If floating-point fractional scaling caused a 1-cent drop/gain across 50 expenses, 
    // we logically correct the discrepancy on the largest debtor to maintain absolute structural integrity.
    let totalSum = 0;
    let maxAbsBalance = -1;
    let maxAbsMemberId = "";

    Object.entries(balances).forEach(([id, bal]) => {
        totalSum += bal;
        if (Math.abs(bal) > maxAbsBalance) {
            maxAbsBalance = Math.abs(bal);
            maxAbsMemberId = id;
        }
    });

    totalSum = safeFloat(totalSum);

    if (totalSum !== 0 && maxAbsMemberId) {
        if (Math.abs(totalSum) <= 1.00) {
            // Apply the mathematical correction 
            balances[maxAbsMemberId] = safeFloat(balances[maxAbsMemberId] - totalSum);
        } else {
            console.error(`Structural Mathematical Corruption detected! Divergence of ${totalSum} exceeds ±1.00 bound.`);
        }
    }
    // ----------------------------------------------------------------------

    // Sanitize floating-point dust and negative-zeros
    Object.keys(balances).forEach(id => {
        // Enforce strict 2-decimal truncation to match UI $0.00 rules natively
        balances[id] = safeFloat(balances[id]);
        if (Object.is(balances[id], -0) || Math.abs(balances[id]) <= 0.005) {
            balances[id] = 0;
        }
    });

    return balances;
};
