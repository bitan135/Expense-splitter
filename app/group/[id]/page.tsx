"use client"

import { useState, use, memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { ArrowLeft, Plus, Users, Receipt, FileText, Trash2 } from "lucide-react"
import { calculateBalances } from "@/lib/logic/calculateBalances"
import { cn } from "@/lib/utils"
import { Group, Expense, Member } from "@/types"

const MemberItem = memo(({ member, balance }: { member: Member, balance: number }) => {
    const isPositive = balance > 0
    const isZero = Math.abs(balance) < 0.01

    return (
        <Card className="p-4 flex justify-between items-center active-press">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm">
                    {member.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="font-medium text-base">{member.name}</span>
            </div>

            {!isZero && (
                <div className="flex flex-col items-end">
                    <span className={cn(
                        "font-bold tabular-nums text-base",
                        isPositive ? "text-emerald-400" : "text-rose-400"
                    )}>
                        {isPositive ? "+" : "-"}₹{Math.abs(balance).toFixed(2)}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                        {isPositive ? "gets back" : "owes"}
                    </span>
                </div>
            )}
            {isZero && <span className="text-muted-foreground text-sm">Settled</span>}
        </Card>
    )
})
MemberItem.displayName = "MemberItem"

const ExpenseItem = memo(({ expense, group, onDelete }: { expense: Expense, group: Group, onDelete: (id: string, eId: string) => void }) => {
    const payer = group.members.find(m => m.id === expense.paidBy)?.name || "Unknown"

    return (
        <Card className="p-4 active-press relative group overflow-hidden">
            <div className="flex justify-between items-start mb-1">
                <div className="flex flex-col">
                    <span className="font-semibold text-base text-foreground">{expense.title}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-primary/80">{payer}</span> paid
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-bold text-base tabular-nums">₹{expense.amount.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">
                        {new Date(expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    if (confirm("Delete expense?")) onDelete(group.id, expense.id)
                }}
                className="absolute inset-y-0 right-0 w-16 bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
            >
                <Trash2 size={18} />
            </button>
        </Card>
    )
})
ExpenseItem.displayName = "ExpenseItem"

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { state, dispatch } = useStore()
    const router = useRouter()
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
    const [newMemberName, setNewMemberName] = useState("")

    const group = state.groups.find(g => g.id === id)

    const balances = group ? calculateBalances(group) : {}

    const handleAddMember = useCallback(() => {
        if (!newMemberName.trim()) return
        dispatch({
            type: "ADD_MEMBER",
            payload: { groupId: id, name: newMemberName.trim() }
        })
        setNewMemberName("")
        setIsAddMemberOpen(false)
    }, [dispatch, id, newMemberName])

    const handleDeleteExpense = useCallback((groupId: string, expenseId: string) => {
        dispatch({
            type: "DELETE_EXPENSE",
            payload: { groupId, expenseId }
        })
    }, [dispatch])

    if (!state.loaded) return <div className="p-4 text-center">Loading...</div>
    if (!group) return <div className="p-4 text-center">Group not found</div>

    const totalSpend = group.expenses.reduce((sum, e) => sum + e.amount, 0)

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header
                title={group.name}
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                        <ArrowLeft />
                    </Button>
                }
            >
                <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center text-xs font-medium text-muted-foreground bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <Users size={14} />
                        <span>{group.members.length} Members</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Total:</span>
                        <span className="text-foreground font-bold text-sm">₹{totalSpend.toFixed(2)}</span>
                    </div>
                </div>
            </Header>

            <main className="p-4 max-w-md mx-auto space-y-8">

                {/* Member List */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Members</h3>
                        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-white/5" onClick={() => setIsAddMemberOpen(true)}>
                            <Plus size={14} className="mr-1" /> Add
                        </Button>
                    </div>
                    <div className="grid gap-3">
                        {group.members.map(member => (
                            <MemberItem
                                key={member.id}
                                member={member}
                                balance={balances[member.id] || 0}
                            />
                        ))}
                        {group.members.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground bg-secondary/30 rounded-3xl border border-dashed border-border">
                                No members yet. Add people to split costs.
                            </div>
                        )}
                    </div>
                </section>

                {/* Expense List */}
                <section className="space-y-4 pb-20">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Expenses</h3>
                        <span className="text-xs text-muted-foreground">Recent activity</span>
                    </div>
                    <div className="grid gap-3">
                        {group.expenses.length > 0 ? (
                            group.expenses
                                .slice()
                                .reverse()
                                .map(expense => (
                                    <ExpenseItem
                                        key={expense.id}
                                        expense={expense}
                                        group={group}
                                        onDelete={handleDeleteExpense}
                                    />
                                ))
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-secondary/30 rounded-3xl border border-dashed border-border">
                                No expenses yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* Floating Actions */}
                <div className="fixed bottom-8 right-6 z-30 flex flex-col gap-4 items-end pointer-events-none">
                    <Button
                        onClick={() => router.push(`/group/${id}/statement`)}
                        className="h-12 px-6 rounded-full shadow-lg bg-secondary text-secondary-foreground pointer-events-auto backdrop-blur-md bg-opacity-90 border border-white/10"
                    >
                        <FileText size={18} className="mr-2" /> Statement
                    </Button>
                    <Button
                        onClick={() => router.push(`/group/${id}/expense/new`)}
                        size="icon"
                        className="h-16 w-16 rounded-full shadow-2xl shadow-primary/30 pointer-events-auto active:scale-95 transition-transform"
                    >
                        <Plus size={32} />
                    </Button>
                </div>

            </main>

            {/* Add Member Modal */}
            <Modal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                title="Add Member"
            >
                <div className="space-y-6 pt-2">
                    <Input
                        autoFocus
                        placeholder="Enter name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                        className="text-lg"
                    />
                    <Button className="w-full" size="lg" onClick={handleAddMember}>Add to Group</Button>
                </div>
            </Modal>
        </div>
    )
}
