"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useAdmin } from "@/contexts/admin-context"
import { BarChart3, Users, UserCheck, FileText, CreditCard } from "lucide-react"
import {
    ActivityRangeControls,
    MetricChart,
    useActivityData,
} from "@/components/admin/activity-chart"
import { DataTotals } from "@/components/admin/analytics/data-totals"
import { ContentSubmissionLink } from "@/components/admin/content-submission-link"
import { useTotals } from "@/components/admin/analytics/use-totals"
import { RetentionSection } from "@/components/admin/analytics/retention-section"
import {
    ActiveUsersSection,
    ReturningUsersSection,
} from "@/components/admin/analytics/active-returning"
import {
    EngagementSection,
    ReadingSection,
} from "@/components/admin/analytics/reading-engagement"
import { ConversionSection } from "@/components/admin/analytics/conversion-section"
import {
    CategoriesSection,
    HeatmapSection,
} from "@/components/admin/analytics/heatmap-section"
import { useAnalytics } from "@/components/admin/analytics/use-analytics"
import type { MetricKey } from "@/lib/admin/activity-metrics"

export default function AdminDashboardPage() {
    const t = useTranslations("Admin")
    const metrics = useAdmin()
    const activity = useActivityData()
    const analytics = useAnalytics(activity.fromISO, activity.toISO)
    const totals = useTotals()

    if (!metrics) return null

    // Per-card headline = total within the selected range (sum of that metric's
    // daily series), not the all-time figure (those live in the Data cards).
    const rangeTotal = (metric: MetricKey) =>
        activity.points.reduce((acc, p) => acc + (p[metric] ?? 0), 0)
    const hasRange = !!activity.data

    const cards: {
        metric: MetricKey
        label: string
        icon: typeof Users
        href: string
        gradient: string
        border: string
    }[] = [
        {
            metric: "totalUsers",
            label: t("totalUsers"),
            icon: Users,
            href: "/admin/users",
            gradient: "from-violet-500/20 to-purple-600/10",
            border: "border-violet-500/20",
        },
        {
            metric: "anonymousUsers",
            label: t("anonymousUsers"),
            icon: Users,
            href: "/admin/users?filter=anonymous",
            gradient: "from-slate-500/20 to-slate-600/10",
            border: "border-slate-500/20",
        },
        {
            metric: "authenticatedUsers",
            label: t("authenticatedUsers"),
            icon: UserCheck,
            href: "/admin/users?filter=authenticated",
            gradient: "from-emerald-500/20 to-teal-600/10",
            border: "border-emerald-500/20",
        },
        {
            metric: "interpretations",
            label: t("interpretations"),
            icon: FileText,
            href: "/admin/interpretations",
            gradient: "from-amber-500/20 to-orange-600/10",
            border: "border-amber-500/20",
        },
        {
            metric: "paidSubscribers",
            label: t("paidSubscribers"),
            icon: CreditCard,
            href: "/admin/subscribers",
            gradient: "from-rose-500/20 to-pink-600/10",
            border: "border-rose-500/20",
        },
    ]

    return (
        <div className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-5xl space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-amber-400/80">
                            <BarChart3 className="h-5 w-5" />
                            <span className="text-sm font-medium uppercase tracking-wider">
                                Admin
                            </span>
                        </div>
                        <h1 className="mt-2 font-serif text-3xl font-semibold text-white">
                            {t("title")}
                        </h1>
                        <p className="mt-1 text-white/60">{t("subtitle")}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <ContentSubmissionLink />
                        <Link
                            href="/admin/tarot-codex"
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 hover:border-amber-500/50"
                        >
                            Tarot Codex
                            <span className="text-amber-400">→</span>
                        </Link>
                    </div>
                </div>

                {/* All-time summary numbers (no graphs, independent of range). */}
                <DataTotals
                    totals={totals.data}
                    loading={totals.loading}
                    error={totals.error}
                />

                {/* Time-range filter — everything below responds to it. */}
                <div className="flex justify-end">
                    <ActivityRangeControls c={activity} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map(
                        ({ metric, label, icon: Icon, border, href }) => (
                            <div
                                key={metric}
                                className={`flex flex-col overflow-hidden rounded-xl border ${border}`}
                            >
                                <Link href={href} className="group block">
                                    <div className="relative p-6 transition-all group-hover:bg-white/[0.03]">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white/60">
                                                    {label}
                                                </p>
                                                <p className="mt-2 font-serif text-3xl font-semibold text-white">
                                                    {hasRange
                                                        ? rangeTotal(
                                                              metric,
                                                          ).toLocaleString()
                                                        : "—"}
                                                </p>
                                            </div>
                                            <div className="rounded-lg bg-white/5 p-2.5">
                                                <Icon className="h-5 w-5 text-white/70" />
                                            </div>
                                        </div>
                                        <span className="absolute bottom-4 right-5 text-white/30 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-white/60 group-hover:opacity-100">
                                            →
                                        </span>
                                    </div>
                                </Link>
                                <div className="border-t border-white/[0.06] pb-3 pt-2">
                                    <MetricChart metric={metric} c={activity} />
                                </div>
                            </div>
                        ),
                    )}
                </div>

                {/* Advanced product analytics (below the existing cards). */}
                <RetentionSection
                    retention={analytics.data?.retention}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <ActiveUsersSection
                    active={analytics.data?.active}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <ReturningUsersSection
                    returning={analytics.data?.returning}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <ReadingSection
                    reading={analytics.data?.reading}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <ConversionSection
                    conversion={analytics.data?.conversion}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <EngagementSection
                    engagement={analytics.data?.engagement}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <HeatmapSection
                    heatmap={analytics.data?.heatmap}
                    loading={analytics.loading && !analytics.data}
                    error={analytics.error}
                />
                <CategoriesSection />
            </div>
        </div>
    )
}
