"use client"

import { useState, useEffect, useCallback } from "react"
import { Button, Input } from "@/components/ui/base"
import { Modal } from "@/components/ui/modal"
import { Group } from "@/types"
import { useStore } from "@/lib/store"
import { useUpiConfig } from "@/lib/upi-store"
import { safeFloat } from "@/lib/logic/rounding"
import { ArrowRight, Banknote, QrCode } from "lucide-react"
import { UpiQrModal } from "@/components/group/upi-qr-modal"

type SettlementStep = "form" | "method"

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
    const { upiId, name: upiName, isValid: upiIsValid } = useUpiConfig()
    const [amount, setAmount] = useState("")
    const [payerId, setPayerId] = useState(initialPayerId || "")
    const [receiverId, setReceiverId] = useState(initialReceiverId || "")
    const [step, setStep] = useState<SettlementStep>("form")
    const [upiQrOpen, setUpiQrOpen] = useState(false)
    const [upiError, setUpiError] = useState("")

    useEffect(() => {
        if (isOpen) {
            setPayerId(initialPayerId || "")
            setReceiverId(initialReceiverId || "")
            setAmount("")
            setStep("form")
            setUpiError("")
        }
    }, [isOpen, initialPayerId, initialReceiverId])

    const numAmount = safeFloat(parseFloat(amount))
    const formValid = !!payerId && !!receiverId && payerId !== receiverId && !isNaN(numAmount) && numAmount > 0

    const recordSettlement = useCallback((method: 'cash' | 'upi') => {
        const settleAmount = safeFloat(parseFloat(amount))
        if (!payerId || !receiverId || payerId === receiverId || isNaN(settleAmount) || settleAmount <= 0) return

        const payer = group.members.find(m => m.id === payerId)
        const receiver = group.members.find(m => m.id === receiverId)
        if (!payer || !receiver) return

        dispatch({
            type: "ADD_EXPENSE",
            payload: {
                groupId: group.id,
                expense: {
                    id: crypto.randomUUID(),
                    groupId: group.id,
                    title: "Settlement",
                    amount: settleAmount,
                    paidBy: payerId,
                    createdAt: Date.now(),
                    type: 'settlement',
                    settlementMethod: method,
                    splits: {
                        [receiverId]: settleAmount
                    }
                }
            }
        })
        onClose()
    }, [amount, payerId, receiverId, group, dispatch, onClose])

    const handleProceed = () => {
        if (!formValid) return
        setStep("method")
    }

    const handleCash = () => {
        recordSettlement('cash')
    }

    const handleUpi = () => {
        if (!upiIsValid) {
            setUpiError("Set up UPI details in Settings first")
            return
        }
        setUpiError("")
        setUpiQrOpen(true)
    }

    const handleUpiDone = () => {
        setUpiQrOpen(false)
        recordSettlement('upi')
    }

    const setMax = () => {
        if (maxAmount > 0) setAmount(maxAmount.toFixed(2))
    }

    const handleBack = () => {
        setStep("form")
        setUpiError("")
    }

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Settle Up">
                <div className="space-y-6 pt-2">

                    {step === "form" && (
                        <>
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
                                onClick={handleProceed}
                                disabled={!formValid}
                            >
                                Continue
                            </Button>
                        </>
                    )}

                    {step === "method" && (
                        <>
                            {/* Amount Summary */}
                            <div className="text-center py-2">
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Settling</p>
                                <p className="text-3xl font-bold tabular-nums">
                                    <span className="text-xl text-muted-foreground mr-1">₹</span>
                                    {numAmount.toFixed(2)}
                                </p>
                            </div>

                            {/* Method Selection */}
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                Choose Method
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleCash}
                                    className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all duration-150 active:scale-[0.97]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                        <Banknote size={24} className="text-emerald-600" />
                                    </div>
                                    <span className="font-semibold text-sm">Cash</span>
                                </button>

                                <button
                                    onClick={handleUpi}
                                    className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-secondary hover:bg-secondary/80 transition-all duration-150 active:scale-[0.97]"
                                >
                                    <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                                        <QrCode size={24} className="text-violet-600" />
                                    </div>
                                    <span className="font-semibold text-sm">UPI</span>
                                </button>
                            </div>

                            {/* UPI Error */}
                            {upiError && (
                                <div className="bg-destructive/10 text-destructive text-sm font-medium px-4 py-3 rounded-2xl text-center">
                                    {upiError}
                                </div>
                            )}

                            <button
                                onClick={handleBack}
                                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                            >
                                ← Back
                            </button>
                        </>
                    )}
                </div>
            </Modal>

            {/* UPI QR Modal */}
            <UpiQrModal
                isOpen={upiQrOpen}
                onClose={() => setUpiQrOpen(false)}
                upiId={upiId}
                payeeName={upiName}
                amount={numAmount}
                note={group.name}
                onDone={handleUpiDone}
            />
        </>
    )
}
