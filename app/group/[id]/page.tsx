"use client"

import { useState, use, memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { ArrowLeft, Plus, Users, Receipt, FileText, Trash2, Settings } from "lucide-react"
import { calculateBalances } from "@/lib/logic/calculateBalances"
import { cn } from "@/lib/utils"
import { Group, Expense, Member } from "@/types"

const MemberItem = memo(({ member, balance }: { member: Member, balance: number }) => {
    const isPositive = balance > 0
    const isZero = Math.abs(balance) < 0.01

    return (
        <Card className="p-4 flex justify-between items-center active-press">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-base">
                    {member.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="font-semibold text-base">{member.name}</span>
            </div>

            {!isZero && (
                <div className="flex flex-col items-end">
                    <span className={cn(
                        "font-bold tabular-nums text-lg",
                        isPositive ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {isPositive ? "+" : "-"}₹{Math.abs(balance).toFixed(2)}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-50">
                        {isPositive ? "gets back" : "owes"}
                    </span>
                </div>
            )}
            {isZero && <span className="text-muted-foreground text-sm font-medium">Settled</span>}
        </Card>
    )
})
MemberItem.displayName = "MemberItem"

const ExpenseItem = memo(({ expense, group, onClick }: { expense: Expense, group: Group, onClick: (eId: string) => void }) => {
    const payer = group.members.find(m => m.id === expense.paidBy)?.name || "Unknown"

    return (
        <Card
            className="p-4 active-press relative group overflow-hidden cursor-pointer"
            onClick={() => onClick(expense.id)}
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg leading-tight text-foreground">{expense.title}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md">{payer} paid</span>
                        <span>•</span>
                        <span>{new Date(expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="font-bold text-xl tabular-nums tracking-tight">₹{expense.amount.toFixed(2)}</span>
                    <div className="text-[10px] text-primary font-medium mt-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details →
                    </div>
                </div>
            </div>
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

    if (!state.loaded) return <div className="p-10 text-center text-muted-foreground">Loading...</div>
    if (!group) return <div className="p-10 text-center text-muted-foreground">Group not found</div>

    const totalSpend = group.expenses.reduce((sum, e) => sum + e.amount, 0)

    return (
        <div className="min-h-screen bg-background pb-32">
            <Header
                title={group.name}
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                        <ArrowLeft className="text-foreground" />
                    </Button>
                }
            />

            <main className="p-5 max-w-md mx-auto space-y-8">

                {/* Hero Total Spend */}
                <section className="text-center py-6">
                    <h2 className="text-label mb-2">Total Expenses</h2>
                    <div className="text-hero tabular-nums">
                        <span className="text-3xl font-normal text-muted-foreground align-top mt-2 inline-block mr-1">₹</span>
                        {totalSpend.toFixed(2)}
                    </div>
                </section>

                {/* Member List */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-label">Members</h3>
                        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-secondary" onClick={() => setIsAddMemberOpen(true)}>
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
                            <div className="text-center py-12 text-muted-foreground bg-secondary/50 rounded-3xl border border-dashed border-border/50">
                                No members yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* Expense List */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-label">Recent Activity</h3>
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
                                        onClick={(eId) => router.push(`/group/${id}/expense/${eId}`)}
                                    />
                                ))
                        ) : (
                            <div className="text-center py-12 text-muted-foreground bg-secondary/50 rounded-3xl border border-dashed border-border/50">
                                No expenses yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* Floating Actions */}
                <div className="fixed bottom-8 left-0 right-0 z-30 flex justify-center gap-4 pointer-events-none px-6">
                    <Button
                        onClick={() => router.push(`/group/${id}/statement`)}
                        className="h-14 flex-1 rounded-2xl shadow-xl bg-secondary text-foreground font-semibold pointer-events-auto border border-white/5 active:scale-95 transition-transform"
                    >
                        <FileText size={20} className="mr-2 opacity-50" /> Statement
                    </Button>
                    <Button
                        onClick={() => router.push(`/group/${id}/expense/new`)}
                        className="h-14 flex-[1.5] rounded-2xl shadow-xl bg-primary text-primary-foreground font-bold pointer-events-auto active:scale-95 transition-transform"
                    >
                        <Plus size={22} className="mr-2" /> Add Expense
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
                        className="text-lg bg-secondary"
                    />
                    <Button className="w-full" size="lg" onClick={handleAddMember}>Add to Group</Button>
                </div>
            </Modal>
        </div>
    )
}
