import type { Metadata } from "next"
import Link from "next/link"
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    MapPin,
    Sparkles,
    SunMedium,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type ChartPayload = {
    id: string
    generatedAt?: string
    input: {
        day: string
        month: string
        year: string
        hour: string
        minute: string
        timezone: number
        lat: string
        lng: string
    }
    chart: {
        houses?: unknown
        planets?: unknown
    }
}

type BirthChartPageProps = {
    params: { locale: string; id: string }
    searchParams: Record<string, string | string[] | undefined>
}

type PlacementCard = {
    title: string
    subtitle?: string
    detailLines: string[]
    raw: unknown
}

export const metadata: Metadata = {
    title: "Birth Chart | Asking Fate",
    description:
        "Dive into your natal chart breakdown with precise planetary placements, houses, and ascendant insights.",
}

function decodePayload(
    value: string | string[] | undefined
): ChartPayload | null {
    if (!value) return null
    const raw = Array.isArray(value) ? value[0] : value
    if (!raw) return null
    try {
        const parsed = JSON.parse(decodeURIComponent(raw))
        if (!parsed?.chart) return null
        return parsed as ChartPayload
    } catch {
        return null
    }
}

function toTitleCase(input: string) {
    return input
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatTimezone(offset: number) {
    const sign = offset >= 0 ? "+" : "-"
    const absolute = Math.abs(offset)
    const hours = Math.floor(absolute)
    const minutes = Math.round((absolute - hours) * 60)
    return `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`
}

function buildCard(title: string, value: unknown): PlacementCard {
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>
        const sign =
            typeof record.sign === "string"
                ? record.sign
                : typeof record.rashi === "string"
                  ? record.rashi
                  : undefined
        const house =
            typeof record.house === "number"
                ? record.house
                : typeof record.houseNumber === "number"
                  ? record.houseNumber
                  : undefined
        const degree =
            typeof record.degree === "number"
                ? `${record.degree.toFixed(2)}°`
                : typeof record.longitude === "number"
                  ? `${Number(record.longitude).toFixed(2)}°`
                  : undefined
        const occupants = Array.isArray(record.planets)
            ? record.planets
            : typeof record.planet === "string"
              ? [record.planet]
              : undefined

        const subtitle = [sign, house ? `House ${house}` : undefined]
            .filter(Boolean)
            .join(" • ")

        const detailLines = [
            degree ? `Longitude ${degree}` : undefined,
            occupants && occupants.length
                ? `Planets: ${occupants.join(", ")}`
                : undefined,
        ].filter(Boolean) as string[]

        return { title, subtitle, detailLines, raw: value }
    }

    return { title, subtitle: undefined, detailLines: [], raw: value }
}

function extractHouseCards(source: unknown): PlacementCard[] {
    if (!source) return []
    if (Array.isArray(source)) {
        return source.map((entry, index) =>
            buildCard(`House ${index + 1}`, entry)
        )
    }
    if (typeof source === "object") {
        return Object.entries(source as Record<string, unknown>).map(
            ([key, value]) =>
                buildCard(/^\d+$/.test(key) ? `House ${key}` : toTitleCase(key), value)
        )
    }
    return []
}

function extractPlanetCards(source: unknown): PlacementCard[] {
    if (!source) return []
    if (Array.isArray(source)) {
        return source.map((entry, index) =>
            buildCard(`Planet ${index + 1}`, entry)
        )
    }
    if (typeof source === "object") {
        return Object.entries(source as Record<string, unknown>).map(
            ([key, value]) => buildCard(toTitleCase(key), value)
        )
    }
    return []
}

function formatDateParts({
    day,
    month,
    year,
}: {
    day: string
    month: string
    year: string
}) {
    return `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`
}

function formatTimeParts({
    hour,
    minute,
}: {
    hour: string
    minute: string
}) {
    return `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`
}

export default function BirthChartResultPage({
    params,
    searchParams,
}: BirthChartPageProps) {
    const payload = decodePayload(searchParams.data)

    if (!payload) {
        return (
            <div className='relative min-h-[calc(100vh-64px)] bg-[#040111] text-white flex items-center justify-center px-6 py-16'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-950/50 pointer-events-none' />
                <div className='relative max-w-lg w-full space-y-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-3xl p-10 text-center'>
                    <div className='inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.4em] text-white/70'>
                        <Sparkles className='mr-2 h-4 w-4 text-cosmic-gold' />
                        Birth Chart
                    </div>
                    <h1 className='font-serif text-3xl'>Chart link expired</h1>
                    <p className='text-white/70'>
                        We could not find the birth chart data attached to this
                        link. Start a fresh chart to explore your placements again.
                    </p>
                    <Button
                        asChild
                        className='w-full bg-gradient-to-r from-cosmic-purple to-cosmic-blue border-none'
                    >
                        <Link href={`/${params.locale}`}>Start again</Link>
                    </Button>
                </div>
            </div>
        )
    }

    const houses = extractHouseCards(payload.chart?.houses)
    const planets = extractPlanetCards(payload.chart?.planets)
    const dateLabel = formatDateParts(payload.input)
    const timeLabel = formatTimeParts(payload.input)
    const timezoneLabel = formatTimezone(payload.input.timezone)
    const coordinatesAvailable =
        payload.input.lat !== "0" || payload.input.lng !== "0"
    const coordinateLabel = coordinatesAvailable
        ? `${payload.input.lat}°, ${payload.input.lng}°`
        : "Greenwich Meridian • 0°N 0°E"
    const generatedStamp = payload.generatedAt
        ? new Date(payload.generatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : null

    return (
        <div className='relative min-h-[calc(100vh-64px)] bg-[#030112] text-white overflow-x-hidden'>
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(103,74,255,0.35),_transparent_55%)]' />
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.07),_transparent_35%)]' />
            <div className='relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12'>
                <div className='flex flex-col gap-6'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <div className='space-y-4'>
                            <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/70 text-[11px] tracking-[0.3em] uppercase'>
                                <SunMedium className='w-4 h-4 text-cosmic-gold' />
                                Chart #{payload.id.slice(0, 8)}
                            </span>
                            <div className='space-y-3'>
                                <h1 className='font-serif text-4xl sm:text-5xl leading-tight'>
                                    Your natal blueprint
                                </h1>
                                <p className='text-white/70 max-w-2xl'>
                                    Dive into the key placements derived from your
                                    exact birth moment. Use this snapshot to explore
                                    trends, transits, and personal mythology.
                                </p>
                            </div>
                        </div>
                        <Button
                            asChild
                            variant='outline'
                            className='border-white/30 bg-white/5 text-white/80 hover:bg-white/10'
                        >
                            <Link href={`/${params.locale}`}>
                                <ArrowLeft className='mr-2 h-4 w-4' />
                                Back to home
                            </Link>
                        </Button>
                    </div>
                    {generatedStamp && (
                        <p className='text-sm text-white/60'>
                            Generated on {generatedStamp}
                        </p>
                    )}
                </div>

                <section className='grid gap-6 lg:grid-cols-2'>
                    <div className='rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 space-y-6 shadow-[0_20px_80px_rgba(93,60,255,0.35)]'>
                        <div className='flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-white/60'>
                            <CalendarDays className='h-4 w-4 text-cosmic-purple' />
                            Birth moment
                        </div>
                        <div className='space-y-2'>
                            <p className='text-3xl font-serif'>{dateLabel}</p>
                            <p className='text-xl text-white/80'>
                                {timeLabel} &middot; {timezoneLabel}
                            </p>
                        </div>
                        <div className='text-white/70 text-sm leading-relaxed'>
                            Accuracy to the minute lets us derive precise ascendant,
                            lunar mansion, and planetary degrees for this chart.
                        </div>
                    </div>
                    <div className='rounded-3xl border border-white/10 bg-gradient-to-br from-cosmic-purple/30 via-indigo-500/10 to-transparent backdrop-blur-2xl p-8 space-y-6 shadow-[0_20px_70px_rgba(16,17,48,0.7)]'>
                        <div className='flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-white/70'>
                            <MapPin className='h-4 w-4 text-cosmic-gold' />
                            Reference sky
                        </div>
                        <div className='space-y-2'>
                            <p className='text-2xl font-serif'>
                                {coordinatesAvailable
                                    ? "Pinned coordinates"
                                    : "Default meridian"}
                            </p>
                            <p className='text-white/80'>{coordinateLabel}</p>
                        </div>
                        <p className='text-white/70 text-sm leading-relaxed'>
                            Location sets the horizon and ascendant. Update the chart
                            from the homepage if you need a different birthplace.
                        </p>
                    </div>
                </section>

                {houses.length > 0 && (
                    <section className='space-y-4'>
                        <div className='flex items-center justify-between flex-wrap gap-3'>
                            <h2 className='text-2xl font-serif'>House placements</h2>
                            <p className='text-sm text-white/60'>
                                {houses.length} houses detected
                            </p>
                        </div>
                        <div className='grid gap-4 md:grid-cols-2'>
                            {houses.map((house) => (
                                <div
                                    key={house.title}
                                    className='rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-3'
                                >
                                    <div className='text-sm text-white/60 uppercase tracking-[0.2em]'>
                                        {house.title}
                                    </div>
                                    {house.subtitle && (
                                        <p className='text-lg text-white'>{house.subtitle}</p>
                                    )}
                                    {house.detailLines.length > 0 && (
                                        <ul className='text-white/70 text-sm space-y-1'>
                                            {house.detailLines.map((detail) => (
                                                <li key={detail}>{detail}</li>
                                            ))}
                                        </ul>
                                    )}
                                    <pre className='mt-4 rounded-xl bg-black/40 border border-white/5 p-3 text-[11px] leading-relaxed text-white/70 overflow-x-auto'>
                                        {JSON.stringify(house.raw, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {planets.length > 0 && (
                    <section className='space-y-4'>
                        <div className='flex items-center justify-between flex-wrap gap-3'>
                            <h2 className='text-2xl font-serif'>Planetary lineup</h2>
                            <p className='text-sm text-white/60'>
                                {planets.length} bodies tracked
                            </p>
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                            {planets.map((planet) => (
                                <div
                                    key={planet.title}
                                    className='rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-2'
                                >
                                    <div className='text-sm uppercase tracking-[0.2em] text-white/60'>
                                        {planet.title}
                                    </div>
                                    {planet.subtitle && (
                                        <p className='text-lg font-medium text-white'>
                                            {planet.subtitle}
                                        </p>
                                    )}
                                    {planet.detailLines.length > 0 && (
                                        <ul className='text-white/70 text-sm space-y-1'>
                                            {planet.detailLines.map((detail) => (
                                                <li key={detail}>{detail}</li>
                                            ))}
                                        </ul>
                                    )}
                                    <pre className='mt-3 rounded-xl bg-black/40 border border-white/5 p-3 text-[11px] leading-relaxed text-white/70 overflow-x-auto'>
                                        {JSON.stringify(planet.raw, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {!houses.length && !planets.length && (
                    <section className='rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 text-center space-y-4'>
                        <h2 className='font-serif text-2xl'>
                            Awaiting celestial data
                        </h2>
                        <p className='text-white/70 max-w-2xl mx-auto'>
                            We generated your chart but could not display its breakdown.
                            Try generating again with a fresh request to unlock every
                            placement.
                        </p>
                        <Button
                            asChild
                            className='bg-gradient-to-r from-cosmic-purple to-cosmic-blue border-none'
                        >
                            <Link href={`/${params.locale}`}>Regenerate chart</Link>
                        </Button>
                    </section>
                )}
            </div>
        </div>
    )
}
