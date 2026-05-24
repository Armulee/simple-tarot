"use client"

import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { DayData } from "@/lib/calendar-helper"
import { formatMonthHeading } from "./utils"
import { TodayGlanceChip } from "./TodayGlanceChip"

export function Header({
    viewMonth,
    onPrev,
    onNext,
    todayData,
}: {
    viewMonth: { year: number; month: number } | null
    onPrev: () => void
    onNext: () => void
    todayData: DayData | null
}) {
    const t = useTranslations("Calendar")
    const locale = useLocale()

    return (
        <div className='flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
            <div className='space-y-3'>
                <div className='flex items-center gap-3'>
                    <span className='h-px w-8 bg-gradient-to-r from-amber-300/80 to-transparent' />
                    <p className='text-[11px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                        {t("eyebrow")}
                    </p>
                    <Sparkles className='h-3.5 w-3.5 text-amber-200/70' />
                </div>

                <p className='text-sm text-white/65 max-w-md leading-relaxed'>
                    {t("subtitle")}
                </p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
                <div className='flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]'>
                    <button
                        type='button'
                        onClick={onPrev}
                        className='inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-colors'
                        aria-label={t("prevMonth")}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </button>
                    <div className='min-w-[170px] px-2 text-center font-serif text-lg italic text-white'>
                        {viewMonth ? (
                            formatMonthHeading(
                                locale,
                                viewMonth.year,
                                viewMonth.month,
                            )
                        ) : (
                            <span className='text-white/40'>-</span>
                        )}
                    </div>
                    <button
                        type='button'
                        onClick={onNext}
                        className='inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white transition-colors'
                        aria-label={t("nextMonth")}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </button>
                </div>
                {todayData && <TodayGlanceChip data={todayData} />}
            </div>
        </div>
    )
}
