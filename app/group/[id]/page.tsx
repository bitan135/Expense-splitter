"use client"

import { useState, use, memo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { ArrowLeft, Plus, Users, Receipt, FileText, Trash2 } from "lucide-react"

const MemberItem = memo(({ member }: { member: { id: string, name: string } }) => (
    <div className="bg-muted/50 p-2 rounded-lg text-sm truncate">
        {member.name}
    </div>
))
MemberItem.displayName = "MemberItem"

const ExpenseItem = memo(({ expense, payerName, onDelete }: { expense: any, payerName: string, onDelete: (id: string) => void }) => (
    <Card className="p-3 flex justify-between items-center transition-all active:scale-[0.98]">
        <div>
            <div className="font-medium">{expense.title}</div>
            <div className="text-xs text-muted-foreground">
                ₹{expense.amount.toFixed(2)} · Paid by {payerName}
            </div>
        </div>
        <button
            onClick={() => onDelete(expense.id)}
            className="text-muted-foreground hover:text-destructive p-2"
        >
            <Trash2 size={16} />
        </button>
    </Card>
))
ExpenseItem.displayName = "ExpenseItem"

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { state, dispatch } = useStore()
    const router = useRouter()
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
    const [newMemberName, setNewMemberName] = useState("")

    const group = state.groups.find(g => g.id === id)

    const handleAddMember = useCallback(() => {
        if (!newMemberName.trim()) return
        dispatch({
            type: "ADD_MEMBER",
            payload: { groupId: id, name: newMemberName.trim() }
        })
        setNewMemberName("")
        setIsAddMemberOpen(false)
    }, [dispatch, id, newMemberName])

    const handleDeleteExpense = useCallback((expenseId: string) => {
        if (confirm("Delete this expense?")) {
            dispatch({
                type: "DELETE_EXPENSE",
                payload: { groupId: id, expenseId }
            })
        }
    }, [dispatch, id])

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
                <div className="bg-card/50 backdrop-blur-sm px-4 py-2 border-b text-xs text-muted-foreground flex justify-between">
                    <span>{group.members.length} Members</span>
                    <span>Total: ₹{totalSpend.toFixed(2)}</span>
                </div>
            </Header>

            <main className="p-4 max-w-md mx-auto space-y-6">

                {/* Members Section */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Users size={16} /> Members
                        </h3>
                        <Button size="sm" variant="outline" onClick={() => setIsAddMemberOpen(true)}>
                            <Plus size={14} className="mr-1" /> Add
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {group.members.map(m => (
                            <MemberItem key={m.id} member={m} />
                        ))}
                        {group.members.length === 0 && (
                            <div className="col-span-2 text-sm text-muted-foreground italic">
                                No members yet. Add people to split costs.
                            </div>
                        )}
                    </div>
                </section>

                {/* Expenses Section */}
                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Receipt size={16} /> Expenses
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {group.expenses.slice().reverse().map(expense => {
                            const payer = group.members.find(m => m.id === expense.paidBy)?.name || "Unknown"
                            return (
                                <ExpenseItem
                                    key={expense.id}
                                    expense={expense}
                                    payerName={payer}
                                    onDelete={handleDeleteExpense}
                                />
                            )
                        })}
                        {group.expenses.length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground">
                                No expenses yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* Floating Actions */}
                <div className="fixed bottom-6 right-6 z-30 flex flex-col gap-3 items-end">
                    <Button
                        onClick={() => router.push(`/group/${id}/statement`)}
                        className="h-12 rounded-full shadow-lg bg-secondary text-secondary-foreground"
                    >
                        <FileText size={18} className="mr-2" /> Statement
                    </Button>
                    <Button
                        onClick={() => router.push(`/group/${id}/expense/new`)}
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-lg"
                    >
                        <Plus size={24} />
                    </Button>
                </div>

            </main>

            {/* Add Member Modal */}
            <Modal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                title="Add Member"
            >
                <div className="space-y-4">
                    <Input
                        autoFocus
                        placeholder="Name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                    />
                    <Button className="w-full" onClick={handleAddMember}>Add Member</Button>
                </div>
            </Modal>
        </div>
    )
}
