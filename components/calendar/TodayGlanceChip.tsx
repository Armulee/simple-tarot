"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { DayData } from "@/lib/calendar-helper"
import { qualityNumber, qualityPill } from "@/lib/calendar-styles"
import { getQualityLabel } from "./utils"

export function TodayGlanceChip({ data }: { data: DayData }) {
    const t = useTranslations("Calendar")
    const tQuality = useTranslations("Calendar.quality")

    return (
        <div
            className={cn(
                "flex items-center gap-3 rounded-2xl border border-white/10 backdrop-blur-xl px-3 py-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]",
                "bg-gradient-to-r from-white/[0.05] to-white/[0.02]",
            )}
        >
            <div className='relative inline-flex h-9 w-9 items-center justify-center'>
                <span className='absolute inset-0 rounded-full bg-amber-300/15 animate-ping' />
                <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_2px_rgba(252,211,77,0.55)]' />
            </div>
            <div style={{ lineHeight: "0" }}>
                <div className='text-[10px] uppercase tracking-wider text-amber-200/70'>
                    {t("todayGlance")}
                </div>
                <div className='flex items-baseline gap-1'>
                    <span
                        className={cn(
                            "font-serif text-lg",
                            qualityNumber[data.quality],
                        )}
                    >
                        {data.overall.toFixed(1)}
                    </span>
                    <span className='text-[10px] text-white/40'>/10</span>
                    <span
                        className={cn(
                            "ml-1 rounded-full px-2 py-0.5 text-[9px] font-medium",
                            qualityPill[data.quality],
                        )}
                    >
                        {getQualityLabel(data.quality, tQuality)}
                    </span>
                </div>
            </div>
        </div>
    )
}
