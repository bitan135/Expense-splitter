"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card, Input } from "@/components/ui/base"
import { Check, X } from "lucide-react"
import { SplitType, Expense } from "@/types"
import { generateId, getTimestamp } from "@/lib/utils"
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

    useEffect(() => {
        if (group && group.members.length > 0 && !paidBy) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPaidBy(group.members[0].id)
        }
    }, [group, paidBy])

    if (!state.loaded) return <div>Loading...</div>
    if (!group) return <div>Group not found</div>

    const handleSplitChange = useCallback((memberId: string, value: string) => {
        const num = parseFloat(value) || 0
        setSplits(prev => ({ ...prev, [memberId]: num }))
    }, [])

    const handleExcludeToggle = useCallback((memberId: string) => {
        setSplits(prev => {
            const current = prev[memberId] !== 0 ? 1 : 0
            return { ...prev, [memberId]: current === 1 ? 0 : 1 }
        })
    }, [])

    const handleSubmit = useCallback(() => {
        setError(null)
        const numAmount = parseFloat(amount)

        if (!title.trim()) return setError("Enter expense title")
        if (isNaN(numAmount) || numAmount <= 0) return setError("Enter valid amount")
        if (!paidBy) return setError("Select payer")

        try {
            // Validate shares
            // Normalize splits for exclude if needed (default to 1 if missing)
            const finalSplits = { ...splits }
            if (splitType === 'exclude') {
                group.members.forEach(m => {
                    if (finalSplits[m.id] === undefined) finalSplits[m.id] = 1 // Include by default
                })
            }

            calculateShares(numAmount, splitType, finalSplits, group.members)

            // Create Expense
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
    }, [amount, title, paidBy, splitType, splits, group, dispatch, router])

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header
                title="Add Expense"
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <X />
                    </Button>
                }
            />

            <main className="p-4 max-w-md mx-auto space-y-4">
                <Input
                    autoFocus
                    placeholder="What was this for?"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />

                <div className="flex gap-2">
                    <div className="relative w-10 flex items-center justify-center font-bold text-xl text-muted-foreground">
                        ₹
                    </div>
                    <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="text-lg font-bold"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Paid by</label>
                    <div className="flex flex-wrap gap-2">
                        {group.members.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setPaidBy(m.id)}
                                className={`px-4 py-2 rounded-full text-sm border transition-colors ${paidBy === m.id
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background hover:bg-muted"
                                    }`}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Split</label>
                    <div className="flex p-1 bg-muted rounded-xl">
                        {(['equal', 'custom', 'percent', 'exclude'] as SplitType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setSplitType(t)}
                                className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-all ${splitType === t
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dynamic Split Inputs */}
                <Card className="p-4 space-y-3">
                    {group.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between">
                            <span className={splitType === 'exclude' && splits[m.id] === 0 ? "text-muted-foreground line-through" : ""}>
                                {m.name}
                            </span>

                            {splitType === 'equal' && (
                                <span className="text-sm text-muted-foreground">Auto</span>
                            )}

                            {(splitType === 'custom' || splitType === 'percent') && (
                                <div className="w-24 relative">
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        className="h-9 text-right pr-6"
                                        value={splits[m.id] || ""}
                                        onChange={e => handleSplitChange(m.id, e.target.value)}
                                    />
                                    <span className="absolute right-2 top-2 text-xs text-muted-foreground">
                                        {splitType === 'percent' ? '%' : '₹'}
                                    </span>
                                </div>
                            )}

                            {splitType === 'exclude' && (
                                <button
                                    onClick={() => handleExcludeToggle(m.id)}
                                    className={`h-6 w-6 rounded border flex items-center justify-center ${(splits[m.id] !== 0) // Default included
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-background"
                                        }`}
                                >
                                    {(splits[m.id] !== 0) && <Check size={14} />}
                                </button>
                            )}
                        </div>
                    ))}
                </Card>

                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
                        {error}
                    </div>
                )}

                <Button className="w-full h-12 text-lg active:scale-[0.98] transition-transform" onClick={handleSubmit}>
                    Save Expense
                </Button>
            </main>
        </div>
    )
}
