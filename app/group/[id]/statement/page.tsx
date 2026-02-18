"use client"

import { use, useMemo } from "react"
import { useStore } from "@/lib/store"
import { Header } from "@/components/layout/header"
import { Button, Card } from "@/components/ui/base"
import { ArrowLeft, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { calculateBalances } from "@/lib/logic/calculateBalances"
import { optimizeSettlement } from "@/lib/logic/optimizeSettlement"
import { exportStatementPNG } from "@/lib/logic/exportStatementPNG"

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
        return Object.keys(balances).length > 0 ? optimizeSettlement(balances) : []
    }, [balances])

    const handleExport = () => {
        if (group) exportStatementPNG(group)
    }

    if (!state.loaded) return <div>Loading...</div>
    if (!group) return <div>Group not found</div>

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header
                title="Statement"
                rightAction={
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft />
                    </Button>
                }
            />

            <main className="p-4 max-w-md mx-auto space-y-6">

                {/* Net Balances */}
                <section>
                    <h3 className="font-semibold mb-3">Net Balances</h3>
                    <Card className="divide-y divide-border">
                        {Object.entries(balances)
                            .sort(([, a], [, b]) => b - a) // Most positive first
                            .map(([memberId, amount]) => {
                                const member = group.members.find(m => m.id === memberId)
                                if (!member || Math.abs(amount) < 0.01) return null

                                const isPositive = amount > 0
                                return (
                                    <div key={memberId} className="p-4 flex justify-between items-center">
                                        <span className="font-medium">{member.name}</span>
                                        <span className={isPositive ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                                            {isPositive ? "Gets" : "Pays"} ₹{Math.abs(amount).toFixed(2)}
                                        </span>
                                    </div>
                                )
                            })}
                        {Object.keys(balances).length === 0 && (
                            <div className="p-4 text-center text-muted-foreground">No balances yet</div>
                        )}
                    </Card>
                </section>

                {/* Settlement Plan */}
                <section>
                    <h3 className="font-semibold mb-3">Settlement Plan</h3>
                    <Card className="divide-y divide-border">
                        {settlements.map((s, i) => {
                            const from = group.members.find(m => m.id === s.from)?.name
                            const to = group.members.find(m => m.id === s.to)?.name
                            return (
                                <div key={i} className="p-4 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-foreground">{from} <span className="text-muted-foreground">pays</span> {to}</span>
                                    </div>
                                    <span className="font-bold">₹{s.amount.toFixed(2)}</span>
                                </div>
                            )
                        })}
                        {settlements.length === 0 && (
                            <div className="p-4 text-center text-muted-foreground">All settled up!</div>
                        )}
                    </Card>
                </section>

                <Button className="w-full h-12" onClick={handleExport}>
                    <Download className="mr-2" size={18} /> Export as Image
                </Button>
            </main>
        </div>
    )
}
