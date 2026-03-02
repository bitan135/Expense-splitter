"use client"

import { useState, useEffect, use, memo, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { ArrowLeft, Plus, Users, Receipt, FileText, Trash2, ArrowRight, Contact } from "lucide-react"
import { calculateBalances } from "@/lib/logic/calculateBalances"
import { calculatePairwiseBalances } from "@/lib/logic/calculatePairwiseBalances"
import { cn, formatAmount } from "@/lib/utils"
import { Group, Expense, Member } from "@/types"
import { Haptics } from "@/lib/logic/haptics"

import { optimizeSettlement, Transaction } from "@/lib/logic/optimizeSettlement"
import { SettlementModal } from "@/components/group/settlement-modal"
const MemberItem = memo(({ member, pairwiseBalance, transactions, groupMembers, isSelf, selfId, selfBalance, onSettle }: {
    member: Member, pairwiseBalance: number, transactions: Transaction[], groupMembers: Member[],
    isSelf: boolean, selfId: string | undefined, selfBalance: number,
    onSettle: (type: 'pay' | 'receive' | 'record', payerId: string, receiverId: string, amount: number) => void
}) => {
    // Check pairwise first (intuitive self ↔ member relationship)
    const hasPairwise = Math.abs(pairwiseBalance) >= 0.01

    // If pairwise is zero, check for outstanding optimized third-party transactions
    const thirdPartyTx = !isSelf && !hasPairwise
        ? transactions.find(t => t.from === member.id || t.to === member.id)
        : undefined

    const isPositive = isSelf ? selfBalance > 0
        : hasPairwise ? pairwiseBalance > 0
            : thirdPartyTx ? thirdPartyTx.to === member.id // they receive = positive for them
                : false
    const isZero = isSelf ? Math.abs(selfBalance) < 0.01 : !hasPairwise && !thirdPartyTx
    const amount = isSelf ? Math.abs(selfBalance)
        : hasPairwise ? Math.abs(pairwiseBalance)
            : thirdPartyTx ? thirdPartyTx.amount : 0

    let text = ""
    let type: 'pay' | 'receive' | 'record' = 'pay'
    let actionPayerId = ""
    let actionReceiverId = ""

    if (isSelf) {
        text = isPositive ? "Gets back overall" : "Owes overall"
    } else if (hasPairwise) {
        if (pairwiseBalance > 0) {
            text = "Owes you"
            type = 'receive'
            actionPayerId = member.id
            actionReceiverId = selfId || ""
        } else {
            text = "You owe"
            type = 'pay'
            actionPayerId = selfId || ""
            actionReceiverId = member.id
        }
    } else if (thirdPartyTx) {
        type = 'record'
        actionPayerId = thirdPartyTx.from
        actionReceiverId = thirdPartyTx.to
        const otherId = thirdPartyTx.from === member.id ? thirdPartyTx.to : thirdPartyTx.from
        const otherName = groupMembers.find(m => m.id === otherId)?.name || "?"
        if (thirdPartyTx.from === member.id) {
            text = `Owes ${otherName}`
        } else {
            text = `Gets from ${otherName}`
        }
    }

    const buttonLabel = type === 'record' ? 'Record' : isPositive ? 'Collect' : 'Settle'

    return (
        <Card className={cn(
            "p-4 flex justify-between items-center active-press shadow-organic border-border/50 transition-colors",
            isSelf && "ring-[1.5px] ring-primary bg-primary/[0.03]",
            !isZero && !isSelf && (isPositive ? "bg-primary/[0.02]" : "bg-destructive/[0.02]")
        )}>
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className={cn(
                    "h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm relative shrink-0 shadow-sm",
                    isSelf ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary"
                        : isZero ? "bg-secondary text-muted-foreground"
                            : type === 'record' ? "bg-amber-600/10 text-amber-700 dark:text-amber-500"
                                : isPositive ? "bg-primary/10 text-primary"
                                    : "bg-destructive/10 text-destructive"
                )}>
                    {member.name.substring(0, 2).toUpperCase()}
                    {isSelf && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                            YOU
                        </div>
                    )}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[15px] truncate leading-tight">{member.name}</span>
                    {!isZero && (
                        <span className={cn(
                            "text-xs font-bold tabular-nums mt-0.5",
                            isSelf ? "text-muted-foreground"
                                : type === 'record' ? "text-amber-700 dark:text-amber-500"
                                    : isPositive ? "text-primary" : "text-destructive"
                        )}>
                            {text} {formatAmount(amount)}
                        </span>
                    )}
                    {isZero && (
                        <span className="text-xs font-medium text-primary/60 mt-0.5">
                            {isSelf ? "All settled ✓" : "Settled ✓"}
                        </span>
                    )}
                </div>
            </div>

            {!isZero && !isSelf && (
                <Button
                    size="sm"
                    className={cn(
                        "h-8 px-4 text-xs font-bold transition-all active:scale-95 rounded-xl shrink-0 ml-2 shadow-none",
                        type === 'record' ? "bg-amber-600/10 text-amber-700 dark:text-amber-500 hover:bg-amber-600/20"
                            : isPositive ? "bg-primary/10 text-primary hover:bg-primary/20"
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        onSettle(type, actionPayerId, actionReceiverId, amount)
                    }}
                >
                    {buttonLabel}
                </Button>
            )}
        </Card>
    )
})
MemberItem.displayName = "MemberItem"

const ExpenseItem = memo(({ expense, group, onClick, index = 0 }: { expense: Expense, group: Group, onClick: (eId: string) => void, index?: number }) => {
    const payer = group.members.find(m => m.id === expense.paidBy)?.name || "Unknown"
    const isSettlement = expense.type === 'settlement'

    // For settlement, find who received it
    const receiverId = isSettlement ? Object.keys(expense.splits)[0] : null
    const receiver = receiverId ? group.members.find(m => m.id === receiverId)?.name || "Unknown" : ""

    return (
        <Card
            className="active-press relative group overflow-hidden cursor-pointer shadow-organic border-border/50 hover:shadow-glow animate-in slide-in-from-bottom-2 fade-in fill-mode-both"
            style={{ animationDelay: `${index * 40}ms` }}
            onClick={() => {
                Haptics.light()
                onClick(expense.id)
            }}
        >
            {/* Left accent bar */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 rounded-l-[1.75rem]",
                isSettlement ? "bg-primary" : "bg-primary/20"
            )} />
            <div className="p-4 pl-5">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <span className="font-semibold text-lg leading-tight text-foreground">{expense.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {isSettlement ? (
                                <>
                                    <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md flex items-center gap-1">
                                        {payer} <ArrowRight size={10} /> {receiver}
                                    </span>
                                    {expense.settlementMethod && (
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                                            expense.settlementMethod === 'upi'
                                                ? "bg-amber-600/10 text-amber-700 dark:text-amber-500"
                                                : "bg-primary/10 text-primary"
                                        )}>
                                            {expense.settlementMethod === 'upi' ? 'UPI' : 'Cash'}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span className="font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md">{payer} paid</span>
                            )}
                            <span>•</span>
                            <span>{new Date(expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-xl tabular-nums tracking-tight">{formatAmount(expense.amount)}</span>
                        <span className="text-muted-foreground/40 text-lg ml-1">›</span>
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
    const [newMemberUpi, setNewMemberUpi] = useState("")

    // Detect Contact Picker API on client (cannot check during SSR)
    const [contactsSupported, setContactsSupported] = useState(false)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nav = navigator as any
        if ('contacts' in navigator && typeof nav.contacts?.select === 'function') {
            setContactsSupported(true)
        }
    }, [])

    // Settlement Logic
    const [settlementModalOpen, setSettlementModalOpen] = useState(false)
    const [settlementContext, setSettlementContext] = useState<{
        payerId?: string,
        receiverId?: string,
        maxAmount: number,
        mode: 'settle' | 'collect' | 'record'
    }>({ maxAmount: 0, mode: 'settle' })

    const group = state.groups.find(g => g.id === id)
    const balances = useMemo(() => group ? calculateBalances(group) : {}, [group?.members, group?.expenses])
    const transactions = useMemo(() => group ? optimizeSettlement(group) : [], [group])

    const selfId = group?.selfId
    const [selfPickerOpen, setSelfPickerOpen] = useState(false)

    // Show self-picker when selfId is unset and group has members
    useEffect(() => {
        if (group && group.members.length > 0 && !group.selfId) {
            setSelfPickerOpen(true)
        }
    }, [group])

    // Dynamic Title Tag for SEO and shared links
    useEffect(() => {
        if (group) {
            document.title = `${group.name} | Expense Splitter`
        } else {
            document.title = "Expense Splitter"
        }
    }, [group?.name])

    const handleSetSelf = useCallback((memberId: string) => {
        dispatch({ type: "SET_SELF", payload: { groupId: id, memberId } })
        setSelfPickerOpen(false)
    }, [dispatch, id])

    const handleAddMember = useCallback(() => {
        if (!newMemberName.trim()) return
        const upiVal = newMemberUpi.trim()
        dispatch({
            type: "ADD_MEMBER",
            payload: { groupId: id, name: newMemberName.trim(), ...(upiVal ? { upiId: upiVal } : {}) }
        })
        setNewMemberName("")
        setNewMemberUpi("")
        setIsAddMemberOpen(false)
    }, [dispatch, id, newMemberName, newMemberUpi])

    const handleImportContact = useCallback(async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nav = navigator as any
            if (!('contacts' in navigator) || !nav.contacts?.select) return
            const contacts = await nav.contacts.select(['name', 'tel'], { multiple: false })
            if (contacts && contacts.length > 0) {
                const c = contacts[0]
                if (c.name && c.name.length > 0) setNewMemberName(c.name[0])
                if (c.tel && c.tel.length > 0) setNewMemberUpi(c.tel[0].replace(/\D/g, ''))
            }
        } catch {
            // User cancelled or API error — ignore
        }
    }, [])

    const handleDeleteExpense = useCallback((groupId: string, expenseId: string) => {
        dispatch({
            type: "DELETE_EXPENSE",
            payload: { groupId, expenseId }
        })
    }, [dispatch])

    const openSettlement = useCallback((type: 'pay' | 'receive' | 'record', payerId: string, receiverId: string, amount: number) => {
        if (!selfId && type !== 'record') {
            setSelfPickerOpen(true)
            return
        }
        setSettlementContext({
            payerId: payerId,
            receiverId: receiverId,
            maxAmount: amount,
            mode: type === 'record' ? 'record' : (type === 'pay' ? 'settle' : 'collect')
        })
        setSettlementModalOpen(true)
    }, [selfId])

    const totalSpend = useMemo(() =>
        group ? group.expenses.filter(e => e.type !== 'settlement').reduce((sum, e) => sum + e.amount, 0) : 0
        , [group])

    const sortedExpenses = useMemo(() =>
        group ? group.expenses.slice().sort((a, b) => b.createdAt - a.createdAt) : []
        , [group])

    const expensesOnly = useMemo(() => sortedExpenses.filter(e => e.type !== 'settlement'), [sortedExpenses])
    const settlementsOnly = useMemo(() => sortedExpenses.filter(e => e.type === 'settlement'), [sortedExpenses])

    // Pairwise net: positive = they owe self, negative = self owes them
    const pairwise = useMemo(() => {
        if (!group || !selfId) return {}
        return calculatePairwiseBalances(group, selfId)
    }, [group, selfId])

    if (!state.loaded) return <div className="p-10 text-center text-muted-foreground">Loading...</div>
    if (!group) return <div className="p-10 text-center text-muted-foreground">Group not found</div>


    return (
        <div className="min-h-screen bg-background pb-32">
            <Header
                title={group.name}
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => {
                        Haptics.light()
                        router.push("/")
                    }}>
                        <ArrowLeft className="text-foreground" size={20} />
                    </Button>
                }
            />

            <main className="p-5 max-w-md mx-auto space-y-8">

                {/* Hero Total Spend */}
                <section className="py-6">
                    <Card className="p-6 text-center bg-gradient-to-br from-card to-secondary/50 shadow-organic border-border/50">
                        <h2 className="text-label mb-3">Total Expenses</h2>
                        <div className="text-hero tabular-nums tracking-tighter leading-none">
                            <span className="text-3xl font-medium text-muted-foreground align-top mt-2 inline-block mr-1 tracking-normal">₹</span>
                            {totalSpend.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Users size={12} className="opacity-50" />
                                {group.members.length} members
                            </span>
                            <span className="opacity-30">·</span>
                            <span className="flex items-center gap-1.5">
                                <Receipt size={12} className="opacity-50" />
                                {expensesOnly.length} expenses
                            </span>
                        </div>
                    </Card>
                </section>

                {/* Members */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-label">Members</h3>
                        <Button size="sm" variant="ghost" className="h-8 text-xs hover:bg-secondary" onClick={() => setIsAddMemberOpen(true)}>
                            <Plus size={14} className="mr-1" /> Add
                        </Button>
                    </div>
                    <div className="grid gap-2.5">
                        {group.members.map((member, i) => (
                            <div key={member.id} className="animate-in slide-in-from-bottom-2 fade-in fill-mode-both" style={{ animationDelay: `${i * 40}ms` }}>
                                <MemberItem
                                    member={member}
                                    pairwiseBalance={pairwise[member.id] || 0}
                                    transactions={transactions}
                                    groupMembers={group.members}
                                    isSelf={member.id === selfId}
                                    selfId={selfId}
                                    selfBalance={balances[member.id] || 0}
                                    onSettle={(...args) => {
                                        Haptics.medium()
                                        openSettlement(...args)
                                    }}
                                />
                            </div>
                        ))}
                        {group.members.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-secondary/50 rounded-3xl border border-dashed border-border/50">
                                No members yet.
                            </div>
                        )}
                    </div>
                </section>

                {/* Settlement Plan */}
                {transactions.length > 0 && (
                    <section className="space-y-3">
                        <div className="px-1">
                            <h3 className="text-label">Settlement Plan</h3>
                            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Optimized to minimize transactions</p>
                        </div>
                        <Card className="p-4 shadow-organic border-border/50">
                            <div className="grid gap-3">
                                {transactions.map((tx, i) => {
                                    const fromName = group.members.find(m => m.id === tx.from)?.name || "?"
                                    const toName = group.members.find(m => m.id === tx.to)?.name || "?"

                                    const isSelfPayer = tx.from === selfId
                                    const isSelfReceiver = tx.to === selfId
                                    const type = isSelfPayer ? 'pay' : isSelfReceiver ? 'receive' : 'record'
                                    const buttonLabel = type === 'record' ? 'Record' : isSelfPayer ? 'Settle' : 'Collect'

                                    return (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-semibold text-foreground">{fromName}</span>
                                                    <ArrowRight size={12} className="text-muted-foreground/40" />
                                                    <span className="font-semibold text-foreground">{toName}</span>
                                                </div>
                                                <span className="font-bold text-sm tabular-nums mt-0.5">{formatAmount(tx.amount)}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "h-8 px-4 text-xs font-bold transition-all active:scale-95 rounded-xl shrink-0 ml-2 shadow-none",
                                                    type === 'record' ? "bg-amber-600/10 text-amber-700 dark:text-amber-500 hover:bg-amber-600/20"
                                                        : isSelfReceiver ? "bg-primary/10 text-primary hover:bg-primary/20"
                                                            : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    Haptics.medium()
                                                    openSettlement(type, tx.from, tx.to, tx.amount)
                                                }}
                                            >
                                                {buttonLabel}
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </section>
                )}

                {/* Expenses List */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-label">Expenses</h3>
                    </div>
                    <div className="grid gap-3">
                        {expensesOnly.length > 0 ? (
                            expensesOnly.map((expense, i) => (
                                <ExpenseItem
                                    key={expense.id}
                                    expense={expense}
                                    group={group}
                                    index={i}
                                    onClick={(eId) => router.push(`/group/${id}/expense/${eId}`)}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-6 text-center mt-6">
                                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mb-6 shadow-organic ring-1 ring-primary/20">
                                    <span className="text-4xl shadow-sm">💸</span>
                                </div>
                                <h3 className="text-xl font-extrabold mb-2 tracking-tight">Split the Bill</h3>
                                <p className="text-muted-foreground/80 text-[15px] mb-8 max-w-[240px] leading-relaxed">
                                    Add your first expense to see who owes who.
                                </p>
                                <Button
                                    onClick={() => router.push(`/group/${id}/expense/new`)}
                                    className="h-12 px-6 rounded-full bg-primary/10 text-primary hover:bg-primary/20 shadow-none font-bold active:scale-95 transition-transform border border-primary/20"
                                >
                                    <Plus size={18} className="mr-2" /> Add Expense
                                </Button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Settled Activity List */}
                {settlementsOnly.length > 0 && (
                    <section className="space-y-4 pt-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-label">Settled Activity</h3>
                        </div>
                        <div className="grid gap-3">
                            {settlementsOnly.map((expense, i) => (
                                <ExpenseItem
                                    key={expense.id}
                                    expense={expense}
                                    group={group}
                                    index={i}
                                    onClick={(eId) => router.push(`/group/${id}/expense/${eId}`)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Floating Premium Action Bar */}
                <div className="fixed bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 pointer-events-none px-4 animate-in slide-in-from-bottom-8 duration-500 delay-200 fill-mode-both">
                    <div className="max-w-md mx-auto w-full pointer-events-auto flex items-center gap-2 p-2 rounded-full backdrop-blur-2xl bg-background/80 border border-border/50 shadow-[0_12px_40px_-10px_rgba(5,150,105,0.25)] dark:shadow-[0_12px_40px_-10px_rgba(16,185,129,0.15)] ring-1 ring-black/5 dark:ring-white/5">
                        <Button
                            onClick={() => {
                                Haptics.light()
                                router.push(`/group/${id}/statement`)
                            }}
                            className="flex-1 rounded-[2rem] h-14 bg-secondary shadow-none hover:bg-secondary/90 text-foreground font-bold transition-transform active:scale-95 text-[15px] border border-transparent dark:border-white/5"
                        >
                            <FileText size={18} className="mr-2 opacity-50" /> Statement
                        </Button>
                        <Button
                            onClick={() => {
                                Haptics.medium()
                                router.push(`/group/${id}/expense/new`)
                            }}
                            className="flex-1 rounded-[2rem] h-14 glass-bevel text-primary-foreground font-extrabold shadow-sm active:scale-95 transition-transform text-[15px]"
                        >
                            <Plus size={18} className="mr-1.5" /> Add Expense
                        </Button>
                    </div>
                </div>

            </main>

            {/* Add Member Modal */}
            <Modal
                isOpen={isAddMemberOpen}
                onClose={() => setIsAddMemberOpen(false)}
                title="Add Member"
            >
                <div className="space-y-4 pt-2">
                    {contactsSupported && (
                        <button
                            onClick={handleImportContact}
                            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-secondary hover:bg-secondary/80 text-sm font-semibold transition-all active:scale-[0.97]"
                        >
                            <Contact size={18} className="text-primary" />
                            Import from Contacts
                        </button>
                    )}
                    <Input
                        autoFocus
                        placeholder="Enter name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                        className="text-lg bg-secondary"
                    />
                    <Input
                        placeholder="UPI ID or Phone (optional)"
                        value={newMemberUpi}
                        onChange={(e) => setNewMemberUpi(e.target.value)}
                        className="text-base bg-secondary"
                        autoCapitalize="none"
                        autoCorrect="off"
                    />
                    <Button className="w-full" size="lg" onClick={handleAddMember}>Add to Group</Button>
                </div>
            </Modal>

            {/* Self Picker */}
            <Modal
                isOpen={selfPickerOpen}
                onClose={() => setSelfPickerOpen(false)}
                title="Which one is you?"
            >
                <div className="grid gap-3 pt-2">
                    {group.members.map(m => (
                        <button
                            key={m.id}
                            onClick={() => handleSetSelf(m.id)}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all active:scale-[0.97]"
                        >
                            <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center text-foreground font-bold text-base">
                                {m.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-lg">{m.name}</span>
                        </button>
                    ))}
                </div>
            </Modal>

            {/* Settlement Modal */}
            <SettlementModal
                isOpen={settlementModalOpen}
                onClose={() => setSettlementModalOpen(false)}
                group={group}
                initialPayerId={settlementContext.payerId}
                initialReceiverId={settlementContext.receiverId}
                maxAmount={settlementContext.maxAmount}
                mode={settlementContext.mode}
            />
        </div>
    )
}
