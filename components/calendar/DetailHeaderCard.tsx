"use client"

import { Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { DayData, EventSignals } from "@/lib/calendar-helper"
import { qualityPill } from "@/lib/calendar-styles"
import { QUALITY_ACCENT } from "./constants"
import { formatFullDate, getQualityLabel } from "./utils"
import { QualityIcon } from "./QualityIcon"

export function DetailHeaderCard({ data }: { data: DayData }) {
    const t = useTranslations("Calendar")
    const tQuality = useTranslations("Calendar.quality")
    const locale = useLocale()
    const topEvent = (
        Object.entries(data.eventSignals) as Array<[keyof EventSignals, number]>
    )
        .filter(([, value]) => value > 6.5)
        .sort((a, b) => b[1] - a[1])[0]
    const accent = QUALITY_ACCENT[data.quality]
    const score = data.overall
    const radius = 46
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 10) * circumference

    return (
        <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
            <div
                aria-hidden
                className={cn(
                    "absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-60",
                    data.quality === "excellent" && "bg-amber-400/30",
                    data.quality === "good" && "bg-emerald-400/25",
                    data.quality === "neutral" && "bg-white/10",
                    data.quality === "caution" && "bg-orange-400/25",
                    data.quality === "avoid" && "bg-red-500/25",
                )}
            />
            <div className='relative flex items-center gap-5'>
                <div className='relative h-28 w-28 shrink-0'>
                    <svg
                        viewBox='0 0 120 120'
                        className='h-full w-full -rotate-90'
                    >
                        <circle
                            cx='60'
                            cy='60'
                            r={radius}
                            fill='none'
                            stroke='rgba(255,255,255,0.08)'
                            strokeWidth='6'
                        />
                        <circle
                            cx='60'
                            cy='60'
                            r={radius}
                            fill='none'
                            stroke={accent.stroke}
                            strokeWidth='6'
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap='round'
                            style={{
                                filter: `drop-shadow(0 0 6px ${accent.stroke}99)`,
                                transition:
                                    "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)",
                            }}
                        />
                    </svg>
                    <div className='absolute inset-0 flex flex-col items-center justify-center'>
                        <div
                            className={cn(
                                "font-serif italic text-3xl leading-none bg-clip-text text-transparent bg-gradient-to-br",
                                accent.from,
                                accent.to,
                            )}
                        >
                            {score.toFixed(1)}
                        </div>
                        <div className='mt-0.5 text-[10px] uppercase tracking-wider text-white/45'>
                            / 10
                        </div>
                    </div>
                </div>
                <div className='min-w-0 flex-1 space-y-2'>
                    <div className='text-[11px] uppercase tracking-wider text-white/50'>
                        {formatFullDate(locale, data.date)}
                    </div>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                            qualityPill[data.quality],
                        )}
                    >
                        <QualityIcon quality={data.quality} />
                        {getQualityLabel(data.quality, tQuality)}
                    </span>
                    <div className='text-xs text-white/55 leading-relaxed'>
                        {t("detail.scoreCaption")}
                    </div>
                    {topEvent ? (
                        <div className='rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2'>
                            <div className='flex items-center justify-between gap-3'>
                                <div className='min-w-0'>
                                    <div className='text-[10px] uppercase tracking-wider text-amber-200/70'>
                                        {t("detail.eventSignals")}
                                    </div>
                                    <div className='mt-1 flex items-center gap-2 text-sm text-white/90'>
                                        <span className='inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-amber-300/15 ring-1 ring-amber-300/30'>
                                            <Star className='h-3 w-3 fill-amber-300 text-amber-300' />
                                        </span>
                                        <span className='truncate'>
                                            {t(`eventLabels.${topEvent[0]}`)}
                                        </span>
                                    </div>
                                </div>
                                <div className='shrink-0 text-right'>
                                    <div className='font-serif text-base text-amber-200 tabular-nums'>
                                        {topEvent[1].toFixed(1)}
                                    </div>
                                    <div className='text-[10px] text-amber-200/60'>
                                        /10
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
