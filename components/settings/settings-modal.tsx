"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/base"
import { useTheme } from "next-themes"
import { useUpiConfig, isValidUpiId } from "@/lib/upi-store"
import { Moon, Sun, Check } from "lucide-react"

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { theme, setTheme } = useTheme()
    const { upiId, name, setUpiId, setName, loaded } = useUpiConfig()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const upiIdError = upiId.trim().length > 0 && !isValidUpiId(upiId)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            <div className="space-y-6 pt-1">

                {/* Theme Section */}
                <section>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">
                        Appearance
                    </h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setTheme("light")}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all duration-150 ${mounted && theme === "light"
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                }`}
                        >
                            <Sun size={16} />
                            Light
                            {mounted && theme === "light" && <Check size={14} />}
                        </button>
                        <button
                            onClick={() => setTheme("dark")}
                            className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all duration-150 ${mounted && theme === "dark"
                                    ? "bg-primary text-primary-foreground shadow-lg"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                }`}
                        >
                            <Moon size={16} />
                            Dark
                            {mounted && theme === "dark" && <Check size={14} />}
                        </button>
                    </div>
                </section>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* UPI Details Section */}
                <section>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">
                        UPI Details
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 ml-1">
                        Used for generating QR codes during settlement.
                    </p>
                    {loaded && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-foreground/70 ml-1 mb-1 block">
                                    UPI ID
                                </label>
                                <Input
                                    type="text"
                                    placeholder="yourname@upi"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                    className={`h-12 text-base ${upiIdError ? "ring-2 ring-destructive/50" : ""}`}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                {upiIdError && (
                                    <p className="text-xs text-destructive mt-1 ml-1">
                                        UPI ID must contain &quot;@&quot; (e.g. name@upi)
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-foreground/70 ml-1 mb-1 block">
                                    Display Name
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Your Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-12 text-base"
                                />
                            </div>
                        </div>
                    )}

                    {/* Status indicator */}
                    {loaded && upiId.trim() && name.trim() && !upiIdError && (
                        <div className="flex items-center gap-2 mt-3 ml-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">UPI configured</span>
                        </div>
                    )}
                </section>
            </div>
        </Modal>
    )
}
