"use client"

import { useState } from "react"
import Image from "next/image"
import { Eye, Flame, Sparkles, Star } from "lucide-react"
import { AspectIcon } from "@/components/astrology/aspect-icon"
import { useLocale, useTranslations } from "next-intl"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import type {
    AspectInsightItem,
    SourceAspectEvent,
} from "@/components/chat/types"
import { PLANET_IMAGE_KEYS } from "@/lib/astrology/planet-images"
import { getPlanetDignity } from "@/lib/birth-chart-utils"

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
    /**
     * Raw ISO date strings preserved from the upstream aspect calc. Exact
     * events fill `dateIso`; range events fill the start/peak/end trio. Kept
     * so the EventCard timeline can compute "today's position" inside the
     * window instead of hardcoding it to the midpoint.
     */
    dateIso?: string
    startDateIso?: string
    peakDateIso?: string
    endDateIso?: string
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

const OUTER_GENERATIONAL_PLANETS = new Set(["Uranus", "Neptune", "Pluto"])
const BIG_FAST_PLANETS = new Set(["Jupiter", "Saturn"])

/**
 * Display priority for the transit-aspect list in this panel. Lower numbers
 * sort to the top. Within each group, ties keep the upstream order (intensity
 * → orb), so the panel reads as "headline aspects first, generational ones
 * last".
 *   0 — Big planets except U/N/P (Jupiter, Saturn)
 *   1 — Everyone else (Sun/Moon/Mercury/Venus/Mars + nodes/Chiron)
 *   2 — Outer generational planets (Uranus, Neptune, Pluto)
 */
function transitPlanetPriority(planet: string): number {
    if (BIG_FAST_PLANETS.has(planet)) return 0
    if (OUTER_GENERATIONAL_PLANETS.has(planet)) return 2
    return 1
}

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

function parseAbsoluteFromPositionText(positionText: string | null | undefined) {
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

type ChartPlanetPoint = {
    sign?: unknown
    degree?: unknown
    longitude?: unknown
    retrograde?: unknown
}

function readTransitPlanetPoint(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
): ChartPlanetPoint | null {
    if (!chartData) return null
    const transit = chartData.transit as
        | { charts?: Array<{ planets?: Record<string, ChartPlanetPoint> }> }
        | undefined
    const point = transit?.charts?.[0]?.planets?.[planet]
    return point && typeof point === "object" ? point : null
}

function readNatalPlanetPoint(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
): ChartPlanetPoint | null {
    if (!chartData) return null
    const charts = chartData.charts as
        | Array<{ planets?: Record<string, ChartPlanetPoint> }>
        | undefined
    const point = charts?.[0]?.planets?.[planet]
    return point && typeof point === "object" ? point : null
}

function getPlanetPositionFromChartData(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
) {
    const point = readTransitPlanetPoint(chartData, planet)
    if (!point) return null
    const sign = typeof point.sign === "string" ? point.sign : null
    const degree = formatPlanetDegree(point.degree)
    if (!sign && !degree) return null
    return [sign, degree].filter(Boolean).join(" · ")
}

function getNatalPlanetPositionFromChartData(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
) {
    const point = readNatalPlanetPoint(chartData, planet)
    if (!point) return null
    const sign = typeof point.sign === "string" ? point.sign : null
    const degree = formatPlanetDegree(point.degree)
    if (!sign && !degree) return null
    return [sign, degree].filter(Boolean).join(" · ")
}

/** Map common aliases (Thai/Lao/abbrev) back to canonical English so dignity
 *  lookups in `getPlanetDignity` (which keys on English signs) resolve. */
function canonicalSignName(sign: string | null | undefined): string | null {
    if (!sign) return null
    if (ZODIAC_SIGNS_EN.includes(sign)) return sign
    const idx = ZODIAC_SIGN_INDEX[sign]
    if (typeof idx === "number") return ZODIAC_SIGNS_EN[idx] ?? sign
    return sign
}

function extractSignFromAbsolute(longitude: number | undefined): string | null {
    if (typeof longitude !== "number" || !Number.isFinite(longitude)) return null
    const normalized = ((longitude % 360) + 360) % 360
    return ZODIAC_SIGNS_EN[Math.floor(normalized / 30)] ?? null
}

function parseSignFromPositionText(
    positionText: string | null | undefined,
): string | null {
    const normalized = normalizePositionText(positionText)
    if (!normalized) return null
    const sign = normalized.split("·")[0]?.trim()
    return sign || null
}

/** Smallest separation between two longitudes, in degrees (0..180). */
function angularSeparation(
    aLongitude: number | undefined | null,
    bLongitude: number | undefined | null,
): number | null {
    if (
        typeof aLongitude !== "number" ||
        typeof bLongitude !== "number" ||
        !Number.isFinite(aLongitude) ||
        !Number.isFinite(bLongitude)
    ) {
        return null
    }
    const raw = Math.abs(aLongitude - bLongitude) % 360
    return raw > 180 ? 360 - raw : raw
}

/**
 * Orb against a target aspect angle (0 / 60 / 90 / 120 / 180), using the
 * shorter of the two possible arcs around the circle. Falls back to `null`
 * when either longitude is missing so the caller can render the upstream
 * peak orb instead.
 */
function computeCurrentOrb(
    transitLongitude: number | undefined | null,
    natalLongitude: number | undefined | null,
    aspectAngle: number,
): number | null {
    const separation = angularSeparation(transitLongitude, natalLongitude)
    if (separation === null) return null
    return Math.abs(separation - aspectAngle)
}

/**
 * Standard "in-orb" thresholds the panel uses to decide whether an aspect
 * is currently active. Aspect events from the upstream calc can stretch
 * across a multi-month window, but for the realtime panel we only want
 * to show aspects whose orb *today* is tight enough to actually matter.
 */
const ACTIVE_ORB_DEGREES = 5

/** Today's transit longitude for `planet` from chartData, or null. */
function getTodayTransitLongitude(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
): number | null {
    const point = readTransitPlanetPoint(chartData, planet)
    if (!point) return null
    const long = toFiniteNumber(point.longitude)
    if (typeof long === "number") return long
    // Fall back to sign + degree if longitude is absent.
    const signRaw = typeof point.sign === "string" ? point.sign : null
    const sign = canonicalSignName(signRaw)
    const degree = toFiniteNumber(point.degree)
    if (!sign || typeof degree !== "number") return null
    const idx = ZODIAC_SIGN_INDEX[sign]
    if (typeof idx !== "number") return null
    return idx * 30 + degree
}

/** Natal longitude for `planet`, preferring chartData over the event payload. */
function getNatalLongitude(
    chartData: Record<string, unknown> | null | undefined,
    planet: string,
    fallback: number | undefined,
): number | null {
    const point = readNatalPlanetPoint(chartData, planet)
    if (point) {
        const long = toFiniteNumber(point.longitude)
        if (typeof long === "number") return long
        const signRaw = typeof point.sign === "string" ? point.sign : null
        const sign = canonicalSignName(signRaw)
        const degree = toFiniteNumber(point.degree)
        if (sign && typeof degree === "number") {
            const idx = ZODIAC_SIGN_INDEX[sign]
            if (typeof idx === "number") return idx * 30 + degree
        }
    }
    return typeof fallback === "number" && Number.isFinite(fallback)
        ? fallback
        : null
}

/**
 * Returns today's orb for an aspect event in degrees, or null if either
 * longitude can't be resolved.
 */
function computeTodayOrbForEvent(
    event: PanelAspectEvent,
    chartData: Record<string, unknown> | null | undefined,
): number | null {
    const transitLng = getTodayTransitLongitude(chartData, event.transitPlanet)
    const natalLng = getNatalLongitude(
        chartData,
        event.natalPlanet,
        event.natalAbsoluteLongitude,
    )
    return computeCurrentOrb(transitLng, natalLng, event.aspectAngle)
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

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** UTC midnight epoch for a YYYY-MM-DD ISO date, or `null` if unparseable. */
function parseIsoDay(iso: string | undefined | null): number | null {
    if (typeof iso !== "string" || !iso) return null
    const parsed = Date.parse(`${iso}T00:00:00.000Z`)
    return Number.isFinite(parsed) ? parsed : null
}

/** UTC midnight epoch for "today" in the user's clock; collapsed to UTC day. */
function todayUtcEpoch(): number {
    const now = new Date()
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

function clamp01(n: number): number {
    if (!Number.isFinite(n)) return 0
    if (n < 0) return 0
    if (n > 1) return 1
    return n
}

/** Signed integer day difference between two UTC midnight epochs. */
function daysBetween(a: number, b: number): number {
    return Math.round((b - a) / MS_PER_DAY)
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
            dateIso: event.dateIso,
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
            startDateIso: event.startDateIso,
            peakDateIso: event.peakDateIso,
            endDateIso: event.endDateIso,
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

/**
 * Visualises where the current moment sits within an aspect's window.
 *
 * - Range events (`startDateIso` / `peakDateIso` / `endDateIso` present):
 *   Horizontal track from start → end with an amber peak dot and a small white
 *   "today" tick that slides along the bar. The track is split visually so the
 *   portion before today is dim and the portion ahead is brighter, giving a
 *   "we are here" hint at a glance. If today is outside the window, the tick
 *   pins to the nearest edge in a muted style with a small `before`/`after`
 *   delta label.
 * - Exact events (only `dateIso`): no bar — just a single amber dot + the
 *   formatted date and a relative hint ("today" / "in N days" / "N days ago").
 * - Fallback (no ISOs at all): keep the static start | peak | end text row so
 *   we never regress to a worse layout than before.
 */
function AspectTimeline({
    event,
    dateStart,
    datePeak,
    dateEnd,
    locale,
    t,
}: {
    event: PanelAspectEvent
    dateStart: string
    datePeak: string
    dateEnd: string
    locale: string
    t: (key: string, values?: Record<string, string | number>) => string
}) {
    const today = todayUtcEpoch()
    const startMs = parseIsoDay(event.startDateIso)
    const peakMs = parseIsoDay(event.peakDateIso)
    const endMs = parseIsoDay(event.endDateIso)
    const exactMs = parseIsoDay(event.dateIso)

    // RANGE: start / peak / end all parseable and the window has non-zero span.
    if (
        startMs !== null &&
        peakMs !== null &&
        endMs !== null &&
        endMs > startMs
    ) {
        const span = endMs - startMs
        const peakProgress = clamp01((peakMs - startMs) / span)
        const rawTodayProgress = (today - startMs) / span
        const inWindow = rawTodayProgress >= 0 && rawTodayProgress <= 1
        const todayProgress = clamp01(rawTodayProgress)
        const todayPct = todayProgress * 100
        const peakPct = peakProgress * 100

        const beforeDays = daysBetween(today, startMs)
        const afterDays = daysBetween(endMs, today)
        const todayHint = inWindow
            ? null
            : rawTodayProgress < 0
              ? t("timelineUpcoming", {
                    days: beforeDays,
                    defaultValue: `in ${beforeDays}d`,
                })
              : t("timelinePassed", {
                    days: afterDays,
                    defaultValue: `${afterDays}d ago`,
                })

        return (
            <div className='space-y-2'>
                <div className='relative pt-7'>
                    {/* Peak date sits above the flame / track */}
                    <span
                        className='pointer-events-none absolute top-0 z-[3] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] leading-none text-amber-200/90 tabular-nums'
                        style={{ left: `${peakPct}%` }}
                    >
                        {datePeak}
                    </span>
                    <div
                        className='relative h-[6px] rounded-full bg-white/[0.06]'
                        role='img'
                        aria-label={t("timelineAriaLabel", {
                            start: dateStart,
                            peak: datePeak,
                            end: dateEnd,
                            defaultValue: `${dateStart} - ${datePeak} - ${dateEnd}`,
                        })}
                    >
                        {/* Filled portion up to today (or 100% if past) */}
                        <div
                            className='absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/15 via-amber-200/35 to-amber-200/45'
                            style={{ width: `${todayPct}%` }}
                        />
                        {/* Peak marker — fire icon at exact peak */}
                        <Flame
                            className='pointer-events-none absolute top-1/2 z-[1] h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 text-amber-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.85)]'
                            style={{ left: `${peakPct}%` }}
                            aria-hidden
                            strokeWidth={2}
                            fill='currentColor'
                        />
                        {/* Today indicator — small white tick */}
                        <div
                            className={`absolute top-1/2 z-[2] h-[14px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                                inWindow
                                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]"
                                    : "bg-white/35"
                            }`}
                            style={{ left: `${todayPct}%` }}
                            aria-hidden
                        />
                    </div>
                </div>
                {/* Start / end only — peak label is above the flame */}
                <div className='flex min-h-[14px] justify-between gap-3 font-mono text-[10px] tabular-nums'>
                    <span className='min-w-0 max-w-[48%] truncate text-left text-white/40'>
                        {dateStart}
                    </span>
                    <span className='min-w-0 max-w-[48%] truncate text-right text-white/40'>
                        {dateEnd}
                    </span>
                </div>
                {todayHint && (
                    <p className='text-center text-[10px] text-white/35'>
                        {todayHint}
                    </p>
                )}
            </div>
        )
    }

    // EXACT: only a single date is meaningful.
    if (exactMs !== null) {
        const delta = daysBetween(today, exactMs)
        const exactLabel =
            delta === 0
                ? t("timelineToday", { defaultValue: "Today" })
                : delta > 0
                  ? t("timelineUpcoming", {
                        days: delta,
                        defaultValue: `in ${delta}d`,
                    })
                  : t("timelinePassed", {
                        days: Math.abs(delta),
                        defaultValue: `${Math.abs(delta)}d ago`,
                    })
        const dateLabel = formatDateIsoForLocale(event.dateIso!, locale)
        const muted = delta < 0
        return (
            <div className='flex items-center gap-2'>
                <div
                    className={`relative h-[10px] w-[10px] rounded-full ${
                        muted
                            ? "bg-white/30"
                            : "bg-amber-300 shadow-[0_0_10px_2px_rgba(252,191,73,0.5)] ring-1 ring-amber-200/40"
                    }`}
                    aria-hidden
                />
                <p
                    className={`font-mono text-[11px] tabular-nums ${
                        muted ? "text-white/40" : "text-white/75"
                    }`}
                >
                    <span>{dateLabel}</span>
                    <span className='ml-2 text-white/40'>·</span>
                    <span className='ml-2 text-white/55'>{exactLabel}</span>
                </p>
            </div>
        )
    }

    // FALLBACK: no ISOs → keep the legacy three-up text row.
    return (
        <div className='grid grid-cols-3 gap-2 font-mono text-[10px] tabular-nums text-white/45'>
            <span>{dateStart}</span>
            <span className='text-center text-amber-200/85'>{datePeak}</span>
            <span className='text-right'>{dateEnd}</span>
        </div>
    )
}

const INITIAL_VISIBLE_EVENTS = 4
const SHOW_MORE_STEP = 4

type DignityBadgeKey = "exalted" | "ownSign" | "debilitated" | "retrograde"

type DignityBadge = {
    key: DignityBadgeKey
    label: string
}

const DIGNITY_BADGE_STYLE: Record<DignityBadgeKey, string> = {
    exalted: "border-amber-300/40 bg-amber-400/12 text-amber-100",
    ownSign: "border-sky-300/40 bg-sky-400/12 text-sky-100",
    debilitated: "border-red-300/40 bg-red-400/12 text-red-100",
    retrograde: "border-white/15 bg-white/[0.06] text-white/70",
}

function buildDignityBadges({
    isExalted,
    isDebilitated,
    isOwnSign,
    isRetrograde,
    t,
}: {
    isExalted: boolean
    isDebilitated: boolean
    isOwnSign: boolean
    isRetrograde: boolean
    t: (key: string, values?: Record<string, string | number>) => string
}): DignityBadge[] {
    const badges: DignityBadge[] = []
    if (isExalted) badges.push({ key: "exalted", label: t("dignity.exalted") })
    if (isDebilitated)
        badges.push({ key: "debilitated", label: t("dignity.debilitated") })
    if (isOwnSign) badges.push({ key: "ownSign", label: t("dignity.ownSign") })
    if (isRetrograde)
        badges.push({ key: "retrograde", label: t("dignity.retrograde") })
    return badges
}

export default function RealtimePlanetaryPanel({
    chartData,
    personalizedTransitAspects,
    personalizedTransitAspectsMerged,
    aspectInsights,
    onAskAspectDetail,
    askedAspectKeys,
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
}) {
    const locale = useLocale()
    const t = useTranslations("PlanetaryPanel")
    const noChartPositionLabel = t("noChartPosition")
    const [hiddenImages, setHiddenImages] = useState<Record<string, boolean>>(
        {},
    )
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_EVENTS)
    const [expandedTechnical, setExpandedTechnical] = useState<
        Record<string, boolean>
    >({})
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

    // Flatten every aspect event into a single priority-ordered list so the
    // panel can cap initial display at 4 cards and reveal more on demand.
    // Order (highest priority first):
    //   1. discussed + high intensity
    //   2. discussed + medium intensity
    //   3. discussed + low intensity
    //   4. discussed without intensity but with impact
    //   5. discussed without impact/intensity
    //   6. undiscussed
    // Within each tier we keep the upstream array order, which is already
    // sorted by tier=main first, then orb.
    const tierBuckets: PanelAspectEvent[][] = [
        discussedEvents.filter((e) => e.intensity === "high"),
        discussedEvents.filter((e) => e.intensity === "medium"),
        discussedEvents.filter((e) => e.intensity === "low"),
        discussedEvents.filter((e) => !e.intensity && e.impact),
        discussedEvents.filter((e) => !e.intensity && !e.impact),
        undiscussedEvents,
    ]
    const orderedEvents: PanelAspectEvent[] = []
    const seenKeys = new Set<string>()
    for (const bucket of tierBuckets) {
        for (const ev of bucket) {
            if (seenKeys.has(ev.aspectKey)) continue
            seenKeys.add(ev.aspectKey)
            orderedEvents.push(ev)
        }
    }
    // Final pass: push Uranus/Neptune/Pluto aspects to the bottom, Jupiter /
    // Saturn to the top, everything else in between. Array.sort is stable so
    // the intensity-bucket order above is preserved within each group.
    orderedEvents.sort(
        (a, b) =>
            transitPlanetPriority(a.transitPlanet) -
            transitPlanetPriority(b.transitPlanet),
    )
    // Drop events whose orb *today* is outside the standard +-5 degree
    // window. The upstream calc emits aspects with multi-month windows
    // anchored on the peak date, so an aspect can be "in range" by date but
    // still 20-30 degrees off orb today — those are not real active
    // aspects and shouldn't crowd out the ones that actually are. When we
    // can't compute today's orb (missing chartData longitude), keep the
    // event so we don't accidentally erase the whole panel.
    const activeEvents = orderedEvents.filter((event) => {
        const orbToday = computeTodayOrbForEvent(event, chartData)
        if (orbToday === null) return true
        return orbToday <= ACTIVE_ORB_DEGREES
    })
    if (activeEvents.length === 0) return null
    const visibleEvents = activeEvents.slice(0, visibleCount)
    const hasMoreEvents = visibleCount < activeEvents.length

    function DignityBadges({ badges }: { badges: DignityBadge[] }) {
        if (badges.length === 0) return null
        return (
            <div className='mt-1.5 flex flex-wrap justify-center gap-1'>
                {badges.map((badge) => (
                    <span
                        key={badge.key}
                        className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium tracking-wide ${DIGNITY_BADGE_STYLE[badge.key]}`}
                    >
                        {badge.label}
                    </span>
                ))}
            </div>
        )
    }

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
        const transitPoint = readTransitPlanetPoint(
            chartData,
            event.transitPlanet,
        )
        const natalPoint = readNatalPlanetPoint(chartData, event.natalPlanet)

        const transitChartPosition = getPlanetPositionFromChartData(
            chartData,
            event.transitPlanet,
        )
        const natalChartPosition = getNatalPlanetPositionFromChartData(
            chartData,
            event.natalPlanet,
        )

        // Show today's transit position (chartData), not the peak-time
        // position the aspect calc snapshots, so the sign/degree matches the
        // planet's *actual* current location. The orb shown alongside is
        // recomputed for today's positions just below so the two never
        // contradict each other; the peak orb / peak date are rendered
        // separately (timeline above + peak row in the technical drawer).
        const transitPosition =
            localizePositionText(transitChartPosition, t) ||
            localizePositionText(event.transitPositionText, t) ||
            formatPositionFromAbsoluteLocalized(
                event.transitAbsoluteLongitude,
                t,
            ) ||
            noChartPositionLabel
        const natalPosition =
            localizePositionText(natalChartPosition, t) ||
            localizePositionText(event.natalPositionText, t) ||
            formatPositionFromAbsoluteLocalized(
                event.natalAbsoluteLongitude,
                t,
            ) ||
            noChartPositionLabel
        const resolvedTransitAbsoluteLongitude =
            toFiniteNumber(transitPoint?.longitude) ??
            parseAbsoluteFromPositionText(transitChartPosition) ??
            toFiniteNumber(event.transitAbsoluteLongitude) ??
            parseAbsoluteFromPositionText(event.transitPositionText)
        const resolvedNatalAbsoluteLongitude =
            toFiniteNumber(natalPoint?.longitude) ??
            parseAbsoluteFromPositionText(natalChartPosition) ??
            toFiniteNumber(event.natalAbsoluteLongitude) ??
            parseAbsoluteFromPositionText(event.natalPositionText)
        // Recompute orb against today's positions so the technical drawer's
        // ORB row matches the sign/degree above it. Fall back to the
        // upstream peak orb only when we couldn't resolve a current
        // transit / natal longitude.
        const currentOrb = computeCurrentOrb(
            resolvedTransitAbsoluteLongitude,
            resolvedNatalAbsoluteLongitude,
            event.aspectAngle,
        )
        const orbForDisplay = currentOrb ?? event.orb
        const peakTransitAbsolute =
            toFiniteNumber(event.transitAbsoluteLongitude) ??
            parseAbsoluteFromPositionText(event.transitPositionText)
        const peakTransitPosition =
            localizePositionText(event.transitPositionText, t) ||
            formatPositionFromAbsoluteLocalized(peakTransitAbsolute, t)
        const peakOrbText = `${event.orb.toFixed(1)}°`
        const showPeakRow = (() => {
            if (peakTransitAbsolute == null) return false
            if (resolvedTransitAbsoluteLongitude == null) return false
            return (
                Math.abs(
                    peakTransitAbsolute -
                        resolvedTransitAbsoluteLongitude,
                ) > 0.05
            )
        })()

        // Dignity is derived from the sign we're actually showing, so the
        // "Debilitated / Own sign / …" chip never disagrees with the sign
        // label above it.
        const transitDisplaySign = canonicalSignName(
            extractSignFromAbsolute(resolvedTransitAbsoluteLongitude) ??
                parseSignFromPositionText(event.transitPositionText) ??
                parseSignFromPositionText(transitChartPosition),
        )
        const natalDisplaySign = canonicalSignName(
            extractSignFromAbsolute(resolvedNatalAbsoluteLongitude) ??
                parseSignFromPositionText(event.natalPositionText) ??
                parseSignFromPositionText(natalChartPosition),
        )
        const transitDignity = transitDisplaySign
            ? getPlanetDignity(event.transitPlanet, transitDisplaySign)
            : { isExalted: false, isDebilitated: false, isOwnSign: false }
        const natalDignity = natalDisplaySign
            ? getPlanetDignity(event.natalPlanet, natalDisplaySign)
            : { isExalted: false, isDebilitated: false, isOwnSign: false }
        // chartData.transit.retrograde describes today's state, which now
        // matches the position we're rendering, so the badge is always
        // applied to "today's" transit.
        const transitRetrograde = Boolean(transitPoint?.retrograde)
        const natalRetrograde = Boolean(natalPoint?.retrograde)
        const transitBadges = buildDignityBadges({
            isExalted: transitDignity.isExalted,
            isDebilitated: transitDignity.isDebilitated,
            isOwnSign: transitDignity.isOwnSign,
            isRetrograde: transitRetrograde,
            t,
        })
        const natalBadges = buildDignityBadges({
            isExalted: natalDignity.isExalted,
            isDebilitated: natalDignity.isDebilitated,
            isOwnSign: natalDignity.isOwnSign,
            isRetrograde: natalRetrograde,
            t,
        })
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
        const natalLabel =
            t(`planets.${event.natalPlanet}`) ?? event.natalPlanet

        return (
            <div className='min-w-[260px] space-y-5 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.035] to-white/[0.015] p-5 transition duration-300 hover:bg-white/[0.045]'>
                <div className='flex flex-wrap items-center gap-1.5'>
                    <span className='inline-flex h-6 items-center gap-1.5 rounded-full border border-violet-300/15 bg-violet-300/[0.06] px-2.5 text-[10px] font-medium tracking-wide text-violet-100/90'>
                        <span className='text-violet-200/55'>
                            {t("impactLabel")}
                        </span>
                        <span className='text-violet-50'>
                            {event.impact || displayKeyword}
                        </span>
                    </span>
                    <span
                        className='inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-medium tracking-wide'
                        style={{
                            borderColor: `${intensityColor}40`,
                            backgroundColor: `${intensityColor}14`,
                            color: intensityColor,
                        }}
                    >
                        <span style={{ color: `${intensityColor}AA` }}>
                            {t("intensityLabel")}
                        </span>
                        <span>{t(`intensity.${intensity}`)}</span>
                    </span>
                </div>

                <div className='grid grid-cols-[1fr_auto_1fr] items-start gap-3'>
                    <div className='min-w-0 text-center'>
                        <div className='mx-auto mb-2 inline-flex'>
                            <span className='relative inline-flex h-[44px] w-[44px] items-center justify-center rounded-full ring-1 ring-white/10'>
                                <PlanetAvatar planet={event.transitPlanet} />
                            </span>
                        </div>
                        <p className='truncate text-[13px] font-medium tracking-tight text-white'>
                            {transitLabel}
                        </p>
                        <p className='text-[10px] tracking-wide text-white/35'>
                            {t("transitSuffix")}
                        </p>
                        <DignityBadges badges={transitBadges} />
                    </div>
                    <div className='flex flex-col items-center gap-1 pt-3 text-cyan-200/85'>
                        <AspectIcon aspectType={event.aspectType} />
                        <span className='text-[10px] font-medium uppercase tracking-[0.18em]'>
                            {t(`aspects.${event.aspectType}`) ??
                                event.aspectType}
                        </span>
                    </div>
                    <div className='min-w-0 text-center'>
                        <div className='mx-auto mb-2 inline-flex'>
                            <span className='relative inline-flex h-[44px] w-[44px] items-center justify-center rounded-full ring-1 ring-white/10'>
                                <PlanetAvatar planet={event.natalPlanet} />
                            </span>
                        </div>
                        <p className='truncate text-[13px] font-medium tracking-tight text-white'>
                            {natalLabel}
                        </p>
                        <p className='text-[10px] tracking-wide text-white/35'>
                            {t("natalSuffix")}
                        </p>
                        <DignityBadges badges={natalBadges} />
                    </div>
                </div>

                <blockquote className='border-l border-white/15 pl-3'>
                    <p className='font-serif text-[13.5px] italic leading-[1.65] text-white/82'>
                        {event.insight ||
                            (hasRealKeyword
                                ? displayKeyword
                                : t("defaultInsight"))}
                    </p>
                </blockquote>

                <AspectTimeline
                    event={event}
                    dateStart={dateStart}
                    datePeak={datePeak}
                    dateEnd={dateEnd}
                    locale={locale}
                    t={t}
                />

                <div className='flex items-center justify-between gap-2 pt-1'>
                    <button
                        type='button'
                        onClick={() =>
                            setExpandedTechnical((prev) => ({
                                ...prev,
                                [event.aspectKey]: !prev[event.aspectKey],
                            }))
                        }
                        className='text-[11px] text-white/40 underline decoration-white/10 underline-offset-4 transition-colors hover:text-white/70'
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
                            className='inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 text-[11px] font-medium text-emerald-100 transition-colors hover:bg-emerald-500/15'
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
                            className='inline-flex h-8 items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/[0.08] px-3 text-[11px] font-medium text-indigo-100 transition-colors hover:bg-indigo-500/15'
                        >
                            <Sparkles className='h-3.5 w-3.5 text-indigo-300' />
                            <span>{t("askMore")}</span>
                            <span className='ml-1 inline-flex items-center gap-0.5 text-amber-200/90'>
                                <Star className='h-3 w-3 fill-amber-300 text-amber-300' />
                                <span>1</span>
                            </span>
                        </button>
                    )}
                </div>

                {isTechnicalExpanded && (
                    <dl className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 font-mono text-[10px] tabular-nums'>
                        <dt className='uppercase tracking-[0.18em] text-white/35'>
                            {t("transitSuffix")}
                        </dt>
                        <dd className='text-white/65'>
                            <span>{transitPosition}</span>
                            <span className='ml-1.5 text-white/30'>
                                ({transitAbsoluteText})
                            </span>
                        </dd>
                        <dt className='uppercase tracking-[0.18em] text-white/35'>
                            {t("natalSuffix")}
                        </dt>
                        <dd className='text-white/65'>
                            <span>{natalPosition}</span>
                            <span className='ml-1.5 text-white/30'>
                                ({natalAbsoluteText})
                            </span>
                        </dd>
                        <dt className='uppercase tracking-[0.18em] text-white/35'>
                            {t("orbLabel")}
                        </dt>
                        <dd className='text-white/65'>{`${orbForDisplay.toFixed(1)}°`}</dd>
                        {showPeakRow && peakTransitPosition ? (
                            <>
                                <dt className='uppercase tracking-[0.18em] text-white/35'>
                                    {t("peakLabel")}
                                </dt>
                                <dd className='text-white/65'>
                                    <span>{peakTransitPosition}</span>
                                    <span className='ml-1.5 text-white/30'>
                                        ({peakOrbText})
                                    </span>
                                </dd>
                            </>
                        ) : null}
                    </dl>
                )}
            </div>
        )
    }

    return (
        <div className='space-y-5'>
            {visibleEvents.length > 0 && (
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    {visibleEvents.map((event) => (
                        <EventCard key={event.aspectKey} event={event} />
                    ))}
                </div>
            )}

            {hasMoreEvents && (
                <div className='flex justify-center'>
                    <button
                        type='button'
                        onClick={() =>
                            setVisibleCount((count) =>
                                Math.min(
                                    count + SHOW_MORE_STEP,
                                    activeEvents.length,
                                ),
                            )
                        }
                        className='inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:text-white hover:border-white/30 transition-colors'
                    >
                        + {t("showMore")}
                    </button>
                </div>
            )}
        </div>
    )
}
