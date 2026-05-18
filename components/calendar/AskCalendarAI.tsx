"use client"

import { useMemo, useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { applyEphemerisLocationTimeDefaults } from "@/lib/horoscope-profile-birth"
import { cn } from "@/lib/utils"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type {
    CalendarQueryCandidate,
    CalendarQueryConfidence,
    CalendarQueryIntent,
} from "@/lib/calendar-helper"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"

type CalendarRecommendationResponse = {
    intent: CalendarQueryIntent
    confidence: CalendarQueryConfidence
    topCandidate: CalendarQueryCandidate | null
    candidates: CalendarQueryCandidate[]
    error?: string
}

const QUERY_INTENTS: CalendarQueryIntent[] = [
    "resignation",
    "contract_sign",
    "travel_long",
    "major_purchase",
]

function toIsoDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

export function AskCalendarAI({
    birthData,
    planTier,
    locale,
    today,
}: {
    birthData: HoroscopeBirthData
    planTier: CalendarPlanTier
    locale: string
    today: Date | null
}) {
    const t = useTranslations("Calendar")
    const [loadingIntent, setLoadingIntent] = useState<CalendarQueryIntent | null>(
        null,
    )
    const [activeIntent, setActiveIntent] = useState<CalendarQueryIntent | null>(
        null,
    )
    const [result, setResult] = useState<CalendarRecommendationResponse | null>(
        null,
    )
    const [error, setError] = useState<string | null>(null)

    const payloadBirth = useMemo(
        () => applyEphemerisLocationTimeDefaults(birthData),
        [birthData],
    )

    const formatDate = (isoDate: string) =>
        new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(new Date(`${isoDate}T00:00:00`))

    const confidenceLabel = (confidence: CalendarQueryConfidence) =>
        t(`ai.confidence.${confidence}`)

    const runQuery = async (intent: CalendarQueryIntent) => {
        setLoadingIntent(intent)
        setActiveIntent(intent)
        setError(null)

        try {
            const res = await fetch("/api/calendar/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent,
                    locale,
                    planTier,
                    searchDays: 90,
                    todayIso: today ? toIsoDate(today) : undefined,
                    birth: {
                        day: payloadBirth.day,
                        month: payloadBirth.month,
                        year: payloadBirth.year,
                        hour: payloadBirth.hour,
                        minute: payloadBirth.minute,
                        timeHint: payloadBirth.timeHint,
                        timezone: payloadBirth.timezone,
                        lat: payloadBirth.lat,
                        lng: payloadBirth.lng,
                        country: payloadBirth.country,
                        state: payloadBirth.state,
                    },
                }),
            })

            const json = (await res.json()) as CalendarRecommendationResponse
            if (!res.ok || json.error) {
                throw new Error(json.error || `HTTP ${res.status}`)
            }

            setResult(json)
        } catch (err) {
            setResult(null)
            setError((err as Error).message || "CALENDAR_QUERY_FAILED")
        } finally {
            setLoadingIntent(null)
        }
    }

    return (
        <div className='rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl space-y-4'>
            <div className='flex items-start gap-3'>
                <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200 ring-1 ring-violet-300/20'>
                    <Sparkles className='h-4 w-4' />
                </span>
                <div className='space-y-1'>
                    <div className='font-serif text-lg text-white'>
                        {t("ai.title")}
                    </div>
                    <p className='text-sm leading-relaxed text-white/65'>
                        {t("ai.body")}
                    </p>
                </div>
            </div>

            <div className='flex flex-wrap gap-2'>
                {QUERY_INTENTS.map((intent) => {
                    const isActive = activeIntent === intent
                    const isLoading = loadingIntent === intent
                    return (
                        <button
                            key={intent}
                            type='button'
                            onClick={() => void runQuery(intent)}
                            disabled={Boolean(loadingIntent)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                                isActive
                                    ? "bg-white/14 text-white ring-1 ring-white/15"
                                    : "bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
                                loadingIntent && !isLoading && "opacity-60",
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : null}
                            {t(`ai.prompts.${intent}`)}
                        </button>
                    )
                })}
            </div>

            {error ? (
                <div className='rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90'>
                    {t("ai.error")}
                </div>
            ) : null}

            {result ? (
                result.topCandidate ? (
                    <div className='rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-4 text-sm text-white/80 space-y-3'>
                        <div className='flex items-start justify-between gap-4'>
                            <div>
                                <div className='text-[11px] uppercase tracking-[0.18em] text-amber-200/65'>
                                    {t("ai.bestDay")}
                                </div>
                                <div className='mt-1 font-serif text-xl text-white'>
                                    {formatDate(result.topCandidate.isoDate)}
                                </div>
                            </div>
                            <div className='text-right'>
                                <div className='text-[11px] uppercase tracking-[0.18em] text-white/45'>
                                    {t("ai.confidenceLabel")}
                                </div>
                                <div className='mt-1 text-sm text-amber-200'>
                                    {confidenceLabel(result.confidence)}
                                </div>
                            </div>
                        </div>

                        <p className='leading-relaxed text-white/70'>
                            {t("ai.summary", {
                                action: t(`eventLabels.${result.intent}`),
                            })}
                        </p>

                        <div className='grid grid-cols-2 gap-3 text-xs text-white/60 sm:grid-cols-3'>
                            <div className='rounded-xl bg-black/15 px-3 py-2'>
                                <div>{t("ai.signalScore")}</div>
                                <div className='mt-1 text-sm text-white'>
                                    {result.topCandidate.score.toFixed(1)}/10
                                </div>
                            </div>
                            <div className='rounded-xl bg-black/15 px-3 py-2'>
                                <div>{t("ai.overallScore")}</div>
                                <div className='mt-1 text-sm text-white'>
                                    {result.topCandidate.overall.toFixed(1)}/10
                                </div>
                            </div>
                            <div className='rounded-xl bg-black/15 px-3 py-2'>
                                <div>{t("ai.warningCount")}</div>
                                <div className='mt-1 text-sm text-white'>
                                    {result.topCandidate.warningCount}
                                </div>
                            </div>
                        </div>

                        {result.topCandidate.highlights[0] ? (
                            <div className='space-y-1'>
                                <div className='text-[11px] uppercase tracking-[0.18em] text-white/45'>
                                    {t("ai.topHighlight")}
                                </div>
                                <div className='text-white/78'>
                                    {result.topCandidate.highlights[0].text}
                                </div>
                            </div>
                        ) : null}

                        {result.topCandidate.warnings[0] ? (
                            <div className='space-y-1'>
                                <div className='text-[11px] uppercase tracking-[0.18em] text-white/45'>
                                    {t("ai.watchOut")}
                                </div>
                                <div className='text-white/62'>
                                    {result.topCandidate.warnings[0].text}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className='rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60'>
                        {t("ai.noResult")}
                    </div>
                )
            ) : null}
        </div>
    )
}
