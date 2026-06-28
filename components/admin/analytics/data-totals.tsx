"use client"

import {
    BookOpen,
    CreditCard,
    DollarSign,
    MessagesSquare,
    Repeat,
    Users,
} from "lucide-react"
import { useTranslations } from "next-intl"
import type { AnalyticsTotals } from "@/lib/admin/analytics-shared"

type CardDef = {
    key: keyof AnalyticsTotals
    labelKey: string
    icon: typeof Users
    gradient: string
    border: string
    iconColor: string
    currency?: boolean
}

const CARDS: CardDef[] = [
    {
        key: "totalUsers",
        labelKey: "kpiTotalUsers",
        icon: Users,
        gradient: "from-violet-500/20 to-purple-600/10",
        border: "border-violet-500/20",
        iconColor: "text-violet-200/80",
    },
    {
        key: "returningUsers",
        labelKey: "retReturningUsers",
        icon: Repeat,
        gradient: "from-sky-500/20 to-blue-600/10",
        border: "border-sky-500/20",
        iconColor: "text-sky-200/80",
    },
    {
        key: "totalReadings",
        labelKey: "kpiTotalReadings",
        icon: BookOpen,
        gradient: "from-amber-500/20 to-orange-600/10",
        border: "border-amber-500/20",
        iconColor: "text-amber-200/80",
    },
    {
        key: "totalSessions",
        labelKey: "engSessions",
        icon: MessagesSquare,
        gradient: "from-emerald-500/20 to-teal-600/10",
        border: "border-emerald-500/20",
        iconColor: "text-emerald-200/80",
    },
    {
        key: "subscribers",
        labelKey: "kpiSubscribers",
        icon: CreditCard,
        gradient: "from-rose-500/20 to-pink-600/10",
        border: "border-rose-500/20",
        iconColor: "text-rose-200/80",
    },
    {
        key: "revenue" as keyof AnalyticsTotals,
        labelKey: "kpiRevenue",
        icon: DollarSign,
        gradient: "from-green-500/20 to-emerald-600/10",
        border: "border-green-500/20",
        iconColor: "text-green-200/80",
        currency: true,
    },
]

function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-8 w-24 animate-pulse rounded bg-white/10" />
        </div>
    )
}

export function DataTotals({
    totals,
    loading,
    error,
}: {
    totals: AnalyticsTotals | null
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400/80">
                <span className="text-xs font-medium uppercase tracking-wider">
                    {t("dataSectionLabel")}
                </span>
            </div>

            {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-8 text-center text-sm text-rose-200/80">
                    {t("metricsError")}
                </div>
            ) : loading && !totals ? (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                    {CARDS.map((c) => {
                        if (c.currency && totals && !totals.revenueAvailable)
                            return null
                        const Icon = c.icon
                        const raw = totals
                            ? (totals[c.key] as number)
                            : 0
                        const value = c.currency
                            ? `$${raw.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                            : raw.toLocaleString()
                        return (
                            <div
                                key={c.key}
                                className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.gradient} p-6`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-white/60">
                                            {t(c.labelKey)}
                                        </p>
                                        <p className="mt-2 font-serif text-3xl font-semibold text-white">
                                            {value}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-white/5 p-2.5">
                                        <Icon className={`h-5 w-5 ${c.iconColor}`} />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
