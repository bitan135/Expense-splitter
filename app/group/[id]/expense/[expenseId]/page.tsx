"use client"

import { use, memo } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card } from "@/components/ui/base"
import { ArrowLeft, Edit2, Trash2, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string, expenseId: string }> }) {
    const { id, expenseId } = use(params)
    const { state, dispatch } = useStore()
    const router = useRouter()

    const group = state.groups.find(g => g.id === id)
    const expense = group?.expenses.find(e => e.id === expenseId)

    if (!state.loaded) return <div className="p-10 text-center text-muted-foreground">Loading...</div>
    if (!group || !expense) return <div className="p-10 text-center text-muted-foreground">Expense not found</div>

    const payer = group.members.find(m => m.id === expense.paidBy)?.name || "Unknown"

    const handleDelete = () => {
        if (confirm("Permanently delete this expense?")) {
            dispatch({ type: "DELETE_EXPENSE", payload: { groupId: group.id, expenseId: expense.id } })
            router.back()
        }
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header
                title="Expense Details"
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="text-foreground" />
                    </Button>
                }
            />

            <main className="p-5 max-w-md mx-auto space-y-6">

                {/* Receipt Card */}
                <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
                    {/* Decorative Top */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-emerald-300 opacity-50" />

                    <div className="text-center space-y-1 pt-4">
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Amount</div>
                        <div className="text-5xl font-bold tabular-nums tracking-tight">₹{expense.amount.toFixed(2)}</div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xl font-semibold text-center">{expense.title}</div>
                        <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                            Paid by <span className="font-bold text-foreground">{payer}</span>
                        </div>
                    </div>

                    <div className="h-px bg-border/50 border-dashed border-b w-full" />

                    {/* Split Breakdown */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Split Breakdown</div>
                        {Object.entries(expense.splits).map(([memberId, splitAmount]) => {
                            if (splitAmount <= 0) return null
                            const memberName = group.members.find(m => m.id === memberId)?.name || "Unknown"
                            return (
                                <div key={memberId} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-primary/30" />
                                        <span className="font-medium">{memberName}</span>
                                    </div>
                                    <span className="font-mono font-semibold opacity-80">₹{splitAmount.toFixed(2)}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Date */}
                    <div className="text-center text-[10px] text-muted-foreground pt-4 opacity-50 font-mono">
                        {new Date(expense.createdAt).toLocaleString()}
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full text-foreground gap-2 h-14 rounded-2xl"
                        onClick={() => router.push(`/group/${id}/expense/${expense.id}/edit`)}
                    >
                        <Edit2 size={18} /> Edit
                    </Button>
                    <Button
                        size="lg"
                        className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 gap-2 h-14 rounded-2xl"
                        onClick={handleDelete}
                    >
                        <Trash2 size={18} /> Delete
                    </Button>
                </div>

            </main>
        </div>
    )
}
