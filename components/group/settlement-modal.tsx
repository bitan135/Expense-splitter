"use client"

import { useState, useEffect } from "react"
import { Button, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { Group, Member } from "@/types"
import { useStore } from "@/lib/store"
import { safeFloat } from "@/lib/logic/rounding"
import { ArrowRight, Maximize2 } from "lucide-react"

interface SettlementModalProps {
    isOpen: boolean
    onClose: () => void
    group: Group
    initialPayerId?: string
    initialReceiverId?: string
    maxAmount?: number
}

export function SettlementModal({
    isOpen,
    onClose,
    group,
    initialPayerId,
    initialReceiverId,
    maxAmount = 0
}: SettlementModalProps) {
    const { dispatch } = useStore()
    const [amount, setAmount] = useState("")
    const [payerId, setPayerId] = useState(initialPayerId || "")
    const [receiverId, setReceiverId] = useState(initialReceiverId || "")

    useEffect(() => {
        if (isOpen) {
            setPayerId(initialPayerId || "")
            setReceiverId(initialReceiverId || "")
            setAmount("")
        }
    }, [isOpen, initialPayerId, initialReceiverId])

    const handleSettle = () => {
        const numAmount = safeFloat(parseFloat(amount))
        if (!payerId || !receiverId || payerId === receiverId || isNaN(numAmount) || numAmount <= 0) return

        const payer = group.members.find(m => m.id === payerId)
        const receiver = group.members.find(m => m.id === receiverId)

        if (!payer || !receiver) return

        // Dispatch as a special expense
        // "Payer" pays 100% of the amount.
        // The "Split" is 100% assigned to the "Receiver".
        // This means Payer effectively gave money to Receiver to cover Receiver's share?
        // Wait.
        // A settlement means Payer gives money to Receiver.
        // In "Expense" terms:
        // Payer = Person sending money (PayerId)
        // Split = Person *consumer* the value (ReceiverId)
        // If A pays B 100.
        // Expense: "Settlement to B". Paid by A. Split: B owes 100.
        // Net effect: A paid 100 (+100). B consumed 100 (-100).
        // Balance change: A +100, B -100.
        // If A owed B 100 (A was -100, B was +100).
        // New Balance A: -100 + 100 = 0.
        // New Balance B: +100 - 100 = 0.
        // Correct.

        dispatch({
            type: "ADD_EXPENSE",
            payload: {
                groupId: group.id,
                expense: {
                    id: crypto.randomUUID(),
                    groupId: group.id,
                    title: "Settlement",
                    amount: numAmount,
                    paidBy: payerId, // The person sending money
                    createdAt: Date.now(),
                    type: 'settlement',
                    splits: {
                        [receiverId]: numAmount // The person receiving money (consumes the payment)
                    }
                }
            }
        })
        onClose()
    }

    const setMax = () => {
        if (maxAmount > 0) setAmount(maxAmount.toFixed(2))
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settle Up">
            <div className="space-y-6 pt-2">

                {/* Visual Flow */}
                <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-2xl">
                    <div className="flex flex-col items-center gap-1 w-1/3">
                        <span className="text-xs text-muted-foreground font-bold uppercase">From</span>
                        <select
                            value={payerId}
                            onChange={(e) => setPayerId(e.target.value)}
                            className="bg-transparent font-semibold text-sm text-center w-full appearance-none outline-none min-h-[44px]"
                        >
                            <option value="" disabled>Select</option>
                            {group.members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <ArrowRight className="text-muted-foreground/50" />

                    <div className="flex flex-col items-center gap-1 w-1/3">
                        <span className="text-xs text-muted-foreground font-bold uppercase">To</span>
                        <select
                            value={receiverId}
                            onChange={(e) => setReceiverId(e.target.value)}
                            className="bg-transparent font-semibold text-sm text-center w-full appearance-none outline-none min-h-[44px]"
                        >
                            <option value="" disabled>Select</option>
                            {group.members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                        <Input
                            type="number"
                            autoFocus
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pl-8 text-2xl font-bold h-14"
                            placeholder="0.00"
                        />
                        {maxAmount > 0 && (
                            <button
                                onClick={setMax}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >
                                MAX
                            </button>
                        )}
                    </div>
                    {maxAmount > 0 && (
                        <div className="text-right text-xs text-muted-foreground mr-1">
                            Owed: ₹{maxAmount.toFixed(2)}
                        </div>
                    )}
                </div>

                <Button
                    className="w-full h-12 text-lg font-bold shadow-lg"
                    onClick={handleSettle}
                    disabled={!amount || parseFloat(amount) <= 0 || !payerId || !receiverId || payerId === receiverId}
                >
                    Record Payment
                </Button>
            </div>
        </Modal>
    )
}
