import { Expense, Member } from "@/types";
import { distributeTotal, safeFloat } from "./rounding";

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export const calculateShares = (
    amount: number,
    type: Expense['type'],
    splits: Record<string, number>,
    members: Member[]
): Record<string, number> => {
    const memberIds = members.map(m => m.id);
    const activeSplits: Record<string, number> = {};

    // Filter splits to only include current members (in case member was removed)
    memberIds.forEach(id => {
        if (splits[id] !== undefined) {
            activeSplits[id] = splits[id];
        }
    });

    if (amount <= 0) return {};
    if (memberIds.length === 0) return {};

    switch (type) {
        case 'equal': {
            // Weight is 1 for everyone, unless explicitly set to 0 (excluded)
            const weights: Record<string, number> = {};
            memberIds.forEach(id => {
                // If the passed split has 0, it means user excluded this person.
                // We check strict 0 because undefined should default to included (1).
                if (activeSplits[id] === 0) {
                    weights[id] = 0;
                } else {
                    weights[id] = 1;
                }
            });
            return distributeTotal(amount, weights);
        }

        case 'percent': {
            const totalPercent = Object.values(activeSplits).reduce((sum, v) => sum + v, 0);
            // Validate with tolerance
            if (Math.abs(totalPercent - 100) > 0.1) {
                throw new ValidationError(`Total percentage must be 100% (Current: ${safeFloat(totalPercent)}%)`);
            }
            return distributeTotal(amount, activeSplits);
        }

        case 'custom': {
            const totalCustom = Object.values(activeSplits).reduce((sum, v) => sum + v, 0);
            if (totalCustom === 0) {
                throw new ValidationError("At least one person must pay something");
            }

            // If validation is strictly "Must equal amount", we enforce it:
            if (Math.abs(totalCustom - amount) > 0.01) {
                throw new ValidationError(`Total shares (₹${safeFloat(totalCustom)}) must equal expense amount (₹${amount})`);
            }

            // Since it's custom, we trust the inputs but ensure no weird floats
            const result: Record<string, number> = {};
            memberIds.forEach(id => {
                result[id] = safeFloat(activeSplits[id] || 0);
            });
            return result;
        }

        case 'exclude': {
            // Splits value: 0 (excluded) or 1 (included) 
            // Input from UI might be checked=true (1) unchecked=false (0) OR checked=exclude (1)
            // Logic requirement: "Exclude Mode: If all excluded -> block"
            // Let's assume splits[id] = 1 means INCLUDED, 0 means EXCLUDED (standard).
            // Or matches HTML app: "checked?0:1" -> checked means excluded.

            // Let's standardize: The UI will pass weights where 1 = share, 0 = no share.
            const weights: Record<string, number> = {};
            let includedCount = 0;

            memberIds.forEach(id => {
                const val = activeSplits[id] ? 1 : 0;
                weights[id] = val;
                includedCount += val;
            });

            if (includedCount === 0) {
                throw new ValidationError("At least one member must be included");
            }

            return distributeTotal(amount, weights);
        }

        case 'settlement': {
            // Settlement: 100% of the amount goes to the person specified in splits
            // The split value must match the amount
            const recipientId = Object.keys(activeSplits)[0];
            if (!recipientId) return {};

            const result: Record<string, number> = {};
            result[recipientId] = amount;
            return result;
        }

        default:
            return {};
    }
};
