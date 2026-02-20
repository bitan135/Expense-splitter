"use client"

import { useMemo } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/base"
import { generateQrSvg } from "@/lib/qr-generator"
import { buildUpiUrl } from "@/lib/upi-store"

interface UpiQrModalProps {
    isOpen: boolean
    onClose: () => void
    upiId: string
    payeeName: string
    amount: number
    onDone: () => void
}

export function UpiQrModal({
    isOpen,
    onClose,
    upiId,
    payeeName,
    amount,
    onDone,
}: UpiQrModalProps) {
    const upiUrl = useMemo(() => {
        if (!upiId || !payeeName || amount <= 0) return ""
        return buildUpiUrl(upiId, payeeName, amount)
    }, [upiId, payeeName, amount])

    const qrSvg = useMemo(() => {
        if (!upiUrl) return ""
        try {
            return generateQrSvg(upiUrl, 3, 4)
        } catch {
            return ""
        }
    }, [upiUrl])

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="UPI Payment">
            <div className="flex flex-col items-center space-y-6 pt-2">

                {/* QR Code */}
                {qrSvg ? (
                    <div className="qr-container p-4 bg-white rounded-3xl shadow-lg">
                        <div
                            dangerouslySetInnerHTML={{ __html: qrSvg }}
                            className="w-52 h-52"
                            style={{ lineHeight: 0 }}
                        />
                    </div>
                ) : (
                    <div className="w-52 h-52 bg-secondary rounded-3xl flex items-center justify-center text-muted-foreground text-sm">
                        Unable to generate QR
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
