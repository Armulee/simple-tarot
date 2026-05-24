"use client"

import { useMemo } from "react"
import Image from "next/image"
import { Sparkles } from "lucide-react"
import { useFormatter, useTranslations } from "next-intl"
import { PLANET_IMAGE_ASSETS } from "@/lib/astrology/planet-images"
import { getPlanetDignity } from "@/lib/birth-chart-utils"

type TransitPlanet = {
    sign: string
    degree: number
    longitude: number
    speed?: number
    retrograde?: boolean
}

type TransitChart = {
    planets?: Record<string, TransitPlanet>
}

type PlanetGridDate = {
    day?: number | null
    month?: number | null
    year?: number | null
} | null

type TransitChartData = {
    birth?: {
        date?: PlanetGridDate
    } | null
    charts?: TransitChart[] | null
    transit?: {
        date?: PlanetGridDate
        charts?: TransitChart[] | null
    } | null
} | null

export type PlanetGridSource = "transit" | "natal"

const ZODIAC_CANONICAL: ReadonlyArray<string> = [
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

// Map common sign aliases (Thai/Lao/abbreviations from upstream calc) back to
// the canonical English key so translations resolve.
const ZODIAC_ALIAS: Record<string, string> = {
    เมษ: "Aries",
    พฤษภ: "Taurus",
    มิถุน: "Gemini",
    กรกฎ: "Cancer",
    สิงห์: "Leo",
    กันย์: "Virgo",
    ตุลย์: "Libra",
    พิจิก: "Scorpio",
    ธนู: "Sagittarius",
    มกร: "Capricorn",
    กุมภ์: "Aquarius",
    มีน: "Pisces",
}

function canonicalSign(sign: string): string {
    if (ZODIAC_CANONICAL.includes(sign)) return sign
    return ZODIAC_ALIAS[sign] ?? sign
}

function formatSignDegree(deg: number): string {
    if (!Number.isFinite(deg)) return "—"
    return `${deg.toFixed(1)}°`
}

function formatLongitude(lng: number): string {
    if (!Number.isFinite(lng)) return "—"
    return `${lng.toFixed(2)}°`
}

// Planet display order — luminaries first, then inner → outer, then nodes.
const PLANET_ORDER = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
    "Rahu",
    "Ketu",
    "Chiron",
]

function planetOrderIndex(planet: string): number {
    const i = PLANET_ORDER.indexOf(planet)
    return i === -1 ? PLANET_ORDER.length : i
}

type DignityKind = "exalted" | "ownSign" | "debilitated" | "retrograde" | null

function resolveDignityKind(args: {
    isExalted: boolean
    isOwnSign: boolean
    isDebilitated: boolean
    isRetrograde: boolean
}): DignityKind {
    if (args.isRetrograde) return "retrograde"
    if (args.isExalted) return "exalted"
    if (args.isOwnSign) return "ownSign"
    if (args.isDebilitated) return "debilitated"
    return null
}

type DignityStyle = {
    ring: string
    aura: string
    name: string
    sign: string
    badgeBorder: string
    badgeBg: string
    badgeText: string
    cardTint: string
    cardBorder: string
    glow: string
}

const DIGNITY_STYLE: Record<NonNullable<DignityKind>, DignityStyle> = {
    exalted: {
        ring: "ring-1 ring-amber-300/70",
        aura: "shadow-[0_0_24px_rgba(251,191,36,0.55)]",
        name: "text-amber-200",
        sign: "text-amber-100/85",
        badgeBorder: "border-amber-300/40",
        badgeBg: "bg-amber-400/12",
        badgeText: "text-amber-100",
        cardTint: "from-amber-400/[0.10] via-amber-500/[0.04] to-transparent",
        cardBorder: "border-amber-300/20",
        glow: "bg-amber-400/[0.10]",
    },
    ownSign: {
        ring: "ring-1 ring-sky-300/70",
        aura: "shadow-[0_0_22px_rgba(56,189,248,0.5)]",
        name: "text-sky-200",
        sign: "text-sky-100/85",
        badgeBorder: "border-sky-300/40",
        badgeBg: "bg-sky-400/12",
        badgeText: "text-sky-100",
        cardTint: "from-sky-400/[0.10] via-sky-500/[0.04] to-transparent",
        cardBorder: "border-sky-300/20",
        glow: "bg-sky-400/[0.10]",
    },
    debilitated: {
        ring: "ring-1 ring-red-300/70",
        aura: "shadow-[0_0_20px_rgba(248,113,113,0.45)]",
        name: "text-red-200",
        sign: "text-red-100/85",
        badgeBorder: "border-red-300/40",
        badgeBg: "bg-red-400/12",
        badgeText: "text-red-100",
        cardTint: "from-red-400/[0.10] via-red-500/[0.04] to-transparent",
        cardBorder: "border-red-300/20",
        glow: "bg-red-400/[0.10]",
    },
    retrograde: {
        ring: "ring-1 ring-white/15",
        aura: "shadow-none",
        name: "text-white/65",
        sign: "text-white/55",
        badgeBorder: "border-white/15",
        badgeBg: "bg-white/[0.05]",
        badgeText: "text-white/65",
        cardTint: "from-white/[0.04] via-transparent to-transparent",
        cardBorder: "border-white/10",
        glow: "bg-white/[0.04]",
    },
}

const NEUTRAL_STYLE: DignityStyle = {
    ring: "ring-1 ring-white/10",
    aura: "shadow-[0_8px_24px_-12px_rgba(129,140,248,0.5)]",
    name: "text-white/92",
    sign: "text-white/70",
    badgeBorder: "border-indigo-300/25",
    badgeBg: "bg-indigo-400/10",
    badgeText: "text-indigo-100/85",
    cardTint: "from-indigo-500/[0.06] via-purple-500/[0.04] to-cyan-500/[0.03]",
    cardBorder: "border-white/[0.07]",
    glow: "bg-indigo-400/[0.08]",
}

function GridShell({
    title,
    dateLabel,
    children,
    count,
}: {
    title: string
    dateLabel?: string | null
    count?: number
    children: React.ReactNode
}) {
    return (
        <section className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                    <span className='relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-indigo-300/30 bg-indigo-500/15 text-indigo-200 shadow-[0_0_12px_-2px_rgba(129,140,248,0.55)]'>
                        <Sparkles className='h-3 w-3' />
                    </span>
                    <h3 className='bg-gradient-to-r from-indigo-200 via-violet-200 to-cyan-200 bg-clip-text text-[12px] font-semibold uppercase tracking-[0.22em] text-transparent'>
                        {title}
                    </h3>
                    {typeof count === "number" && (
                        <span className='inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-1.5 text-[10px] font-medium text-white/60'>
                            {count}
                        </span>
                    )}
                </div>
                {dateLabel && (
                    <span className='inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] tracking-wide text-white/65 backdrop-blur-sm'>
                        {dateLabel}
                    </span>
                )}
            </div>
            {children}
        </section>
    )
}

function SkeletonGrid({
    title,
    hideHeader,
}: {
    title: string
    hideHeader?: boolean
}) {
    const placeholders = Array.from({ length: 9 })
    const grid = (
        <ul className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {placeholders.map((_, i) => (
                <li
                    key={i}
                    className='flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3.5'
                >
                    <div className='h-[52px] w-[52px] shrink-0 animate-pulse rounded-full bg-white/[0.06] ring-1 ring-white/10' />
                    <div className='flex-1 space-y-2 pt-1'>
                        <div className='h-3 w-1/2 animate-pulse rounded bg-white/[0.06]' />
                        <div className='h-2.5 w-2/3 animate-pulse rounded bg-white/[0.04]' />
                        <div className='h-2 w-1/3 animate-pulse rounded bg-white/[0.03]' />
                    </div>
                </li>
            ))}
        </ul>
    )
    if (hideHeader) return grid
    return <GridShell title={title}>{grid}</GridShell>
}

export default function TransitPlanetGrid({
    chartData,
    source = "transit",
    hideHeader = false,
}: {
    chartData: TransitChartData | Record<string, unknown> | null | undefined
    source?: PlanetGridSource
    /**
     * When true, render the planet cards without the built-in section header
     * (sparkle pill, title, date pill, count). Use when the grid is wrapped in
     * a parent that already provides a header (e.g. a collapsible box).
     */
    hideHeader?: boolean
}) {
    const tAstro = useTranslations("BirthChart")
    const tTransit = useTranslations("HoroscopeChat.transit")
    const formatter = useFormatter()

    const data = (chartData ?? null) as TransitChartData

    const title =
        source === "natal" ? tAstro("tabBirthChart") : tTransit("feedTitle")

    const planets = useMemo(() => {
        const raw =
            source === "natal"
                ? data?.charts?.[0]?.planets
                : data?.transit?.charts?.[0]?.planets
        if (!raw) return [] as Array<[string, TransitPlanet]>
        return Object.entries(raw).sort(
            ([a], [b]) => planetOrderIndex(a) - planetOrderIndex(b),
        )
    }, [data, source])

    const dateLabel = useMemo(() => {
        const d =
            source === "natal" ? data?.birth?.date : data?.transit?.date
        if (!d?.day || !d?.month || !d?.year) return null
        try {
            const utc = new Date(
                Date.UTC(d.year, (d.month ?? 1) - 1, d.day ?? 1, 12, 0, 0),
            )
            if (Number.isNaN(utc.getTime())) return null
            return formatter.dateTime(utc, {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            })
        } catch {
            return null
        }
    }, [data, formatter, source])

    if (planets.length === 0) {
        return <SkeletonGrid title={title} hideHeader={hideHeader} />
    }

    const list = (
        <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                {planets.map(([planet, point], idx) => {
                    const planetName = tAstro(`planets.${planet}`, {
                        defaultValue: planet,
                    })
                    const canonical = canonicalSign(point.sign)
                    const signName = tAstro(`zodiacSigns.${canonical}`, {
                        defaultValue: point.sign,
                    })
                    const imageSrc = PLANET_IMAGE_ASSETS[planet]
                    const isRetrograde = Boolean(point.retrograde)
                    const dignity = getPlanetDignity(planet, canonical)
                    const kind = resolveDignityKind({
                        ...dignity,
                        isRetrograde,
                    })
                    const style = kind ? DIGNITY_STYLE[kind] : NEUTRAL_STYLE

                    const statusBits: Array<{ key: string; label: string }> = []
                    if (dignity.isExalted) {
                        statusBits.push({
                            key: "exalted",
                            label: tAstro("stats.status.exalted"),
                        })
                    }
                    if (dignity.isDebilitated) {
                        statusBits.push({
                            key: "debilitated",
                            label: tAstro("stats.status.debilitated"),
                        })
                    }
                    if (dignity.isOwnSign) {
                        statusBits.push({
                            key: "ownSign",
                            label: tAstro("stats.status.ownSign"),
                        })
                    }
                    if (isRetrograde) {
                        statusBits.push({
                            key: "retrograde",
                            label: tAstro("stats.status.retrograde"),
                        })
                    }

                    return (
                        <li
                            key={planet}
                            style={{
                                animationDelay: `${Math.min(idx * 40, 320)}ms`,
                            }}
                            className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border ${style.cardBorder} bg-gradient-to-br ${style.cardTint} px-3.5 py-3.5 backdrop-blur-sm transition duration-300 animate-fade-in hover:-translate-y-0.5 hover:bg-white/[0.03] hover:shadow-[0_14px_36px_-22px_rgba(129,140,248,0.55)]`}
                        >
                            <span
                                aria-hidden
                                className={`pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl ${style.glow}`}
                            />
                            <div className='relative shrink-0'>
                                {imageSrc ? (
                                    <Image
                                        src={imageSrc}
                                        alt={planetName}
                                        width={56}
                                        height={56}
                                        className={`h-[56px] w-[56px] rounded-full object-cover transition duration-500 ${style.ring} ${style.aura} group-hover:scale-[1.04] ${
                                            planet === "Ketu" ? "rotate-90" : ""
                                        }`}
                                    />
                                ) : (
                                    <div
                                        className={`flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-white/70 ${style.ring} ${style.aura}`}
                                    >
                                        {planet.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className='relative min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5'>
                                    <p
                                        className={`truncate text-[14px] font-semibold leading-tight ${style.name}`}
                                    >
                                        {planetName}
                                    </p>
                                </div>
                                <div className='mt-1 flex items-baseline gap-1.5'>
                                    <span
                                        className={`truncate text-[12px] font-medium ${style.sign}`}
                                    >
                                        {signName}
                                    </span>
                                    <span className='text-white/30'>·</span>
                                    <span className='font-mono text-[13px] font-semibold tabular-nums text-white/85'>
                                        {formatSignDegree(point.degree)}
                                    </span>
                                </div>
                                <p className='mt-0.5 font-mono text-[10px] tabular-nums tracking-tight text-white/35'>
                                    {formatLongitude(point.longitude)}
                                </p>
                                {statusBits.length > 0 && (
                                    <div className='mt-2 flex flex-wrap gap-1.5'>
                                        {statusBits.map((bit) => {
                                            const bitStyle =
                                                DIGNITY_STYLE[
                                                    bit.key as NonNullable<DignityKind>
                                                ]
                                            return (
                                                <span
                                                    key={bit.key}
                                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${bitStyle.badgeBorder} ${bitStyle.badgeBg} ${bitStyle.badgeText}`}
                                                >
                                                    {bit.label}
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </li>
                    )
                })}
        </ul>
    )

    if (hideHeader) return list

    return (
        <GridShell
            title={title}
            dateLabel={dateLabel}
            count={planets.length}
        >
            {list}
        </GridShell>
    )
}
