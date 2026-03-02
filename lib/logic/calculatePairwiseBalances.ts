import { safeFloat } from "./rounding";
import { calculateShares } from "./calculateShares";
import { Group, Member } from "@/types";

/**
 * For a given selfId, compute the net pairwise balance between self and each other member.
 * Positive = they owe self, Negative = self owes them.
 * 
 * This gives the intuitive "who owes whom" view, independent of settlement optimization.
 */
export const calculatePairwiseBalances = (
    group: Group,
    selfId: string
): Record<string, number> => {
    const pairwise: Record<string, number> = {};

    // Initialize pairwise balances for all members
    group.members.forEach(m => {
        if (m.id !== selfId) pairwise[m.id] = 0;
    });

    group.expenses.forEach(expense => {
        let shares: Record<string, number>;
        try {
            // Freeze ledger map to historic participants instead of modern group.members
            const historicMembers = Object.keys(expense.splits).map(id => ({ id, name: "Hist" } as Member));
            shares = calculateShares(expense.amount, expense.type, expense.splits, historicMembers);
        } catch {
            return; // Skip invalid expenses
        }

        const selfPaid = expense.paidBy === selfId;
        const selfShare = shares[selfId] || 0;

        if (selfPaid) {
            // Self paid → each other member's share is what they OWE self
            Object.entries(shares).forEach(([memberId, share]) => {
                if (memberId !== selfId && pairwise[memberId] !== undefined) {
                    pairwise[memberId] = safeFloat(pairwise[memberId] + share);
                }
            });
        } else {
            // Someone else paid → self's share is what self OWES the payer
            if (pairwise[expense.paidBy] !== undefined) {
                pairwise[expense.paidBy] = safeFloat(pairwise[expense.paidBy] - selfShare);
            }
        }
    });

    // Sanitize floating-point dust and negative-zeros
    Object.keys(pairwise).forEach(id => {
        pairwise[id] = safeFloat(pairwise[id]);
        if (Object.is(pairwise[id], -0) || Math.abs(pairwise[id]) <= 0.005) {
            pairwise[id] = 0;
        }
    });

    return pairwise;
};
