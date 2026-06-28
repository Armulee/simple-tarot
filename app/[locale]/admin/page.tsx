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
import { HeroKpis } from "@/components/admin/analytics/hero-kpis"
import { useAnalytics } from "@/components/admin/analytics/use-analytics"
import type { MetricKey } from "@/lib/admin/activity-metrics"

export default function AdminDashboardPage() {
    const t = useTranslations("Admin")
    const metrics = useAdmin()
    const activity = useActivityData()
    const analytics = useAnalytics(activity.fromISO, activity.toISO)

    if (!metrics) return null

    const cards: {
        metric: MetricKey
        label: string
        value: number
        icon: typeof Users
        href: string
        gradient: string
        border: string
    }[] = [
        {
            metric: "totalUsers",
            label: t("totalUsers"),
            value: metrics.totalUsers,
            icon: Users,
            href: "/admin/users",
            gradient: "from-violet-500/20 to-purple-600/10",
            border: "border-violet-500/20",
        },
        {
            metric: "anonymousUsers",
            label: t("anonymousUsers"),
            value: metrics.anonymousUsers,
            icon: Users,
            href: "/admin/users?filter=anonymous",
            gradient: "from-slate-500/20 to-slate-600/10",
            border: "border-slate-500/20",
        },
        {
            metric: "authenticatedUsers",
            label: t("authenticatedUsers"),
            value: metrics.authenticatedUsers,
            icon: UserCheck,
            href: "/admin/users?filter=authenticated",
            gradient: "from-emerald-500/20 to-teal-600/10",
            border: "border-emerald-500/20",
        },
        {
            metric: "interpretations",
            label: t("interpretations"),
            value: metrics.interpretationCount,
            icon: FileText,
            href: "/admin/interpretations",
            gradient: "from-amber-500/20 to-orange-600/10",
            border: "border-amber-500/20",
        },
        {
            metric: "paidSubscribers",
            label: t("paidSubscribers"),
            value: metrics.paidSubscribers,
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
                    <Link
                        href="/admin/tarot-codex"
                        className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-500/20 hover:border-amber-500/50"
                    >
                        Tarot Codex
                        <span className="text-amber-400">→</span>
                    </Link>
                </div>

                {/* Shared time-range filter for every stat's chart + analytics. */}
                <div className="flex justify-end">
                    <ActivityRangeControls c={activity} />
                </div>

                {/* Dashboard summary — hero KPI row. */}
                <HeroKpis
                    hero={analytics.data?.hero}
                    loading={analytics.loading}
                    error={analytics.error}
                />

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map(
                        ({
                            metric,
                            label,
                            value,
                            icon: Icon,
                            gradient,
                            border,
                            href,
                        }) => (
                            <div
                                key={metric}
                                className={`flex flex-col overflow-hidden rounded-xl border ${border} bg-gradient-to-br ${gradient}`}
                            >
                                <Link href={href} className="group block">
                                    <div className="relative p-6 transition-all group-hover:bg-white/[0.03]">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white/60">
                                                    {label}
                                                </p>
                                                <p className="mt-2 font-serif text-3xl font-semibold text-white">
                                                    {value.toLocaleString()}
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
            </div>
        </div>
    )
}
