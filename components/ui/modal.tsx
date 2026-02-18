"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const [show, setShow] = React.useState(isOpen)
    const [animate, setAnimate] = React.useState(false)

    React.useEffect(() => {
        if (isOpen) {
            setShow(true)
            setTimeout(() => setAnimate(true), 10)
        } else {
            setAnimate(false)
            setTimeout(() => setShow(false), 300)
        }
    }, [isOpen])

    if (!show) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 transition-opacity duration-300",
                    animate ? "opacity-100" : "opacity-0"
                )}
                onClick={onClose}
            />
            <div
                className={cn(
                    "relative w-full max-w-lg transform rounded-2xl bg-background p-6 shadow-xl transition-all duration-300",
                    animate ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4",
                    className
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    {title && <h2 className="text-lg font-semibold">{title}</h2>}
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 hover:bg-muted transition-colors"
                    >
                        <X className="h-5 w-5 opacity-70" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    )
}
