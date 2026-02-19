export type SplitType = 'equal' | 'exact' | 'custom' | 'percent' | 'exclude' | 'settlement';

export interface Member {
    id: string;
    name: string;
}

export interface Expense {
    id: string;
    groupId: string;
    title: string;
    amount: number;
    paidBy: string; // memberId
    type: SplitType;
    splits: Record<string, number>; // memberId -> value (amount, percent, or 0/1 for exclude)
    createdAt: number;
}

export interface Group {
    id: string;
    name: string;
    members: Member[];
    expenses: Expense[];
    currency: string;
    lastUpdated: number;
}
