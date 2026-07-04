"use client"

import type { ReactNode } from "react"
import type { TrendPoint } from "@/lib/admin/analytics-shared"
import { AnalyticsSection } from "./section-card"
import { LineChart } from "./line-chart"

export type StatTile = { label: string; value: string; sub?: string }

/**
 * A section made of a few stat tiles plus one trend line chart. Shared by the
 * Active, Returning, Reading and Engagement analytics sections.
 */
export function MetricsTrendSection({
    label,
    title,
    icon,
    stats,
    trend,
    trendLabel,
    trendColor,
    trendFormat = (v) => v.toLocaleString(),
    loading,
    error,
    empty,
    children,
}: {
    label: string
    title: string
    icon: ReactNode
    stats: StatTile[]
    trend: TrendPoint[]
    trendLabel: string
    trendColor: string
    trendFormat?: (v: number) => string
    loading: boolean
    error: boolean
    empty: boolean
    children?: ReactNode
}) {
    const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US"
    const xLabels = trend.map((p) =>
        new Date(p.date).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
        }),
    )

    return (
        <AnalyticsSection
            label={label}
            title={title}
            icon={icon}
            loading={loading}
            error={error}
            empty={empty}
        >
            <div className="space-y-5">
                <div
                    className={`grid gap-3 ${stats.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
                >
                    {stats.map((s) => (
                        <div
                            key={s.label}
                            className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                        >
                            <p className="text-xs font-medium text-white/55">
                                {s.label}
                            </p>
                            <p className="mt-1.5 font-serif text-2xl font-semibold text-white">
                                {s.value}
                            </p>
                            {s.sub ? (
                                <p className="mt-0.5 text-[11px] text-white/35">
                                    {s.sub}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>

                {trend.length >= 2 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-white/75">
                            <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: trendColor }}
                            />
                            {trendLabel}
                        </div>
                        <LineChart
                            series={[
                                {
                                    key: "trend",
                                    label: trendLabel,
                                    color: trendColor,
                                    values: trend.map((p) => p.value),
                                },
                            ]}
                            xLabels={xLabels}
                            yFormat={trendFormat}
                            height={220}
                        />
                    </div>
                ) : null}

                {children}
            </div>
        </AnalyticsSection>
    )
}
