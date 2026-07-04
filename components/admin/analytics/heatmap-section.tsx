"use client"

import { useMemo, useState } from "react"
import { CalendarClock, Tag } from "lucide-react"
import { useTranslations } from "next-intl"
import type { HeatmapAnalytics } from "@/lib/admin/analytics-shared"
import { AnalyticsSection, BlockedPlaceholder } from "./section-card"

// 2024-01-01 is a Monday → locale-aware Mon..Sun short labels.
function weekdayLabels(locale: string): string[] {
    return Array.from({ length: 7 }, (_, i) =>
        new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(locale, {
            weekday: "short",
        }),
    )
}

function cellStyle(value: number, max: number): React.CSSProperties {
    const a = max > 0 ? 0.1 + (value / max) * 0.65 : 0.06
    return { backgroundColor: `rgba(251, 191, 36, ${a})` }
}

export function HeatmapSection({
    heatmap,
    loading,
    error,
}: {
    heatmap: HeatmapAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US"
    const [mode, setMode] = useState<"day" | "hour">("day")

    const byDay = heatmap?.byDay ?? []
    const byHour = heatmap?.byHour ?? []
    const empty =
        !heatmap ||
        (byDay.every((v) => v === 0) && byHour.every((v) => v === 0))

    const dayLabels = useMemo(() => weekdayLabels(locale), [locale])
    const values = mode === "day" ? byDay : byHour
    const max = Math.max(1, ...values)

    return (
        <AnalyticsSection
            label={t("heatmapSectionLabel")}
            title={t("heatmapTitle")}
            icon={<CalendarClock className="h-4 w-4" />}
            loading={loading}
            error={error}
            empty={empty}
        >
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                <div className="mb-4 flex gap-1.5">
                    {(["day", "hour"] as const).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                mode === m
                                    ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                                    : "text-white/55 hover:bg-white/5 hover:text-white/80"
                            }`}
                        >
                            {t(m === "day" ? "heatmapByDay" : "heatmapByHour")}
                        </button>
                    ))}
                </div>

                {mode === "day" ? (
                    <div className="grid grid-cols-7 gap-1.5">
                        {byDay.map((v, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <div
                                    className="flex h-14 w-full items-center justify-center rounded-lg text-sm font-semibold text-white/90 transition-colors"
                                    style={cellStyle(v, max)}
                                    title={`${dayLabels[i]}: ${v}`}
                                >
                                    {v}
                                </div>
                                <span className="text-[11px] text-white/45">
                                    {dayLabels[i]}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                        {byHour.map((v, h) => (
                            <div key={h} className="flex flex-col items-center gap-1">
                                <div
                                    className="flex h-12 w-full items-center justify-center rounded-md text-xs font-semibold text-white/90 transition-colors"
                                    style={cellStyle(v, max)}
                                    title={`${String(h).padStart(2, "0")}:00 — ${v}`}
                                >
                                    {v}
                                </div>
                                <span className="text-[10px] text-white/40">
                                    {String(h).padStart(2, "0")}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <p className="mt-3 text-[11px] text-white/30">
                    {t("heatmapTzNote")}
                </p>
            </div>
        </AnalyticsSection>
    )
}

/** Popular categories — blocked: no category column exists (per Phase 0). */
export function CategoriesSection() {
    const t = useTranslations("Admin")
    return (
        <section className="space-y-4">
            <div>
                <div className="flex items-center gap-2 text-amber-400/80">
                    <Tag className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                        {t("catSectionLabel")}
                    </span>
                </div>
                <h2 className="mt-1.5 font-serif text-xl font-semibold text-white">
                    {t("catTitle")}
                </h2>
            </div>
            <BlockedPlaceholder reason={t("catBlocked")} />
        </section>
    )
}
