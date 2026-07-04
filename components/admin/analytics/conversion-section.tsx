"use client"

import { Fragment, useEffect, useState } from "react"
import { Filter } from "lucide-react"
import { useTranslations } from "next-intl"
import type { ConversionAnalytics } from "@/lib/admin/analytics-shared"
import { AnalyticsSection } from "./section-card"

const STAGE_META: Record<string, { labelKey: string; color: string }> = {
    started: { labelKey: "funnelStarted", color: "#a78bfa" },
    completed: { labelKey: "funnelCompleted", color: "#38bdf8" },
    registered: { labelKey: "funnelRegistered", color: "#fbbf24" },
    subscribed: { labelKey: "funnelSubscribed", color: "#fb7185" },
}

export function ConversionSection({
    conversion,
    loading,
    error,
}: {
    conversion: ConversionAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const stages = conversion?.stages ?? []
    const started = stages[0]?.count ?? 0
    const empty = !conversion || started === 0

    return (
        <AnalyticsSection
            label={t("funnelSectionLabel")}
            title={t("funnelTitle")}
            icon={<Filter className="h-4 w-4" />}
            loading={loading}
            error={error}
            empty={empty}
        >
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
                <div className="space-y-1">
                    {stages.map((s, i) => {
                        const meta = STAGE_META[s.key]
                        if (!meta) return null
                        // width proportional to share-of-started; clamped so the
                        // label stays readable for tiny stages.
                        const realPct = s.pct * 100
                        const widthPct = mounted
                            ? Math.max(realPct, 16)
                            : 0
                        const step =
                            i > 0 && stages[i - 1].count > 0
                                ? (s.count / stages[i - 1].count) * 100
                                : null

                        return (
                            <Fragment key={s.key}>
                                {step !== null ? (
                                    <div className="flex items-center justify-center py-1 text-[11px] text-white/40">
                                        ↓ {step.toFixed(0)}%
                                    </div>
                                ) : null}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="mx-auto flex h-16 min-w-0 items-center justify-between gap-3 rounded-xl px-4 transition-[width] duration-700 ease-out"
                                        style={{
                                            width: `${widthPct}%`,
                                            background: `linear-gradient(90deg, ${meta.color}33, ${meta.color}1a)`,
                                            border: `1px solid ${meta.color}40`,
                                        }}
                                    >
                                        <span className="truncate text-sm font-medium text-white/85">
                                            {t(meta.labelKey)}
                                        </span>
                                        <span className="shrink-0 font-serif text-lg font-semibold text-white">
                                            {s.count.toLocaleString()}
                                        </span>
                                    </div>
                                    <span className="w-12 shrink-0 text-right text-xs text-white/45">
                                        {realPct.toFixed(0)}%
                                    </span>
                                </div>
                            </Fragment>
                        )
                    })}
                </div>

                <p className="mt-5 border-t border-white/[0.06] pt-3 text-xs text-white/40">
                    {t("funnelRegNote")}
                </p>
            </div>
        </AnalyticsSection>
    )
}
