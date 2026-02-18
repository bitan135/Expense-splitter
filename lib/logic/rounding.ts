/**
 * Safely rounds a number to 2 decimal places to avoid floating point errors
 */
export const safeFloat = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Distributes a total amount among recipients based on weights, ensuring the sum matches the total exactly.
 * Usage:
 * - Equal split: weights are all 1
 * - Percent split: weights are percentages
 * - Custom split: weights are amounts (this function re-normalizes if needed, but for custom fixed amounts we might not use this unless distributing leftover)
 * 
 * Returns a map of memberId -> amount
 */
export const distributeTotal = (
    total: number,
    weights: Record<string, number>
): Record<string, number> => {
    const ids = Object.keys(weights);
    if (ids.length === 0) return {};

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return {};

    let distributedSum = 0;
    const result: Record<string, number> = {};

    // First pass: distribute based on ratios floor
    ids.forEach((id) => {
        const ratio = weights[id] / totalWeight;
        const share = Math.floor(total * ratio * 100) / 100;
        result[id] = share;
        distributedSum += share;
    });

    // Second pass: distribute remainder cents
    let remainder = safeFloat(total - distributedSum);

    // Sort by share decimal part descending to be fair? 
    // Or just give to first ones. For small groups, order doesn't matter much.
    // To be deterministic and "fair" visually, we can give to those with highest original weights first.
    const sortedIds = [...ids].sort((a, b) => weights[b] - weights[a]);

    let i = 0;
    while (remainder > 0.005 && i < sortedIds.length) {
        result[sortedIds[i]] = safeFloat(result[sortedIds[i]] + 0.01);
        remainder = safeFloat(remainder - 0.01);
        i = (i + 1) % sortedIds.length; // cycle if needed (rare)
    }

    return result;
};
