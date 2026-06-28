"use client"

import { ArrowDownRight, ArrowUpRight, BarChart3 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { HeroKpi, KpiFormat } from "@/lib/admin/analytics-shared"
import { Sparkline } from "./sparkline"

/** Visual config per KPI key: label, optional subtitle, accent colour. */
const META: Record<
    string,
    { labelKey: string; subKey?: string; color: string; headline?: boolean }
> = {
    d7Retention:   { labelKey: "kpiD7Retention", subKey: "kpiD7RetentionSub", color: "#34d399", headline: true },
    stickiness:    { labelKey: "kpiStickiness", subKey: "kpiStickinessSub", color: "#a78bfa", headline: true },
    wowGrowth:     { labelKey: "kpiWowGrowth", subKey: "kpiWowGrowthSub", color: "#fbbf24", headline: true },
    repeatRate:    { labelKey: "kpiRepeatRate", subKey: "kpiRepeatRateSub", color: "#38bdf8", headline: true },
    freeToPaid:    { labelKey: "kpiFreeToPaid", subKey: "kpiFreeToPaidSub", color: "#fb7185", headline: true },
    totalUsers:    { labelKey: "kpiTotalUsers", color: "#a78bfa" },
    totalReadings: { labelKey: "kpiTotalReadings", color: "#fbbf24" },
    subscribers:   { labelKey: "kpiSubscribers", color: "#fb7185" },
    revenue:       { labelKey: "kpiRevenue", color: "#34d399" },
}

function formatValue(v: number, format: KpiFormat): string {
    if (format === "percent") return `${(v * 100).toFixed(1)}%`
    if (format === "currency")
        return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    return v.toLocaleString()
}

function ChangeBadge({ pct }: { pct: number | null }) {
    if (pct === null) return null
    const up = pct >= 0
    const Icon = up ? ArrowUpRight : ArrowDownRight
    return (
        <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                up ? "text-emerald-300" : "text-rose-300"
            }`}
        >
            <Icon className="h-3 w-3" />
            {Math.abs(pct * 100).toFixed(1)}%
        </span>
    )
}

function KpiCard({ kpi }: { kpi: HeroKpi }) {
    const t = useTranslations("Admin")
    const meta = META[kpi.key]
    if (!meta) return null
    const label = t(meta.labelKey)
    const sub = meta.subKey ? t(meta.subKey) : null

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div>
                <p className="text-xs font-medium text-white/55">{label}</p>
                {kpi.available ? (
                    <p className="mt-1.5 font-serif text-2xl font-semibold text-white">
                        {formatValue(kpi.value, kpi.format)}
                    </p>
                ) : (
                    <p className="mt-1.5 font-serif text-2xl font-semibold text-white/30">
                        —
                    </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                    {kpi.available ? <ChangeBadge pct={kpi.changePct} /> : null}
                    {sub ? (
                        <span className="text-[11px] text-white/35">{sub}</span>
                    ) : null}
                </div>
            </div>
            <div className="mt-3">
                {kpi.available && kpi.spark.length >= 2 ? (
                    <Sparkline values={kpi.spark} color={meta.color} height={32} />
                ) : (
                    <div className="h-8" aria-hidden />
                )}
            </div>
        </div>
    )
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-white/10" />
            <div className="mt-4 h-8 w-full animate-pulse rounded bg-white/5" />
        </div>
    )
}

export function HeroKpis({
    hero,
    loading,
    error,
}: {
    hero: HeroKpi[] | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")

    const headline = (hero ?? []).filter((k) => META[k.key]?.headline)
    const totals = (hero ?? []).filter((k) => META[k.key] && !META[k.key].headline)

    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-amber-400/80">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                    {t("kpiSectionLabel")}
                </span>
            </div>

            {error ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-8 text-center text-sm text-rose-200/80">
                    {t("metricsError")}
                </div>
            ) : loading && !hero ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {headline.map((k) => (
                            <KpiCard key={k.key} kpi={k} />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {totals.map((k) => (
                            <KpiCard key={k.key} kpi={k} />
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}
