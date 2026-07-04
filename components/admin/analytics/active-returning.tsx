"use client"

import { Activity, Repeat } from "lucide-react"
import { useTranslations } from "next-intl"
import type {
    ActiveAnalytics,
    ReturningAnalytics,
} from "@/lib/admin/analytics-shared"
import { MetricsTrendSection, type StatTile } from "./metrics-trend-section"

const ACTIVE_COLOR = "#a78bfa"
const RETURNING_COLOR = "#38bdf8"

function pct(v: number): string {
    return `${(v * 100).toFixed(1)}%`
}

export function ActiveUsersSection({
    active,
    loading,
    error,
}: {
    active: ActiveAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const stats: StatTile[] = active
        ? [
              { label: t("kpiDau"), value: active.dau.toLocaleString() },
              { label: t("kpiWau"), value: active.wau.toLocaleString() },
              { label: t("kpiMau"), value: active.mau.toLocaleString() },
              {
                  label: t("kpiStickiness"),
                  value: pct(active.stickiness),
                  sub: t("kpiStickinessSub"),
              },
          ]
        : []

    return (
        <MetricsTrendSection
            label={t("activeSectionLabel")}
            title={t("activeTitle")}
            icon={<Activity className="h-4 w-4" />}
            stats={stats}
            trend={active?.trend ?? []}
            trendLabel={t("activeTrendLabel")}
            trendColor={ACTIVE_COLOR}
            loading={loading}
            error={error}
            empty={!active || (active.mau === 0 && active.trend.length === 0)}
        />
    )
}

export function ReturningUsersSection({
    returning,
    loading,
    error,
}: {
    returning: ReturningAnalytics | undefined
    loading: boolean
    error: boolean
}) {
    const t = useTranslations("Admin")
    const stats: StatTile[] = returning
        ? [
              {
                  label: t("retReturningUsers"),
                  value: returning.returningUsers.toLocaleString(),
              },
              {
                  label: t("retReturnRate"),
                  value: pct(returning.returnRate),
              },
              {
                  label: t("retAvgInterval"),
                  value: `${returning.avgReturnIntervalDays} ${t("daysUnit")}`,
              },
              {
                  label: t("kpiRepeatRate"),
                  value: pct(returning.repeatRate),
                  sub: t("kpiRepeatRateSub"),
              },
          ]
        : []

    return (
        <MetricsTrendSection
            label={t("returningSectionLabel")}
            title={t("returningTitle")}
            icon={<Repeat className="h-4 w-4" />}
            stats={stats}
            trend={returning?.trend ?? []}
            trendLabel={t("returningTrendLabel")}
            trendColor={RETURNING_COLOR}
            loading={loading}
            error={error}
            empty={
                !returning ||
                (returning.returningUsers === 0 &&
                    returning.trend.length === 0)
            }
        />
    )
}
