import { safeFloat } from "./rounding";
import { Group } from "@/types";
import { calculatePairwiseBalances } from "./calculatePairwiseBalances";

export interface Transaction {
    from: string;
    to: string;
    amount: number;
}

/**
 * Calculates direct net pairwise settlements between all members.
 * This guarantees the exact 1:1 debt history is preserved, rather than
 * shuffling debts to third parties using greedy graph simplification.
 */
export const optimizeSettlement = (group: Group): Transaction[] => {
    const transactions: Transaction[] = [];

    group.members.forEach(member => {
        // Evaluate the pairwise balance from the perspective of this member
        const pairwise = calculatePairwiseBalances(group, member.id);

        Object.entries(pairwise).forEach(([otherId, amount]) => {
            // If the amount is positive, the other person owes this member.
            // We only record the positive edges to avoid duplicate inverse edges (A->B vs B->A).
            if (amount > 0) {
                transactions.push({
                    from: otherId,
                    to: member.id,
                    amount: safeFloat(amount)
                });
            }
        });
    });

    // Deterministic sorting by magnitude descending
    return transactions.sort((a, b) => b.amount - a.amount);
};
