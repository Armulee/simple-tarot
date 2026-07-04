"use client"

import { UserRound } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import type { ChatMessage } from "@/components/chat/types"

type OtherPersonReadingBadgeProps = {
    info: NonNullable<ChatMessage["horoscopeForOtherPerson"]>
}

/**
 * Pill rendered above an assistant horoscope bubble when the reading is for
 * a third party whose birthdate the asker dropped into the chat
 * ("วันนี้จะเป็นยังไงสำหรับคนที่เกิด 17 กค 2545"). The label is the birth
 * date itself — name / relationship words are ignored, because the only
 * thing that drives the chart is the DOB.
 */
export default function OtherPersonReadingBadge({
    info,
}: OtherPersonReadingBadgeProps) {
    const t = useTranslations("HoroscopeOtherPerson")
    const locale = useLocale()

    const { day, month, year } = info.birthDate
    const formattedDate = (() => {
        try {
            const date = new Date(Date.UTC(year, month - 1, day))
            return new Intl.DateTimeFormat(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
            }).format(date)
        } catch {
            return `${day}/${month}/${year}`
        }
    })()

    return (
        <div className='inline-flex items-center gap-2 rounded-full border border-amber-300/35 bg-gradient-to-r from-amber-400/15 via-amber-300/10 to-orange-400/10 px-3 py-1 text-[12px] text-amber-100 shadow-[0_6px_24px_-8px_rgba(251,191,36,0.35)]'>
            <UserRound aria-hidden className='size-3.5 shrink-0 opacity-90' />
            <span className='font-medium tabular-nums'>
                {t("readingFor", { date: formattedDate })}
            </span>
        </div>
    )
}
