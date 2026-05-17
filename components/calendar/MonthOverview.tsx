"use client"

import { AlertTriangle, Crown, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { MonthOverview as MonthOverviewData } from "@/lib/calendar-helper"
import { getCalendarIntlLocale } from "./utils"

export function MonthOverview({
    overview,
}: {
    overview: MonthOverviewData | null
}) {
    const t = useTranslations("Calendar")
    const locale = useLocale()

    const cards: Array<{
        label: string
        value: string
        sub: string
        appendDays: boolean
        Icon: typeof Sparkles
        glow: string
        ring: string
        iconBg: string
        iconText: string
        valueGradient: string
    }> = [
        {
            label: t("overview.luckyDaysLabel"),
            value: overview ? `${overview.luckyDays}` : "—",
            sub: t("overview.luckyDaysSub"),
            appendDays: true,
            Icon: Sparkles,
            glow: "from-amber-400/30 via-amber-300/10 to-transparent",
            ring: "ring-amber-300/30",
            iconBg: "bg-amber-300/15 ring-amber-300/30",
            iconText: "text-amber-200",
            valueGradient: "from-amber-100 to-amber-300",
        },
        {
            label: t("overview.cautionDaysLabel"),
            value: overview ? `${overview.cautionDays}` : "—",
            sub: t("overview.cautionDaysSub"),
            appendDays: true,
            Icon: AlertTriangle,
            glow: "from-orange-400/30 via-red-400/10 to-transparent",
            ring: "ring-orange-300/30",
            iconBg: "bg-orange-300/15 ring-orange-300/30",
            iconText: "text-orange-200",
            valueGradient: "from-orange-100 to-orange-300",
        },
        {
            label: t("overview.peakDayLabel"),
            value:
                overview && overview.peak
                    ? new Intl.DateTimeFormat(getCalendarIntlLocale(locale), {
                          day: "numeric",
                          month: "long",
                      }).format(overview.peak.date)
                    : "—",
            sub:
                overview && overview.peak
                    ? t("overview.peakDaySub", {
                          score: overview.peak.overall.toFixed(1),
                      })
                    : "—",
            appendDays: false,
            Icon: Crown,
            glow: "from-violet-400/30 via-indigo-300/10 to-transparent",
            ring: "ring-violet-300/30",
            iconBg: "bg-violet-300/15 ring-violet-300/30",
            iconText: "text-violet-200",
            valueGradient: "from-violet-100 to-violet-300",
        },
    ]

    return (
        <div className='grid grid-cols-3 gap-3 lg:gap-4'>
            {cards.map((c) => (
                <div
                    key={c.label}
                    className={cn(
                        "group relative overflow-hidden rounded-3xl border border-white/10 backdrop-blur-xl p-5 transition-all hover:-translate-y-0.5",
                        "ring-1 bg-white/[0.02]",
                        c.ring,
                    )}
                >
                    <div
                        className={cn(
                            "absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-70 transition-opacity group-hover:opacity-100",
                            "bg-gradient-to-br",
                            c.glow,
                        )}
                    />
                    <div className='relative'>
                        <div className='space-y-1.5 flex items-start justify-between gap-3'>
                            <div className='text-[11px] uppercase tracking-wider text-white/60'>
                                {c.label}
                            </div>
                            <div
                                className={cn(
                                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1",
                                    c.iconBg,
                                    c.iconText,
                                )}
                            >
                                <c.Icon className='h-4.5 w-4.5' />
                            </div>
                        </div>
                        <div
                            className={cn(
                                "font-serif italic text-3xl bg-clip-text text-transparent bg-gradient-to-br",
                                c.valueGradient,
                            )}
                        >
                            {c.value}
                            {c.appendDays && overview ? (
                                <span className='ml-1 text-base not-italic text-white/40'>
                                    {t("overview.daysSuffix")}
                                </span>
                            ) : null}
                        </div>
                        <div className='text-xs text-white/50'>{c.sub}</div>
                    </div>
                </div>
            ))}
        </div>
    )
}
