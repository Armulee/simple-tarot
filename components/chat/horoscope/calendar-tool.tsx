"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
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
import type { DayData } from "@/lib/calendar-helper"
import { cn } from "@/lib/utils"
import enMessages from "@/messages/en.json"
import thMessages from "@/messages/th.json"
import loMessages from "@/messages/lo.json"

type SupportedToolLocale = "en" | "th" | "lo"

const MESSAGES_BY_LOCALE: Record<SupportedToolLocale, typeof enMessages> = {
    en: enMessages,
    th: thMessages as unknown as typeof enMessages,
    lo: loMessages as unknown as typeof enMessages,
}

function resolveToolLocale(locale: string): SupportedToolLocale {
    return (locale === "th" || locale === "lo" ? locale : "en")
}

function formatTemplate(text: string, params?: Record<string, string>): string {
    if (!params) return text
    return text.replace(/\{(\w+)\}/g, (_, k) =>
        Object.prototype.hasOwnProperty.call(params, k)
            ? String(params[k])
            : `{${k}}`,
    )
}

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
    /** Fired when the viewer taps a topic chip. */
    onChipClick: (chipId: ChipId, topicLabel: string, date: Date) => void
    /**
     * Fired whenever the picked date or its loaded DayData changes — the
     * session uses this to update its `originContext` so the AI receives
     * the day's transit/aspect summary on the next message. `null` means
     * the viewer cleared the selection.
     */
    onSelectionChange?: (date: Date | null, dayData: DayData | null) => void
    /**
     * Bump this number to clear the tool's internal date selection (e.g.
     * when the viewer cancels the originContext from the composer's
     * OriginContextStrip). The next picked date re-arms the selection.
     */
    clearSelectionSignal?: number
    /**
     * Locale the tool's strings (intro / follow-up / chips / context line)
     * and date formatting should use, regardless of the app's UI locale.
     * Set by session.tsx from detectInputLanguage(triggerQuestion) so the
     * tool responds in the same language the viewer wrote in.
     */
    responseLocale?: string
}

const QUALITY_LABEL: Record<DayData["quality"], string> = {
    excellent: "excellent",
    good: "good",
    neutral: "neutral",
    caution: "caution",
    avoid: "avoid",
}

/**
 * Inline horoscope calendar tool rendered when the decision route
 * returns `{ type: "horoscope", horoscopeMode: "calendar" }`. Lets the
 * viewer pick a date on the embedded calendar (default today) and tap a
 * topic chip to ask for a follow-up reading on that day. The "show the
 * calendar" turn itself does not deduct a star — only the follow-up
 * reading triggered by a chip click does.
 */
export default function HoroscopeCalendarTool({
    onChipClick,
    onSelectionChange,
    clearSelectionSignal,
    responseLocale,
}: Props) {
    const uiLocale = useLocale()
    const activeLocale: SupportedToolLocale = resolveToolLocale(
        responseLocale ?? uiLocale,
    )
    const messages = MESSAGES_BY_LOCALE[activeLocale]
    const t = useCallback(
        (key: string, params?: Record<string, string>): string => {
            const ns = (
                messages as { HoroscopeCalendar?: Record<string, unknown> }
            ).HoroscopeCalendar
            const node = key
                .split(".")
                .reduce<unknown>(
                    (acc, k) =>
                        acc && typeof acc === "object"
                            ? (acc as Record<string, unknown>)[k]
                            : undefined,
                    ns,
                )
            if (typeof node !== "string") return key
            return formatTemplate(node, params)
        },
        [messages],
    )
    const locale = activeLocale
    const [selected, setSelected] = useState<Date | null>(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    })
    const [dayData, setDayData] = useState<DayData | null>(null)

    useEffect(() => {
        onSelectionChange?.(selected, dayData)
    }, [selected, dayData, onSelectionChange])

    // External cancel: clear the selection so the calendar shows no
    // highlight. A subsequent day-click re-arms it.
    // Skip the very first run — React fires the effect once after mount
    // with the parent's initial signal value (0), and we don't want that
    // to nuke the default "today is selected" state.
    const lastResetSignalRef = useRef<number | undefined>(clearSelectionSignal)
    useEffect(() => {
        if (clearSelectionSignal === undefined) return
        if (lastResetSignalRef.current === clearSelectionSignal) return
        lastResetSignalRef.current = clearSelectionSignal
        setSelected(null)
        setDayData(null)
    }, [clearSelectionSignal])

    const formattedDate = useMemo(() => {
        if (!selected) return ""
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

    const contextLine = useMemo(() => {
        if (!selected) return ""
        if (!dayData) return t("context.noData")
        const overall = Number.isFinite(dayData.overall)
            ? dayData.overall.toFixed(1)
            : "—"
        return t("context.selected", {
            date: formattedDate,
            quality: QUALITY_LABEL[dayData.quality] ?? dayData.quality,
            score: overall,
        })
    }, [dayData, formattedDate, selected, t])

    return (
        <div className='w-full space-y-3'>
            <p className='text-sm text-white/85'>{t("intro")}</p>

            <CalendarClient
                embedded
                selectedDateOverride={selected}
                onDayClick={(d, data) => {
                    setSelected(d)
                    setDayData(data)
                }}
            />

            {selected ? (
                <div className='space-y-3 pt-1'>
                    <p className='text-sm text-white/85'>
                        {t("followUpPrompt", { date: formattedDate })}
                    </p>
                    <div
                        className={cn(
                            "inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium",
                            dayData
                                ? "bg-white/[0.06] text-white/80"
                                : "bg-white/[0.03] text-white/55",
                        )}
                        aria-live='polite'
                    >
                        <Sparkles className='h-3 w-3 shrink-0' aria-hidden />
                        <span className='truncate'>{contextLine}</span>
                    </div>
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
            ) : null}
        </div>
    )
}

export type { ChipId }
