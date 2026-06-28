"use client"

import { useMemo } from "react"
import { LineChartIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import type { RetentionAnalytics } from "@/lib/admin/analytics-shared"
import { AnalyticsSection } from "./section-card"
import { LineChart, type ChartSeries } from "./line-chart"

const CLASSIC = "#34d399"
const ROLLING = "#a78bfa"

function pct(v: number | null): string {
    return v === null ? "—" : `${(v * 100).toFixed(0)}%`
}

/** Background tint for a cohort cell, scaled by retention rate. */
function cellStyle(rate: number): React.CSSProperties {
    return {
        backgroundColor: `rgba(52, 211, 153, ${0.1 + rate * 0.55})`,
    }
}

export function RetentionSection({
    retention,
    loading,
    error,
}: {
    retention: RetentionAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const locale =
        typeof navigator !== "undefined" ? navigator.language : "en-US"

    const curveDefined = useMemo(
        () => (retention?.curve ?? []).filter((c) => c.rolling !== null),
        [retention],
    )

    const empty =
        !retention ||
        (curveDefined.length < 2 && (retention.cohorts?.length ?? 0) === 0)

    // D1 / D7 / D30 summary cards read from the curve (preserves "no data").
    const pointAt = (day: number) =>
        retention?.curve.find((c) => c.day === day)

    const cards = [
        { day: 1, labelKey: "retDay1" },
        { day: 7, labelKey: "retDay7" },
        { day: 30, labelKey: "retDay30" },
    ]

    const series: ChartSeries[] = [
        {
            key: "classic",
            label: t("retClassic"),
            color: CLASSIC,
            values: curveDefined.map((c) => c.rate ?? 0),
        },
        {
            key: "rolling",
            label: t("retRolling"),
            color: ROLLING,
            values: curveDefined.map((c) => c.rolling ?? 0),
            dashed: true,
        },
    ]
    const xLabels = curveDefined.map((c) => `D${c.day}`)

    const maxN = Math.min(
        12,
        Math.max(
            0,
            ...(retention?.cohorts ?? []).flatMap((c) =>
                c.weeks.map((w) => w.n),
            ),
        ),
    )
    const cols = Array.from({ length: maxN + 1 }, (_, i) => i)

    return (
        <AnalyticsSection
            label={t("retentionSectionLabel")}
            title={t("retentionTitle")}
            icon={<LineChartIcon className="h-4 w-4" />}
            loading={loading}
            error={error}
            empty={empty}
            emptyHint={t("retNoData")}
        >
            <div className="space-y-5">
                {/* D1 / D7 / D30 summary cards */}
                <div className="grid grid-cols-3 gap-3">
                    {cards.map(({ day, labelKey }) => {
                        const p = pointAt(day)
                        const noData = !p || p.rolling === null
                        return (
                            <div
                                key={day}
                                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                            >
                                <p className="text-xs font-medium text-white/55">
                                    {t(labelKey)}
                                </p>
                                <p
                                    className={`mt-1.5 font-serif text-2xl font-semibold ${
                                        noData ? "text-white/30" : "text-white"
                                    }`}
                                >
                                    {noData ? "—" : pct(p!.rate)}
                                </p>
                                {!noData ? (
                                    <p className="mt-0.5 text-[11px] text-white/35">
                                        {t("retRolling")} {pct(p!.rolling)}
                                    </p>
                                ) : null}
                            </div>
                        )
                    })}
                </div>

                {/* Retention curve */}
                {curveDefined.length >= 2 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="text-sm font-medium text-white/75">
                                {t("retCurveTitle")}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-white/50">
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: CLASSIC }}
                                />
                                {t("retClassicLabel")}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-white/50">
                                <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ backgroundColor: ROLLING }}
                                />
                                {t("retRollingLabel")}
                            </span>
                        </div>
                        <LineChart
                            series={series}
                            xLabels={xLabels}
                            yFormat={(v) => `${Math.round(v * 100)}%`}
                            height={230}
                        />
                    </div>
                ) : null}

                {/* Weekly cohort grid */}
                {(retention?.cohorts?.length ?? 0) > 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                        <p className="mb-3 text-sm font-medium text-white/75">
                            {t("retCohortTitle")}
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-separate border-spacing-1 text-center text-xs">
                                <thead>
                                    <tr className="text-white/45">
                                        <th className="px-2 py-1 text-left font-medium">
                                            {t("retCohortWeek")}
                                        </th>
                                        <th className="px-2 py-1 font-medium">
                                            {t("retCohortSize")}
                                        </th>
                                        {cols.map((c) => (
                                            <th
                                                key={c}
                                                className="px-2 py-1 font-medium"
                                            >
                                                W{c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {retention!.cohorts.map((co) => {
                                        const byN = new Map(
                                            co.weeks.map((w) => [w.n, w.rate]),
                                        )
                                        return (
                                            <tr key={co.week}>
                                                <td className="whitespace-nowrap px-2 py-1 text-left text-white/70">
                                                    {new Date(
                                                        co.week,
                                                    ).toLocaleDateString(locale, {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </td>
                                                <td className="px-2 py-1 text-white/50">
                                                    {co.size}
                                                </td>
                                                {cols.map((c) => {
                                                    const rate = byN.get(c)
                                                    if (rate === undefined)
                                                        return (
                                                            <td
                                                                key={c}
                                                                className="px-2 py-1 text-white/15"
                                                            >
                                                                ·
                                                            </td>
                                                        )
                                                    return (
                                                        <td
                                                            key={c}
                                                            className="rounded px-2 py-1 font-medium text-white/90"
                                                            style={cellStyle(rate)}
                                                        >
                                                            {Math.round(
                                                                rate * 100,
                                                            )}
                                                            %
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}
            </div>
        </AnalyticsSection>
    )
}
