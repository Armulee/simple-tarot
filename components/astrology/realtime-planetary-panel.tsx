"use client"

import { useState } from "react"
import Image from "next/image"
import {
    ChevronDown,
    ChevronUp,
    Flame,
    Layers,
    Minus,
    MoveHorizontal,
    Sparkles,
    Square,
    Star,
    Triangle,
    TrendingDown,
    TrendingUp,
} from "lucide-react"
import { Calendar, Eye } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import type { SourceAspectEvent } from "@/components/chat/types"

const PLANET_IMAGE_KEYS = new Set([
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "rahu",
    "ketu",
])

type PanelAspectEvent = {
    aspectKey: string
    transitPlanet: string
    natalPlanet: string
    aspectType: string
    aspectAngle: number
    orb: number
    keyword: string
    sentiment: "good" | "bad" | "neutral"
    insight?: string
    dateText: string
    peakText?: string
    endText?: string
    tier: "main" | "minor"
    zodiacSign: string
    transitPositionText?: string
    natalPositionText?: string
    transitAbsoluteLongitude?: number
    natalAbsoluteLongitude?: number
}

const MAIN_EVENT_PLANETS = new Set([
    "Jupiter",
    "Saturn",
    "Rahu",
    "Uranus",
    "Neptune",
    "Pluto",
])

const ZODIAC_SIGNS_EN = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

const ZODIAC_SIGN_INDEX: Record<string, number> = {
    Aries: 0,
    Taurus: 1,
    Gemini: 2,
    Cancer: 3,
    Leo: 4,
    Virgo: 5,
    Libra: 6,
    Scorpio: 7,
    Sagittarius: 8,
    Capricorn: 9,
    Aquarius: 10,
    Pisces: 11,
    เมษ: 0,
    พฤษภ: 1,
    เมถุน: 2,
    กรกฎ: 3,
    สิงห์: 4,
    กันย์: 5,
    ตุลย์: 6,
    พิจิก: 7,
    ธนู: 8,
    มังกร: 9,
    กุมภ์: 10,
    มีน: 11,
}

function formatPlanetDegree(value: unknown) {
    if (typeof value !== "number" || Number.isNaN(value)) return null
    return `${value.toFixed(1)}°`
}

function toFiniteNumber(value: unknown): number | undefined {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined
    }
    if (typeof value === "string") {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
}

function normalizePositionText(value: string | undefined | null) {
    if (typeof value !== "string") return undefined
    // Fix common mojibake where UTF-8 punctuation appears as latin1.
    return value
        .replace(/Â(?=[°·])/g, "")
        .replace(/\s*[·]\s*/g, " · ")
        .trim()
}

function translateZodiacSign(
    signRaw: string,
    t: (key: string, values?: Record<string, string | number>) => string,
) {
    const signIndex = ZODIAC_SIGN_INDEX[signRaw]
    if (typeof signIndex !== "number") return signRaw
    const canonicalSign = ZODIAC_SIGNS_EN[signIndex] ?? signRaw
    return t(`zodiac.${canonicalSign}`)
}

function localizePositionText(
    positionText: string | undefined | null,
    t: (key: string, values?: Record<string, string | number>) => string,
) {
    const normalized = normalizePositionText(positionText)
    if (!normalized) return undefined
    const parts = normalized.split("·").map((part) => part.trim())
    if (parts.length < 2) return normalized
    const [signRaw, degreeRaw] = parts
    return `${translateZodiacSign(signRaw, t)} · ${degreeRaw}`
}

function parseAbsoluteFromPositionText(positionText: string | undefined) {
    const normalizedPositionText = normalizePositionText(positionText)
    if (!normalizedPositionText) return undefined
    const parts = normalizedPositionText.split("·").map((part) => part.trim())
    if (parts.length < 2) return undefined
    const signRaw = parts[0]
    const degreeRaw = parts[1]?.replace("°", "").trim()
    const signIndex = ZODIAC_SIGN_INDEX[signRaw]
    const degree = Number(degreeRaw)
    if (typeof signIndex !== "number" || !Number.isFinite(degree)) {
        return undefined
    }
    const absolute = signIndex * 30 + degree
    return ((absolute % 360) + 360) % 360
}

function getPlanetPositionFromChartData(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
) {
    if (!chartData) return null
    const transit = chartData.transit as
        | {
              charts?: Array<{
                  planets?: Record<string, { sign?: unknown; degree?: unknown }>
              }>
          }
        | undefined
    const point = transit?.charts?.[0]?.planets?.[planet]
    if (!point || typeof point !== "object") return null
    const sign = typeof point.sign === "string" ? point.sign : null
    const degree = formatPlanetDegree(point.degree)
    if (!sign && !degree) return null
    return [sign, degree].filter(Boolean).join(" · ")
}

function getNatalPlanetPositionFromChartData(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
) {
    if (!chartData) return null
    const charts = chartData.charts as
        | Array<{
              planets?: Record<string, { sign?: unknown; degree?: unknown }>
          }>
        | undefined
    const point = charts?.[0]?.planets?.[planet]
    if (!point || typeof point !== "object") return null
    const sign = typeof point.sign === "string" ? point.sign : null
    const degree = formatPlanetDegree(point.degree)
    if (!sign && !degree) return null
    return [sign, degree].filter(Boolean).join(" · ")
}

function formatDateIsoForLocale(dateIso: string, locale: string) {
    const parsed = new Date(`${dateIso}T00:00:00.000Z`)
    if (Number.isNaN(parsed.getTime())) return dateIso
    return parsed.toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    })
}

function formatPositionFromAbsolute(longitude: unknown) {
    const numericLongitude = toFiniteNumber(longitude)
    if (typeof numericLongitude !== "number") return null
    const normalized = ((numericLongitude % 360) + 360) % 360
    const signIndex = Math.floor(normalized / 30)
    const degree = normalized - signIndex * 30
    return `${ZODIAC_SIGNS_EN[signIndex] ?? "Aries"} · ${degree.toFixed(1)}°`
}

function formatPositionFromAbsoluteLocalized(
    longitude: unknown,
    t: (key: string, values?: Record<string, string | number>) => string,
) {
    const rawPosition = formatPositionFromAbsolute(longitude)
    return localizePositionText(rawPosition, t)
}

function formatAbsoluteLongitudeBreakdown(longitude: unknown) {
    const numericLongitude = toFiniteNumber(longitude)
    if (typeof numericLongitude !== "number") return "-"
    const normalized = ((numericLongitude % 360) + 360) % 360
    return `${normalized.toFixed(3)}°`
}

function getPersonalizedAspectEvents(
    aspectsData: PersonalizedTransitAspectsResult | null | undefined,
    locale: string,
    t: (key: string, values?: Record<string, string | number>) => string,
) {
    if (!aspectsData) return []

    const defaultKeyword = t("defaultKeyword")
    const events: PanelAspectEvent[] = []
    const exactEvents = aspectsData.exact?.events ?? []
    const rangeEvents = aspectsData.range?.events ?? []
    for (const event of exactEvents) {
        events.push({
            aspectKey: event.aspectKey,
            transitPlanet: event.transitPlanet,
            natalPlanet: event.natalPlanet,
            aspectType: event.aspectType,
            aspectAngle: event.aspectAngle,
            orb: event.orb,
            keyword: event.keyword?.trim() || defaultKeyword,
            sentiment: event.sentiment ?? "neutral",
            insight: event.insight,
            tier:
                event.tier ??
                (MAIN_EVENT_PLANETS.has(event.transitPlanet)
                    ? "main"
                    : "minor"),
            zodiacSign: event.zodiacSign ?? "Aries",
            transitPositionText: normalizePositionText(
                event.transitPositionText,
            ),
            natalPositionText: normalizePositionText(event.natalPositionText),
            transitAbsoluteLongitude: toFiniteNumber(
                event.transitAbsoluteLongitude,
            ),
            natalAbsoluteLongitude: toFiniteNumber(
                event.natalAbsoluteLongitude,
            ),
            dateText: t("exactDatePrefix", {
                date: formatDateIsoForLocale(event.dateIso, locale),
            }),
            endText: t("rangeDateEnd", {
                end: formatDateIsoForLocale(event.dateIso, locale),
            }),
        })
    }
    for (const event of rangeEvents) {
        events.push({
            aspectKey: event.aspectKey,
            transitPlanet: event.transitPlanet,
            natalPlanet: event.natalPlanet,
            aspectType: event.aspectType,
            aspectAngle: event.aspectAngle,
            orb: event.minOrb,
            keyword: event.keyword?.trim() || defaultKeyword,
            sentiment: event.sentiment ?? "neutral",
            insight: event.insight,
            tier:
                event.tier ??
                (MAIN_EVENT_PLANETS.has(event.transitPlanet)
                    ? "main"
                    : "minor"),
            zodiacSign: event.zodiacSign ?? "Aries",
            transitPositionText: normalizePositionText(
                event.transitPositionText,
            ),
            natalPositionText: normalizePositionText(event.natalPositionText),
            transitAbsoluteLongitude: toFiniteNumber(
                event.transitAbsoluteLongitude,
            ),
            natalAbsoluteLongitude: toFiniteNumber(
                event.natalAbsoluteLongitude,
            ),
            dateText: t("rangeDateStart", {
                start: formatDateIsoForLocale(event.startDateIso, locale),
            }),
            peakText: t("rangeDatePeak", {
                peak: formatDateIsoForLocale(event.peakDateIso, locale),
            }),
            endText: t("rangeDateEnd", {
                end: formatDateIsoForLocale(event.endDateIso, locale),
            }),
        })
    }

    return events
        .sort((a, b) => {
            if (a.tier !== b.tier) return a.tier === "main" ? -1 : 1
            return a.orb - b.orb
        })
        .slice(0, Math.max(6, exactEvents.length + rangeEvents.length))
}

function AspectIcon({ aspectType }: { aspectType: string }) {
    if (aspectType === "conjunction") {
        return <Layers className='h-4 w-4 text-cyan-200' />
    }
    if (aspectType === "opposition") {
        return <MoveHorizontal className='h-4 w-4 text-cyan-200' />
    }
    if (aspectType === "square") {
        return <Square className='h-4 w-4 text-cyan-200' />
    }
    if (aspectType === "trine") {
        return <Triangle className='h-4 w-4 text-cyan-200' />
    }
    return <Minus className='h-4 w-4 text-cyan-200' />
}

export default function RealtimePlanetaryPanel({
    chartData,
    personalizedTransitAspects,
    personalizedTransitAspectsMerged,
    onAskAspectDetail,
    askedAspectKeys,
    showBirthDetails,
    showTransitDetails,
    onToggleBirthDetails,
    onToggleTransitDetails,
}: {
    chartData?: Record<string, unknown> | null
    personalizedTransitAspects?: PersonalizedTransitAspectsResult | null
    personalizedTransitAspectsMerged?: PersonalizedTransitAspectsResult | null
    onAskAspectDetail?: (
        question: string,
        aspectKey: string,
        event: SourceAspectEvent,
    ) => void
    askedAspectKeys?: Record<string, string>
    showBirthDetails?: boolean
    showTransitDetails?: boolean
    onToggleBirthDetails?: () => void
    onToggleTransitDetails?: () => void
}) {
    const locale = useLocale()
    const t = useTranslations("PlanetaryPanel")
    const noChartPositionLabel = t("noChartPosition")
    const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>(
        {},
    )
    const [showDailyVibes, setShowDailyVibes] = useState(false)
    const [showLifeSituation, setShowLifeSituation] = useState(false)
    const [localShowBirthDetails, setLocalShowBirthDetails] = useState(false)
    const [localShowTransitDetails, setLocalShowTransitDetails] =
        useState(false)
    const fallbackAspects = chartData?.personalizedTransitAspects as
        | PersonalizedTransitAspectsResult
        | undefined
    const fallbackMergedAspects =
        chartData?.personalizedTransitAspectsMerged as
            | PersonalizedTransitAspectsResult
            | undefined
    const allAspectEvents = getPersonalizedAspectEvents(
        personalizedTransitAspects ?? fallbackAspects,
        locale,
        t,
    )
    const mergedAspectEvents = getPersonalizedAspectEvents(
        personalizedTransitAspectsMerged ?? fallbackMergedAspects,
        locale,
        t,
    )
    if (allAspectEvents.length === 0) return null

    const mergedKeys = new Set(
        mergedAspectEvents.map((event) => event.aspectKey),
    )
    const hasMergedDiscussedEvents = mergedKeys.size > 0
    const discussedEvents = hasMergedDiscussedEvents
        ? mergedAspectEvents
        : allAspectEvents
    const lifeSituationEvents = hasMergedDiscussedEvents
        ? allAspectEvents.filter((event) => !mergedKeys.has(event.aspectKey))
        : []
    const mainEvents = discussedEvents.filter((event) => event.tier === "main")
    const minorEvents = discussedEvents.filter(
        (event) => event.tier === "minor",
    )
    const hasBirthDetails = Boolean(
        (chartData as { charts?: unknown[] } | null)?.charts?.length,
    )
    const hasTransitDetails = Boolean(
        (chartData as { transit?: { charts?: unknown[] } } | null)?.transit
            ?.charts?.length,
    )
    const resolvedShowBirthDetails = showBirthDetails ?? localShowBirthDetails
    const resolvedShowTransitDetails =
        showTransitDetails ?? localShowTransitDetails
    const handleToggleBirthDetails =
        onToggleBirthDetails ??
        (() => setLocalShowBirthDetails((prev) => !prev))
    const handleToggleTransitDetails =
        onToggleTransitDetails ??
        (() => setLocalShowTransitDetails((prev) => !prev))

    function PlanetAvatar({ planet }: { planet: string }) {
        const key = planet.toLowerCase()
        const shouldTryImage = PLANET_IMAGE_KEYS.has(key)
        if (shouldTryImage && !hiddenImages[planet]) {
            return (
                <Image
                    src={`/assets/planetary/${key}.png`}
                    alt={planet}
                    width={42}
                    height={42}
                    className='h-[42px] w-[42px] rounded-full object-cover'
                    onError={() =>
                        setHiddenImages((prev) => ({
                            ...prev,
                            [planet]: true,
                        }))
                    }
                />
            )
        }
        return (
            <div className='h-[42px] w-[42px] rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/70'>
                {planet.slice(0, 2).toUpperCase()}
            </div>
        )
    }

    function EventCard({ event }: { event: PanelAspectEvent }) {
        const info = getPlanetPositionFromChartData(
            chartData,
            event.transitPlanet,
        )

        const transitPosition =
            localizePositionText(event.transitPositionText, t) ||
            formatPositionFromAbsoluteLocalized(
                event.transitAbsoluteLongitude,
                t,
            ) ||
            localizePositionText(info, t) ||
            noChartPositionLabel
        const natalPosition =
            localizePositionText(event.natalPositionText, t) ||
            formatPositionFromAbsoluteLocalized(
                event.natalAbsoluteLongitude,
                t,
            ) ||
            localizePositionText(
                getNatalPlanetPositionFromChartData(
                    chartData,
                    event.natalPlanet,
                ),
                t,
            ) ||
            noChartPositionLabel
        const resolvedTransitAbsoluteLongitude =
            toFiniteNumber(event.transitAbsoluteLongitude) ??
            parseAbsoluteFromPositionText(event.transitPositionText) ??
            parseAbsoluteFromPositionText(transitPosition)
        const resolvedNatalAbsoluteLongitude =
            toFiniteNumber(event.natalAbsoluteLongitude) ??
            parseAbsoluteFromPositionText(event.natalPositionText) ??
            parseAbsoluteFromPositionText(natalPosition)
        const transitAbsoluteText = formatAbsoluteLongitudeBreakdown(
            resolvedTransitAbsoluteLongitude,
        )
        const natalAbsoluteText = formatAbsoluteLongitudeBreakdown(
            resolvedNatalAbsoluteLongitude,
        )
        const sentimentIcon =
            event.sentiment === "good" ? (
                <TrendingUp className='h-3.5 w-3.5 text-emerald-300' />
            ) : event.sentiment === "bad" ? (
                <TrendingDown className='h-3.5 w-3.5 text-rose-300' />
            ) : (
                <Minus className='h-3.5 w-3.5 text-slate-300' />
            )
        const defaultKeyword = t("defaultKeyword")
        const hasRealKeyword =
            !!event.keyword?.trim() && event.keyword.trim() !== defaultKeyword
        const displayKeyword = event.keyword?.trim() || defaultKeyword
        return (
            <div className='rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2 min-w-[260px]'>
                <div className='flex items-center justify-between gap-3'>
                    <div className='inline-flex items-center gap-2'>
                        <PlanetAvatar planet={event.transitPlanet} />
                        <div className='flex flex-col'>
                            <span className='text-sm font-medium text-white'>
                                {(t(`planets.${event.transitPlanet}`) ??
                                    event.transitPlanet) + t("transitSuffix")}
                            </span>
                            <span className='text-[10px] text-white/65'>
                                {transitPosition}
                            </span>
                            <span className='text-[10px] text-white/45'>
                                {transitAbsoluteText}
                            </span>
                        </div>
                    </div>
                    <div className='flex flex-col items-center'>
                        <AspectIcon aspectType={event.aspectType} />
                        <span className='text-[10px] text-white/70'>
                            {t(`aspects.${event.aspectType}`) ??
                                event.aspectType}
                        </span>
                    </div>
                    <div className='inline-flex items-center gap-2'>
                        <PlanetAvatar planet={event.natalPlanet} />
                        <div className='flex flex-col'>
                            <span className='text-sm font-medium text-white'>
                                {(t(`planets.${event.natalPlanet}`) ??
                                    event.natalPlanet) + t("natalSuffix")}
                            </span>
                            <span className='text-[10px] text-white/65'>
                                {natalPosition}
                            </span>
                            <span className='text-[10px] text-white/45'>
                                {natalAbsoluteText}
                            </span>
                        </div>
                    </div>
                </div>

                <div className='flex justify-between gap-2'>
                    <div className='flex items-end gap-2'>
                        {hasRealKeyword && (
                            <div className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md relative group/insight shadow-lg'>
                                <span className='relative z-10'>
                                    {sentimentIcon}
                                </span>
                                <p className='text-[10px] font-serif italic text-indigo-100 text-left leading-relaxed tracking-tight relative z-10'>
                                    &ldquo;{displayKeyword}&rdquo;
                                </p>
                            </div>
                        )}

                        <p className='text-[10px] w-fit text-cyan-100/90 rounded-md border border-cyan-400/20 bg-cyan-500/10 px-2 py-1'>
                            {`orb ${event.orb.toFixed(1)}°`}
                        </p>
                    </div>

                    {askedAspectKeys?.[event.aspectKey] ? (
                        <button
                            type='button'
                            onClick={() => {
                                const el = document.getElementById(
                                    `msg-${askedAspectKeys[event.aspectKey]}`,
                                )
                                el?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                })
                            }}
                            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md shadow-lg hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-colors cursor-pointer'
                        >
                            <Eye className='h-3.5 w-3.5 text-emerald-300' />
                            <span className='text-[10px] font-medium text-emerald-100'>
                                {t("readDescription")}
                            </span>
                        </button>
                    ) : (
                        <button
                            type='button'
                            onClick={() => {
                                const question = t("askAspectQuestion", {
                                    transit: t(
                                        `planets.${event.transitPlanet}`,
                                    ),
                                    aspect: t(`aspects.${event.aspectType}`),
                                    natal: t(`planets.${event.natalPlanet}`),
                                })
                                onAskAspectDetail?.(question, event.aspectKey, {
                                    aspectKey: event.aspectKey,
                                    transitPlanet: event.transitPlanet,
                                    natalPlanet: event.natalPlanet,
                                    aspectType: event.aspectType,
                                    keyword: event.keyword,
                                    sentiment: event.sentiment,
                                    orb: event.orb,
                                    transitPositionText: transitPosition,
                                    natalPositionText: natalPosition,
                                    transitAbsoluteText: transitAbsoluteText,
                                    natalAbsoluteText: natalAbsoluteText,
                                })
                                scrollTo({
                                    top: document.body.scrollHeight,
                                    behavior: "smooth",
                                })
                            }}
                            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md shadow-lg hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-colors cursor-pointer'
                        >
                            <Sparkles className='h-3.5 w-3.5 text-indigo-300' />
                            <span className='text-[10px] font-medium text-indigo-100'>
                                {t("askMore")}
                            </span>
                            <Star className='h-3 w-3 text-amber-300 fill-amber-300' />
                            <span className='text-[10px] font-medium text-amber-200'>
                                1
                            </span>
                        </button>
                    )}
                </div>

                {event.insight && (
                    <p className='text-[10px] text-white/75 leading-relaxed'>
                        {event.insight}
                    </p>
                )}

                {event.dateText && (
                    <div className='flex justify-between items-center text-[10px] w-full text-amber-100/90 rounded px-2 py-1'>
                        <span className='inline-flex items-center gap-1'>
                            <Calendar className='h-3 w-3 shrink-0' />
                            {event.dateText}
                        </span>
                        {event.peakText && (
                            <span className='inline-flex items-center gap-1 text-amber-200/90 px-2'>
                                <Flame className='h-3 w-3 text-orange-300' />
                                {event.peakText}
                            </span>
                        )}
                        {event.endText && (
                            <span className='text-amber-200/80 text-right'>
                                {event.endText}
                            </span>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className='space-y-4'>
            {mainEvents.length > 0 && (
                <div className='space-y-2'>
                    <p className='text-xs uppercase tracking-[0.18em] text-white/55'>
                        {t("mainEvents")}
                    </p>
                    <div className='grid gap-3 grid-cols-1 sm:grid-cols-2'>
                        {mainEvents.map((event) => (
                            <EventCard key={event.aspectKey} event={event} />
                        ))}
                    </div>
                </div>
            )}

            <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                    {minorEvents.length > 0 && (
                        <button
                            type='button'
                            onClick={() => setShowDailyVibes((prev) => !prev)}
                            className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                        >
                            {showDailyVibes ? (
                                <ChevronUp className='h-3.5 w-3.5' />
                            ) : (
                                <ChevronDown className='h-3.5 w-3.5' />
                            )}
                            {t("showDailyVibes", { count: minorEvents.length })}
                        </button>
                    )}
                    {lifeSituationEvents.length > 0 && (
                        <button
                            type='button'
                            onClick={() =>
                                setShowLifeSituation((prev) => !prev)
                            }
                            className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                        >
                            {showLifeSituation ? (
                                <ChevronUp className='h-3.5 w-3.5' />
                            ) : (
                                <ChevronDown className='h-3.5 w-3.5' />
                            )}
                            {t("showLifeSituation", {
                                count: lifeSituationEvents.length,
                            })}
                        </button>
                    )}
                    {hasBirthDetails && (
                        <button
                            type='button'
                            onClick={handleToggleBirthDetails}
                            className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                        >
                            {resolvedShowBirthDetails ? (
                                <ChevronUp className='h-3.5 w-3.5' />
                            ) : (
                                <ChevronDown className='h-3.5 w-3.5' />
                            )}
                            {t("showBirthDetails")}
                        </button>
                    )}
                    {hasTransitDetails && (
                        <button
                            type='button'
                            onClick={handleToggleTransitDetails}
                            className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                        >
                            {resolvedShowTransitDetails ? (
                                <ChevronUp className='h-3.5 w-3.5' />
                            ) : (
                                <ChevronDown className='h-3.5 w-3.5' />
                            )}
                            {t("showTransitDetails")}
                        </button>
                    )}
                </div>

                {showDailyVibes && minorEvents.length > 0 && (
                    <div className='grid gap-3 grid-cols-1 sm:grid-cols-2'>
                        {minorEvents.map((event) => (
                            <EventCard key={event.aspectKey} event={event} />
                        ))}
                    </div>
                )}

                {showLifeSituation && lifeSituationEvents.length > 0 && (
                    <div className='grid gap-3 grid-cols-1 sm:grid-cols-2'>
                        {lifeSituationEvents.map((event) => (
                            <EventCard key={event.aspectKey} event={event} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
