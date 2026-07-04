"use client"

import { BookOpen, MessagesSquare } from "lucide-react"
import { useTranslations } from "next-intl"
import type {
    EngagementAnalytics,
    ReadingAnalytics,
} from "@/lib/admin/analytics-shared"
import { AnalyticsSection } from "./section-card"
import { MetricsTrendSection, type StatTile } from "./metrics-trend-section"
import { HBars, type HBarItem } from "./h-bars"

const READING_COLOR = "#fbbf24"

function formatDuration(sec: number): string {
    if (sec <= 0) return "0s"
    const m = Math.floor(sec / 60)
    const s = Math.round(sec % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function ReadingSection({
    reading,
    loading,
    error,
}: {
    reading: ReadingAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const stats: StatTile[] = reading
        ? [
              {
                  label: t("readAvgPerUser"),
                  value: reading.avgPerUser.toFixed(1),
              },
              {
                  label: t("readMedian"),
                  value: reading.median.toLocaleString(),
              },
              {
                  label: t("readTotal"),
                  value: reading.total.toLocaleString(),
              },
          ]
        : []

    const dist: HBarItem[] = reading
        ? [
              { key: "one", label: t("distOne"), value: reading.distribution.one },
              {
                  key: "twoToFive",
                  label: t("distTwoToFive"),
                  value: reading.distribution.twoToFive,
              },
              {
                  key: "sixPlus",
                  label: t("distSixPlus"),
                  value: reading.distribution.sixPlus,
              },
          ]
        : []
    const hasDist = dist.some((d) => d.value > 0)

    return (
        <MetricsTrendSection
            label={t("readingSectionLabel")}
            title={t("readingTitle")}
            icon={<BookOpen className="h-4 w-4" />}
            stats={stats}
            trend={reading?.trend ?? []}
            trendLabel={t("readingTrendLabel")}
            trendColor={READING_COLOR}
            loading={loading}
            error={error}
            empty={!reading || (reading.total === 0 && reading.trend.length === 0)}
        >
            {hasDist ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
                    <p className="mb-3 text-sm font-medium text-white/75">
                        {t("readDistTitle")}
                    </p>
                    <HBars items={dist} defaultColor={READING_COLOR} />
                </div>
            ) : null}
        </MetricsTrendSection>
    )
}

/** Secondary engagement strip — frequency matters more than minutes here. */
export function EngagementSection({
    engagement,
    loading,
    error,
}: {
    engagement: EngagementAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const tiles = engagement
        ? [
              {
                  label: t("engSessions"),
                  value: engagement.totalSessions.toLocaleString(),
              },
              {
                  label: t("engMessages"),
                  value: engagement.totalMessages.toLocaleString(),
              },
              {
                  label: t("engAvgQuestions"),
                  value: engagement.avgQuestionsPerSession.toFixed(1),
              },
              {
                  label: t("engAvgDuration"),
                  value: formatDuration(engagement.avgSessionDurationSec),
                  sub: t("engDurationNote"),
              },
          ]
        : []

    return (
        <AnalyticsSection
            label={t("engSectionLabel")}
            title={t("engTitle")}
            icon={<MessagesSquare className="h-4 w-4" />}
            loading={loading}
            error={error}
            empty={!engagement || engagement.totalSessions === 0}
        >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tiles.map((tile) => (
                    <div
                        key={tile.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                    >
                        <p className="text-xs font-medium text-white/55">
                            {tile.label}
                        </p>
                        <p className="mt-1.5 font-serif text-xl font-semibold text-white">
                            {tile.value}
                        </p>
                        {tile.sub ? (
                            <p className="mt-0.5 text-[11px] text-white/35">
                                {tile.sub}
                            </p>
                        ) : null}
                    </div>
                ))}
            </div>
        </AnalyticsSection>
    )
}
