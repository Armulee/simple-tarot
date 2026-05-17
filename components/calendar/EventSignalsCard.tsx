"use client"

import { Star } from "lucide-react"
import { useTranslations } from "next-intl"
import type { DayData, EventSignals } from "@/lib/calendar-helper"
import { SectionHeader } from "./SectionHeader"

export function EventSignalsCard({ data }: { data: DayData }) {
    const t = useTranslations("Calendar")
    const entries = (
        Object.entries(data.eventSignals) as Array<[keyof EventSignals, number]>
    )
        .filter(([, v]) => v > 6.5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)

    if (entries.length === 0) return null

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-5 space-y-3'>
            <SectionHeader icon={Star} label={t("detail.eventSignals")} />
            <ul className='space-y-2'>
                {entries.map(([key, value]) => (
                    <li
                        key={key}
                        className='flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-300/[0.06] to-transparent ring-1 ring-amber-300/20 px-3 py-3'
                    >
                        <div className='flex items-center gap-2.5 text-sm text-white/90'>
                            <span className='inline-flex h-7 w-7 items-center justify-center rounded-xl bg-amber-300/15 ring-1 ring-amber-300/30'>
                                <Star className='h-3.5 w-3.5 text-amber-300 fill-amber-300' />
                            </span>
                            {t(`eventLabels.${key}`)}
                        </div>
                        <div className='flex items-center gap-1.5'>
                            <div className='font-serif text-base text-amber-200 tabular-nums'>
                                {value.toFixed(1)}
                            </div>
                            <div className='text-[10px] text-amber-200/60'>
                                /10
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
