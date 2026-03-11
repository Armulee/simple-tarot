"use client"

import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { useAdmin } from "@/contexts/admin-context"
import { BarChart3, Users, UserCheck, FileText, CreditCard } from "lucide-react"

export default function AdminDashboardPage() {
    const t = useTranslations("Admin")
    const metrics = useAdmin()

    if (!metrics) return null

    const cards = [
        {
            label: t("totalUsers"),
            value: metrics.totalUsers,
            icon: Users,
            gradient: "from-violet-500/20 to-purple-600/10",
            border: "border-violet-500/20",
        },
        {
            label: t("anonymousUsers"),
            value: metrics.anonymousUsers,
            icon: Users,
            gradient: "from-slate-500/20 to-slate-600/10",
            border: "border-slate-500/20",
        },
        {
            label: t("authenticatedUsers"),
            value: metrics.authenticatedUsers,
            icon: UserCheck,
            gradient: "from-emerald-500/20 to-teal-600/10",
            border: "border-emerald-500/20",
        },
        {
            label: t("interpretations"),
            value: metrics.interpretationCount,
            icon: FileText,
            gradient: "from-amber-500/20 to-orange-600/10",
            border: "border-amber-500/20",
        },
        {
            label: t("paidSubscribers"),
            value: metrics.paidSubscribers,
            icon: CreditCard,
            gradient: "from-rose-500/20 to-pink-600/10",
            border: "border-rose-500/20",
        },
    ]

    return (
        <div className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-5xl space-y-10">
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

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map(({ label, value, icon: Icon, gradient, border }) => (
                        <Card
                            key={label}
                            className={`overflow-hidden border ${border} bg-gradient-to-br ${gradient} p-6 transition-all hover:scale-[1.02]`}
                        >
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
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
