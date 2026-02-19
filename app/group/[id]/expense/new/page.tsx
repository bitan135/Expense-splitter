"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card, Input } from "@/components/ui/base"
import { Check, X } from "lucide-react"
import { SplitType, Expense } from "@/types"
import { generateId, getTimestamp, cn } from "@/lib/utils"
import { calculateShares, ValidationError } from "@/lib/logic/calculateShares"

export default function AddExpensePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { state, dispatch } = useStore()
    const router = useRouter()
    const group = state.groups.find(g => g.id === id)

    const [title, setTitle] = useState("")
    const [amount, setAmount] = useState("")
    const [paidBy, setPaidBy] = useState("")
    const [splitType, setSplitType] = useState<SplitType>("equal")
    const [splits, setSplits] = useState<Record<string, number>>({})
    const [error, setError] = useState<string | null>(null)
    const [excludeList, setExcludeList] = useState<string[]>([])

    // Calculate equal shares for display
    const calculateEqualShare = useCallback(() => {
        if (!group || !amount) return {}
        const numAmount = parseFloat(amount) || 0
        const activeMembers = group.members.filter(m => !excludeList.includes(m.id))
        const share = activeMembers.length > 0 ? numAmount / activeMembers.length : 0
        const shares: Record<string, number> = {}
        group.members.forEach(m => shares[m.id] = excludeList.includes(m.id) ? 0 : share)
        return shares
    }, [group, amount, excludeList])

    const calculateSharesDisplay = calculateEqualShare()

    useEffect(() => {
        if (group && group.members.length > 0 && !paidBy) {
            setPaidBy(group.members[0].id)
        }
    }, [group, paidBy])

    if (!state.loaded) return <div>Loading...</div>
    if (!group) return <div>Group not found</div>

    const getInputValue = (memberId: string) => {
        const val = splits[memberId]
        return val === undefined || val === 0 ? "" : val.toString()
    }

    const handleSplitChange = useCallback((memberId: string, value: string) => {
        const num = parseFloat(value) || 0
        setSplits(prev => ({ ...prev, [memberId]: num }))
    }, [])

    const handleExcludeToggle = useCallback((memberId: string) => {
        setExcludeList(prev => prev.includes(memberId)
            ? prev.filter(id => id !== memberId)
            : [...prev, memberId]
        )
    }, [])

    const handleSubmit = useCallback(() => {
        setError(null)
        const numAmount = parseFloat(amount)

        if (!title.trim()) return setError("Enter expense title")
        if (isNaN(numAmount) || numAmount <= 0) return setError("Enter valid amount")
        if (!paidBy) return setError("Select payer")

        try {
            let finalSplits: Record<string, number> = {}

            if (splitType === 'equal') {
                const includedMembers = group.members.filter(m => !excludeList.includes(m.id))
                const share = numAmount / includedMembers.length
                group.members.forEach(m => {
                    finalSplits[m.id] = excludeList.includes(m.id) ? 0 : share
                })
            } else {
                finalSplits = { ...splits }
            }

            calculateShares(numAmount, splitType, finalSplits, group.members)

            const expense: Expense = {
                id: generateId(),
                groupId: group.id,
                title: title.trim(),
                amount: numAmount,
                paidBy,
                type: splitType,
                splits: finalSplits,
                createdAt: getTimestamp()
            }

            dispatch({
                type: "ADD_EXPENSE",
                payload: { groupId: group.id, expense }
            })
            router.back()

        } catch (e) {
            console.error("Add Expense Error:", e)
            if (e instanceof ValidationError) {
                setError(e.message)
            } else {
                setError("An error occurred")
            }
        }
    }, [amount, title, paidBy, splitType, splits, group, dispatch, router, excludeList])

    return (
        <div className="min-h-screen bg-background pb-32">
            <Header
                title="Add Expense"
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <X className="text-muted-foreground" />
                    </Button>
                }
            />

            <main className="p-5 max-w-md mx-auto">

                {/* Massive Amount Input */}
                <div className="py-10 flex flex-col items-center justify-center">
                    <div className="relative w-full flex justify-center items-center">
                        <span className="text-4xl font-semibold text-muted-foreground/50 mr-2 -mt-2">₹</span>
                        <input
                            type="number"
                            inputMode="decimal"
                            value={amount}
                            autoFocus
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-transparent text-[5rem] font-bold text-center text-foreground placeholder:text-muted-foreground/20 focus:outline-none w-full leading-none tracking-tight"
                            placeholder="0"
                        />
                    </div>
                    <label className="text-label mt-4">Enter Amount</label>
                </div>

                <div className="space-y-8">
                    {/* Description */}
                    <div className="space-y-3">
                        <label className="text-label ml-1">Title</label>
                        <Input
                            placeholder="Dinner, Taxi, etc."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-xl h-16 bg-secondary"
                        />
                    </div>

                    {/* Paid By */}
                    <div className="space-y-3">
                        <label className="text-label ml-1">Paid By</label>
                        <div className="flex flex-wrap gap-2">
                            {group.members.map(member => (
                                <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => setPaidBy(member.id)}
                                    className={cn(
                                        "h-10 px-5 rounded-full text-sm font-semibold transition-all active-press",
                                        paidBy === member.id
                                            ? "bg-foreground text-background shadow-lg scale-105"
                                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    )}
                                >
                                    {member.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Split Type Selector */}
                    <div className="space-y-3">
                        <label className="text-label ml-1">Split Method</label>
                        <div className="p-1 bg-secondary rounded-2xl flex relative">
                            {["equal", "exact", "percent"].map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                        setSplitType(t as any)
                                        setSplits({})
                                    }}
                                    className={cn(
                                        "flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all z-10",
                                        splitType === t
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Members List for Split */}
                    <div className="space-y-3">
                        {group.members.map(member => (
                            <Card key={member.id} className="p-4 flex items-center justify-between bg-card">
                                <div className="flex items-center gap-3">
                                    {splitType === "equal" && (
                                        <button
                                            type="button"
                                            onClick={() => handleExcludeToggle(member.id)}
                                            className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors",
                                                !excludeList.includes(member.id)
                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                    : "border-muted-foreground/30 text-transparent"
                                            )}
                                        >
                                            <Check size={14} strokeWidth={4} />
                                        </button>
                                    )}
                                    <span className={cn(
                                        "font-medium text-lg transition-opacity",
                                        excludeList.includes(member.id) && splitType === "equal" ? "opacity-30" : "opacity-100"
                                    )}>
                                        {member.name}
                                    </span>
                                </div>

                                <div className="w-32 text-right">
                                    {splitType === "equal" ? (
                                        <span className={cn("text-lg font-mono", excludeList.includes(member.id) ? "text-muted-foreground line-through" : "text-foreground font-bold")}>
                                            ₹{(calculateSharesDisplay[member.id] || 0).toFixed(0)}
                                        </span>
                                    ) : (
                                        <div className="relative">
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
                                                {splitType === "percent" ? "%" : "₹"}
                                            </span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                className="w-full bg-secondary rounded-lg py-2 pl-2 pr-6 text-right text-lg font-bold focus:outline-none focus:ring-2 ring-foreground/20 font-mono min-h-[44px]"
                                                placeholder="0"
                                                value={getInputValue(member.id)}
                                                onChange={(e) => handleSplitChange(member.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>

                    <Button
                        onClick={handleSubmit}
                        className="w-full h-16 text-lg rounded-2xl shadow-xl bg-primary text-primary-foreground font-bold mt-8"
                        size="lg"
                        disabled={!amount || parseFloat(amount) <= 0}
                    >
                        Save Expense
                    </Button>

                    {error && (
                        <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-center font-semibold">
                            {error}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
