"use client"

import { useMemo, useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/base"
import { generateQrDataUrl } from "@/lib/qr-generator"
import { buildUpiUrl } from "@/lib/upi-store"

interface UpiQrModalProps {
    isOpen: boolean
    onClose: () => void
    upiId: string
    payeeName: string
    amount: number
    note?: string
    onDone: () => void
}

export function UpiQrModal({
    isOpen,
    onClose,
    upiId,
    payeeName,
    amount,
    note,
    onDone,
}: UpiQrModalProps) {
    const upiUrl = useMemo(() => {
        if (!upiId || !payeeName || amount <= 0) return ""
        return buildUpiUrl(upiId, payeeName, amount, note || "Expense Settlement")
    }, [upiId, payeeName, amount, note])

    const [qrDataUrl, setQrDataUrl] = useState<string>("")
    const [qrError, setQrError] = useState(false)

    useEffect(() => {
        if (!upiUrl || !isOpen) {
            setQrDataUrl("")
            setQrError(false)
            return
        }
        let cancelled = false
        generateQrDataUrl(upiUrl, 280)
            .then(url => { if (!cancelled) setQrDataUrl(url) })
            .catch(() => { if (!cancelled) setQrError(true) })
        return () => { cancelled = true }
    }, [upiUrl, isOpen])

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="UPI Payment">
            <div className="flex flex-col items-center space-y-6 pt-2">

                {/* QR Code */}
                {qrDataUrl ? (
                    <div className="qr-container p-4 bg-white rounded-3xl shadow-lg">
                        <img
                            src={qrDataUrl}
                            alt="UPI Payment QR Code"
                            width={240}
                            height={240}
                            style={{ imageRendering: "pixelated" }}
                        />
                    </div>
                ) : qrError ? (
                    <div className="w-52 h-52 bg-secondary rounded-3xl flex items-center justify-center text-muted-foreground text-sm">
                        Unable to generate QR
                    </div>
                ) : (
                    <div className="w-52 h-52 bg-secondary rounded-3xl flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                    </div>
                )}

                {/* Amount */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">
                        Amount
                    </p>
                    <p className="text-3xl font-bold tabular-nums tracking-tight">
                        <span className="text-xl text-muted-foreground mr-1">₹</span>
                        {amount.toFixed(2)}
                    </p>
                </div>

                {/* Payee info */}
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Pay to <span className="font-semibold text-foreground">{payeeName}</span>
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{upiId}</p>
                </div>

                {/* Instruction */}
                <p className="text-xs text-muted-foreground text-center px-4">
                    Scan this QR code with any UPI app to pay. Tap <strong>Done</strong> after completing the payment.
                </p>

                {/* Done Button */}
                <Button
                    className="w-full h-12 text-lg font-bold shadow-lg"
                    onClick={onDone}
                >
                    Done
                </Button>
            </div>
        </Modal>
    )
}
