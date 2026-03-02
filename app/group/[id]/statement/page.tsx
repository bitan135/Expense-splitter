"use client"

import { use, useMemo, useCallback } from "react"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card } from "@/components/ui/base"
import { ArrowLeft, ArrowRight, Download, Share } from "lucide-react"
import { useRouter } from "next/navigation"
import { calculateBalances } from "@/lib/logic/calculateBalances"
import { optimizeSettlement } from "@/lib/logic/optimizeSettlement"
// exportStatementPNG dynamically imported for performance
import { cn, formatAmount } from "@/lib/utils"

export default function StatementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { state } = useStore()
    const router = useRouter()
    const group = state.groups.find(g => g.id === id)

    // Memoize heavy calculations
    const balances = useMemo(() => {
        return group ? calculateBalances(group) : {}
    }, [group])

    const settlements = useMemo(() => {
        return group && Object.keys(balances).length > 0 ? optimizeSettlement(group) : []
    }, [balances, group])

    const handleExport = useCallback(async () => {
        if (!group) return
        const isDark = document.documentElement.classList.contains('dark')
        const { exportStatementPNG } = await import('@/lib/logic/exportStatementPNG')
        exportStatementPNG(group, isDark)
    }, [group])

    const handleShare = useCallback(async () => {
        if (!group) return
        const isDark = document.documentElement.classList.contains('dark')
        const { shareStatementPNG } = await import('@/lib/logic/exportStatementPNG')
        await shareStatementPNG(group, isDark)
    }, [group])

    if (!state.loaded) return <div>Loading...</div>
    if (!group) return <div>Group not found</div>

    return (
        <div className="mx-auto w-full h-full pb-20">
            <Header
                title="Statement"
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                }
            />

            <main className="p-4 w-full space-y-6">

                {/* Net Balances */}
                <section>
                    <h3 className="text-sm font-extrabold text-foreground/80 tracking-tight uppercase mb-3 px-1">Net Balances</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {Object.entries(balances)
                            .sort(([, a], [, b]) => b - a) // Most positive first
                            .map(([memberId, amount]) => {
                                const member = group.members.find(m => m.id === memberId)
                                if (!member) return null

                                const isZero = Math.abs(amount) < 0.01
                                const isPositive = amount > 0

                                return (
                                    <Card key={memberId} className={cn("premium-card p-4 flex justify-between items-center bg-card shadow-organic", isZero ? "border-muted" : "border")} style={{ borderColor: isZero ? undefined : (isPositive ? 'rgba(5,150,105,0.2)' : 'rgba(239,68,68,0.2)') }}>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-lg">{member.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn("text-lg font-bold tabular-nums", isZero ? "text-muted-foreground" : (isPositive ? "text-primary" : "text-destructive"))}>
                                                {isZero ? "Settled" : `${isPositive ? "+" : "-"}${formatAmount(amount)}`}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-wide opacity-50 font-bold">
                                                {isZero ? "All Good" : (isPositive ? "Gets Back" : "Owes")}
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        {Object.keys(balances).length === 0 && (
                            <div className="p-4 text-center text-muted-foreground">No balances yet</div>
                        )}
                    </div>
                </section>

                {/* Settlement Plan */}
                <section className="pb-20">
                    <h3 className="text-sm font-extrabold text-foreground/80 tracking-tight uppercase mb-3 px-1">Settlement Plan</h3>
                    <div className="space-y-2">
                        {settlements.map((s, i) => {
                            const from = group.members.find(m => m.id === s.from)?.name || "Unknown"
                            const to = group.members.find(m => m.id === s.to)?.name || "Unknown"
                            return (
                                <Card key={i} className="premium-card p-4 bg-card shadow-organic border-border/50">
                                    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-3 gap-y-1">
                                        {/* Row 1: Names and Amount */}
                                        <div className="text-[15px] font-bold text-foreground truncate text-right">
                                            {from}
                                        </div>
                                        <div className="flex items-center justify-center text-muted-foreground/40 px-1">
                                            <ArrowRight size={14} />
                                        </div>
                                        <div className="text-[15px] font-bold text-foreground truncate">
                                            {to}
                                        </div>
                                        <div className="text-right pl-3 border-l border-border/30">
                                            <span className="font-extrabold text-primary tabular-nums text-lg">
                                                {formatAmount(s.amount)}
                                            </span>
                                        </div>

                                        {/* Row 2: Sub-labels */}
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground text-right">
                                            Sends
                                        </div>
                                        <div></div>
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                            Receives
                                        </div>
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/50 text-right">
                                            Cash / UPI
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                        {settlements.length === 0 && (
                            <div className="p-8 text-center bg-secondary/20 rounded-3xl border border-dashed border-border/50">
                                <span className="text-muted-foreground">All settled up! 🎉</span>
                            </div>
                        )}
                    </div>
                </section>

                <div className="pt-6 flex flex-col gap-3">
                    <Button className="w-full h-14 rounded-full glass-bevel text-primary-foreground font-extrabold shadow-[0_8px_30px_rgba(5,150,105,0.2)] dark:shadow-[0_8px_30px_rgba(16,185,129,0.15)] active:scale-95 transition-transform text-[16px]" onClick={handleShare}>
                        <Share className="mr-2" size={20} /> Share Statement
                    </Button>
                    <Button variant="secondary" className="w-full h-14 rounded-full text-secondary-foreground font-bold active:scale-95 transition-transform text-[16px] border border-border/50" onClick={handleExport}>
                        <Download className="mr-2" size={20} /> Save to Device
                    </Button>
                </div>
            </main>
        </div>
    )
}
