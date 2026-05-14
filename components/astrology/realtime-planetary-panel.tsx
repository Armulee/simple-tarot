"use client"

import { type ReactNode, useState } from "react"
import Image from "next/image"
import { ChevronDown, ChevronUp, Sparkles, Star } from "lucide-react"
import { AspectIcon } from "@/components/astrology/aspect-icon"
import { Eye } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import type {
    AspectInsightItem,
    SourceAspectEvent,
} from "@/components/chat/types"

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
    impact?: string
    intensity?: "low" | "medium" | "high"
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

type ToggleItem = {
    key: string
    isOpen: boolean
    button: ReactNode
    content?: ReactNode
}

function ToggleButtonGroup({
    items,
}: {
    items: Array<ToggleItem | null | undefined>
}) {
    const visible = items.filter(Boolean) as ToggleItem[]
    if (visible.length === 0) return null

    const firstOpenIdx = visible.findIndex((item) => item.isOpen && item.content)

    if (firstOpenIdx === -1) {
        return (
            <div className='flex flex-wrap items-center gap-2'>
                {visible.map((item) => (
                    <div key={item.key}>{item.button}</div>
                ))}
            </div>
        )
    }

    const before = visible.slice(0, firstOpenIdx + 1)
    const openItem = visible[firstOpenIdx]
    const after = visible.slice(firstOpenIdx + 1)

    return (
        <div className='space-y-2'>
            {before.some((item) => item.button) && (
                <div className='flex flex-wrap items-center gap-2'>
                    {before.map((item) =>
                        item.button ? (
                            <div key={item.key}>{item.button}</div>
                        ) : null,
                    )}
                </div>
            )}
            {openItem.content}
            {after.length > 0 && (
                <ToggleButtonGroup
                    items={after}
                />
            )}
        </div>
    )
}

export default function RealtimePlanetaryPanel({
    chartData,
    personalizedTransitAspects,
    personalizedTransitAspectsMerged,
    aspectInsights,
    onAskAspectDetail,
    askedAspectKeys,
    showBirthDetails,
    showTransitDetails,
    onToggleBirthDetails,
    onToggleTransitDetails,
    birthDetailsContent,
    transitDetailsContent,
}: {
    chartData?: Record<string, unknown> | null
    personalizedTransitAspects?: PersonalizedTransitAspectsResult | null
    personalizedTransitAspectsMerged?: PersonalizedTransitAspectsResult | null
    aspectInsights?: AspectInsightItem[]
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
    birthDetailsContent?: ReactNode
    transitDetailsContent?: ReactNode
}) {
    const locale = useLocale()
    const t = useTranslations("PlanetaryPanel")
    const noChartPositionLabel = t("noChartPosition")
    const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>(
        {},
    )
    const [visibleRelatedCount, setVisibleRelatedCount] = useState(3)
    const [visibleRemainingCount, setVisibleRemainingCount] = useState(3)
    const [expandedTechnical, setExpandedTechnical] = useState<
        Record<string, boolean>
    >({})
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

    const insightMap = new Map(
        (aspectInsights ?? []).map((i) => [i.aspectKey, i]),
    )
    for (const ev of allAspectEvents) {
        const ai = insightMap.get(ev.aspectKey)
        if (ai) {
            ev.impact = ai.impact
            ev.intensity = ai.intensity
        }
    }
    for (const ev of mergedAspectEvents) {
        const ai = insightMap.get(ev.aspectKey)
        if (ai) {
            ev.impact = ai.impact
            ev.intensity = ai.intensity
        }
    }

    const mergedKeys = new Set(
        mergedAspectEvents.map((event) => event.aspectKey),
    )
    const hasMergedDiscussedEvents = mergedKeys.size > 0
    const discussedEvents = hasMergedDiscussedEvents
        ? mergedAspectEvents
        : allAspectEvents
    const undiscussedEvents = hasMergedDiscussedEvents
        ? allAspectEvents.filter((event) => !mergedKeys.has(event.aspectKey))
        : []

    const highEvents = discussedEvents.filter((e) => e.intensity === "high")
    const mediumEvents = discussedEvents.filter((e) => e.intensity === "medium")
    const lowEvents = discussedEvents.filter(
        (e) => !e.intensity || e.intensity === "low",
    )
    const featuredEvents =
        highEvents.length > 0
            ? highEvents
            : mediumEvents.length > 0
              ? mediumEvents
              : lowEvents
    const featuredKeys = new Set(featuredEvents.map((e) => e.aspectKey))
    const relatedEvents = discussedEvents.filter(
        (e) => !featuredKeys.has(e.aspectKey) && (e.impact || e.intensity),
    )
    const allRemainingEvents = [
        ...discussedEvents.filter(
            (e) =>
                !featuredKeys.has(e.aspectKey) && !e.impact && !e.intensity,
        ),
        ...undiscussedEvents,
    ]
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
        const defaultKeyword = t("defaultKeyword")
        const hasRealKeyword =
            !!event.keyword?.trim() && event.keyword.trim() !== defaultKeyword
        const displayKeyword = event.keyword?.trim() || defaultKeyword
        const intensity = event.intensity ?? "low"
        const intensityColor =
            intensity === "high"
                ? "#E8604C"
                : intensity === "medium"
                  ? "#E8A84C"
                  : "#4CC9A4"
        const isTechnicalExpanded = Boolean(expandedTechnical[event.aspectKey])
        const dateStart = event.dateText?.replace(/^.*?\s/, "") || "-"
        const datePeak = event.peakText?.replace(/^.*?\s/, "") || dateStart
        const dateEnd = event.endText?.replace(/^.*?\s/, "") || datePeak
        const transitLabel =
            t(`planets.${event.transitPlanet}`) ?? event.transitPlanet
        const natalLabel = t(`planets.${event.natalPlanet}`) ?? event.natalPlanet

        return (
            <div className='min-w-[260px] space-y-4 rounded-[16px] border border-white/10 bg-white/[0.04] p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='inline-flex items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-300/[0.08] px-2.5 py-1 text-[10px] font-medium text-violet-100'>
                        {t("impactLabel")}
                        <span>{event.impact || displayKeyword}</span>
                    </span>
                    <span
                        className='inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium'
                        style={{
                            borderColor: `${intensityColor}55`,
                            backgroundColor: `${intensityColor}1A`,
                            color: intensityColor,
                        }}
                    >
                        {t("intensityLabel")}
                        <span>{t(`intensity.${intensity}`)}</span>
                    </span>
                </div>

                <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3'>
                    <div className='min-w-0 text-center'>
                        <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]'>
                            <PlanetAvatar planet={event.transitPlanet} />
                        </div>
                        <p className='truncate text-sm font-medium text-white'>
                            {transitLabel}
                        </p>
                        <p className='text-[10px] text-white/45'>
                            {t("transitSuffix")}
                        </p>
                    </div>
                    <div className='flex flex-col items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-cyan-100'>
                        <AspectIcon aspectType={event.aspectType} />
                        <span className='text-[10px] font-medium'>
                            {t(`aspects.${event.aspectType}`) ??
                                event.aspectType}
                        </span>
                    </div>
                    <div className='min-w-0 text-center'>
                        <div className='mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]'>
                            <PlanetAvatar planet={event.natalPlanet} />
                        </div>
                        <p className='truncate text-sm font-medium text-white'>
                            {natalLabel}
                        </p>
                        <p className='text-[10px] text-white/45'>
                            {t("natalSuffix")}
                        </p>
                    </div>
                </div>

                <div className='border-l-2 border-cyan-300/55 bg-cyan-300/[0.05] px-3 py-2'>
                    <p className='text-sm leading-6 text-white/82'>
                        {event.insight ||
                            (hasRealKeyword
                                ? displayKeyword
                                : t("defaultInsight"))}
                    </p>
                </div>

                <div className='space-y-2'>
                    <div className='relative h-2 rounded-full bg-white/10'>
                        <div className='absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-gradient-to-r from-white/20 via-amber-200/45 to-white/20' />
                        <div className='absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_20px_4px_rgba(232,168,76,0.55)]' />
                    </div>
                    <div className='grid grid-cols-3 gap-2 text-[10px] text-white/45'>
                        <span>{dateStart}</span>
                        <span className='text-center text-amber-200/85'>
                            {datePeak}
                        </span>
                        <span className='text-right'>{dateEnd}</span>
                    </div>
                </div>

                <div className='flex items-center justify-between gap-2'>
                    <button
                        type='button'
                        onClick={() =>
                            setExpandedTechnical((prev) => ({
                                ...prev,
                                [event.aspectKey]: !prev[event.aspectKey],
                            }))
                        }
                        className='text-[10px] text-white/45 underline decoration-white/15 underline-offset-4 hover:text-white/70'
                    >
                        {isTechnicalExpanded
                            ? t("hideTechnical")
                            : t("showTechnical")}
                    </button>

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
                            className='inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-medium text-emerald-100 transition-colors hover:bg-emerald-500/20'
                        >
                            <Eye className='h-3.5 w-3.5 text-emerald-300' />
                            {t("readDescription")}
                        </button>
                    ) : (
                        <button
                            type='button'
                            onClick={() => {
                                const question = t("askAspectQuestion", {
                                    transit: transitLabel,
                                    aspect: t(`aspects.${event.aspectType}`),
                                    natal: natalLabel,
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
                                    transitAbsoluteText,
                                    natalAbsoluteText,
                                })
                                scrollTo({
                                    top: document.body.scrollHeight,
                                    behavior: "smooth",
                                })
                            }}
                            className='inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-[10px] font-medium text-indigo-100 transition-colors hover:bg-indigo-500/20'
                        >
                            <Sparkles className='h-3.5 w-3.5 text-indigo-300' />
                            {t("askMore")}
                            <Star className='h-3 w-3 fill-amber-300 text-amber-300' />
                            <span className='text-amber-200'>1</span>
                        </button>
                    )}
                </div>

                {isTechnicalExpanded && (
                    <div className='grid gap-1 rounded-xl border border-white/10 bg-black/15 p-3 text-[10px] text-white/35'>
                        <span>{`Transit: ${transitPosition} (${transitAbsoluteText})`}</span>
                        <span>{`Natal: ${natalPosition} (${natalAbsoluteText})`}</span>
                        <span>{`Orb: ${event.orb.toFixed(1)}°`}</span>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className='space-y-4'>
            {featuredEvents.length > 0 && (
                <div className='grid gap-3 grid-cols-1 sm:grid-cols-2'>
                    {featuredEvents.map((event) => (
                        <EventCard key={event.aspectKey} event={event} />
                    ))}
                </div>
            )}

            <ToggleButtonGroup
                items={[
                    relatedEvents.length > 0
                        ? {
                              key: "related",
                              isOpen: true,
                              button:
                                  visibleRelatedCount < relatedEvents.length ? (
                                      <button
                                          type='button'
                                          onClick={() =>
                                              setVisibleRelatedCount((count) =>
                                                  Math.min(
                                                      count + 3,
                                                      relatedEvents.length,
                                                  ),
                                              )
                                          }
                                          className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                                      >
                                          + {t("showMore")}
                                      </button>
                                  ) : null,
                              content: (
                                  <div className='grid gap-3 grid-cols-1 sm:grid-cols-2'>
                                      {relatedEvents
                                          .slice(0, visibleRelatedCount)
                                          .map((event) => (
                                              <EventCard
                                                  key={event.aspectKey}
                                                  event={event}
                                              />
                                          ))}
                                  </div>
                              ),
                          }
                        : null,
                    allRemainingEvents.length > 0
                        ? {
                              key: "all",
                              isOpen: true,
                              button:
                                  visibleRemainingCount <
                                  allRemainingEvents.length ? (
                                      <button
                                          type='button'
                                          onClick={() =>
                                              setVisibleRemainingCount((count) =>
                                                  Math.min(
                                                      count + 3,
                                                      allRemainingEvents.length,
                                                  ),
                                              )
                                          }
                                          className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                                      >
                                          + {t("showMore")}
                                      </button>
                                  ) : null,
                              content: (
                                  <div className='grid gap-3 grid-cols-1 sm:grid-cols-2'>
                                      {allRemainingEvents
                                          .slice(0, visibleRemainingCount)
                                          .map((event) => (
                                              <EventCard
                                                  key={event.aspectKey}
                                                  event={event}
                                              />
                                          ))}
                                  </div>
                              ),
                          }
                        : null,
                    hasBirthDetails
                        ? {
                              key: "birth",
                              isOpen: resolvedShowBirthDetails,
                              button: (
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
                              ),
                              content: birthDetailsContent,
                          }
                        : null,
                    hasTransitDetails
                        ? {
                              key: "transit",
                              isOpen: resolvedShowTransitDetails,
                              button: (
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
                              ),
                              content: transitDetailsContent,
                          }
                        : null,
                ]}
            />
        </div>
    )
}
