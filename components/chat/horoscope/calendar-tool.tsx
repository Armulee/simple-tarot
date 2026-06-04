"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
    Briefcase,
    DollarSign,
    Heart,
    HeartPulse,
    Plane,
    Sparkles,
    Users,
    type LucideIcon,
} from "lucide-react"

import CalendarClient from "@/components/calendar"

type ChipId =
    | "financial"
    | "love"
    | "career"
    | "health"
    | "family"
    | "travel"
    | "thinkMore"

type ChipMeta = {
    id: ChipId
    icon: LucideIcon
}

const CHIPS: ChipMeta[] = [
    { id: "financial", icon: DollarSign },
    { id: "love", icon: Heart },
    { id: "career", icon: Briefcase },
    { id: "health", icon: HeartPulse },
    { id: "family", icon: Users },
    { id: "travel", icon: Plane },
    { id: "thinkMore", icon: Sparkles },
]

type Props = {
    /**
     * Called when the viewer taps a topic chip — fires a follow-up
     * horoscope reading for the chosen topic on the picked date.
     * `topicLabel` is the localized chip label that gets woven into the
     * follow-up question; the parent merges that with the date.
     */
    onChipClick: (chipId: ChipId, topicLabel: string, date: Date) => void
}

/**
 * Inline horoscope calendar tool rendered when the decision route
 * returns `{ type: "horoscope", horoscopeMode: "calendar" }`. Lets the
 * viewer pick a date on the embedded calendar (default today) and tap a
 * topic chip to ask for a follow-up reading on that day. The "show the
 * calendar" turn itself does not deduct a star — only the follow-up
 * reading triggered by a chip click does.
 */
export default function HoroscopeCalendarTool({ onChipClick }: Props) {
    const t = useTranslations("HoroscopeCalendar")
    const locale = useLocale()
    const [selected, setSelected] = useState<Date>(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    })

    const formattedDate = useMemo(() => {
        try {
            return new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
                year: "numeric",
            }).format(selected)
        } catch {
            return selected.toDateString()
        }
    }, [locale, selected])

    return (
        <div className='w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]'>
            <div className='px-2 pt-3 pb-2 sm:px-3 sm:pt-4'>
                <CalendarClient
                    embedded
                    selectedDateOverride={selected}
                    onDayClick={(d) => setSelected(d)}
                />
            </div>

            <div className='border-t border-white/[0.06] px-4 py-4 space-y-3'>
                <p className='text-sm text-white/85'>
                    {t("followUpPrompt", { date: formattedDate })}
                </p>
                <ul className='flex flex-wrap gap-2'>
                    {CHIPS.map(({ id, icon: Icon }) => {
                        const label = t(`chips.${id}`)
                        return (
                            <li key={id}>
                                <button
                                    type='button'
                                    onClick={() =>
                                        onChipClick(id, label, selected)
                                    }
                                    className='inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/85 hover:border-white/25 hover:bg-white/[0.08] hover:text-white transition-colors'
                                >
                                    <Icon
                                        className='h-3.5 w-3.5 text-white/70'
                                        aria-hidden
                                    />
                                    {label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}

export type { ChipId }
