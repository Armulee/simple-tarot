"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Sun,
    Moon,
    Zap,
    Heart,
    Flame,
    ArrowUpRight,
    Shield,
    Target,
    History,
    User,
    Home,
    Coins,
    MessageSquare,
    Star,
    Activity,
    Users,
    Infinity,
    Compass,
    Briefcase,
    Trophy,
    CloudMoon,
    Sparkles,
    MapPin,
    Clock,
    Calendar as CalendarIcon,
} from "lucide-react"
import { getPlanetDignity } from "@/lib/birth-chart-utils"
import { getPlanetMeaning } from "@/lib/astrology/meanings"
import type { AstrologySystem } from "@/lib/astrology/types"

const PLANET_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    Ascendant: User,
    Sun,
    Moon,
    Mercury: Zap,
    Venus: Heart,
    Mars: Flame,
    Jupiter: ArrowUpRight,
    Saturn: Shield,
    Rahu: Target,
    Ketu: History,
}

const HOUSE_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    "1": User,
    "2": Coins,
    "3": MessageSquare,
    "4": Home,
    "5": Star,
    "6": Activity,
    "7": Users,
    "8": Infinity,
    "9": Compass,
    "10": Briefcase,
    "11": Trophy,
    "12": CloudMoon,
}

const PLANET_ORDER = [
    "Ascendant",
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
    "Ketu",
]

type AstrologyPoint = {
    sign: string
    degree: number
    longitude: number
    speed?: number
    retrograde?: boolean
}

type AstrologyHouse = {
    sign: string
    degree: number
    longitude: number
}

type ChartData = {
    birth?: {
        date?: { day: number; month: number; year: number }
        time?: {
            hour: number
            minute: number
            approximate?: boolean
        }
        location?: {
            country?: string | null
            state?: string | null
        }
    }
    charts?: Array<{
        system?: string
        ayanamsa?: number | null
        ascendant?: AstrologyPoint
        mc?: AstrologyPoint
        planets?: Record<string, AstrologyPoint>
        houses?: Record<string, AstrologyHouse>
    }>
    transit?: {
        date?: {
            day?: number | null
            month?: number | null
            year?: number | null
            hour?: number | null
            minute?: number | null
        }
        location?: {
            country?: string | null
            state?: string | null
        }
        charts?: Array<{
            system?: string
            ayanamsa?: number | null
            ascendant?: AstrologyPoint
            mc?: AstrologyPoint
            planets?: Record<string, AstrologyPoint>
            houses?: Record<string, AstrologyHouse>
        }>
    } | null
}

function formatDegree(deg: number) {
    return `${Math.floor(deg)}°${Math.round((deg % 1) * 60)}′`
}

function formatDate(d: {
    day: number
    month: number
    year: number
    hour: number
    minute: number
}) {
    const date = new Date(d.year, d.month - 1, d.day)
    const dateStr = date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    })
    const h = d.hour
    const ampm = h >= 12 ? "PM" : "AM"
    const displayHour = h % 12 || 12
    const timeStr = `${displayHour}:${String(d.minute).padStart(2, "0")} ${ampm}`
    return { dateStr, timeStr }
}

function getOrdinalSuffix(i: number) {
    const j = i % 10,
        k = i % 100
    if (j === 1 && k !== 11) return "st"
    if (j === 2 && k !== 12) return "nd"
    if (j === 3 && k !== 13) return "rd"
    return "th"
}

function SystemBadgePopover({
    currentSystem,
    onSelect,
    t,
}: {
    currentSystem: AstrologySystem
    onSelect: (system: AstrologySystem) => void
    t: (key: string) => string
}) {
    const [open, setOpen] = useState(false)
    const label =
        currentSystem === "western_tropical"
            ? t("systemWestern")
            : t("systemVedic")
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type='button'
                    className='shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 hover:text-white transition-colors'
                >
                    {label}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align='end'
                className='w-48 rounded-xl border-white/10 bg-[#0A0F26] p-2'
            >
                <div className='space-y-1'>
                    <button
                        type='button'
                        onClick={() => {
                            onSelect("western_tropical")
                            setOpen(false)
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            currentSystem === "western_tropical"
                                ? "bg-primary/20 text-primary"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {t("systemWestern")}
                    </button>
                    <button
                        type='button'
                        onClick={() => {
                            onSelect("vedic_sidereal")
                            setOpen(false)
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            currentSystem === "vedic_sidereal"
                                ? "bg-primary/20 text-primary"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {t("systemVedic")}
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function isInterestedPoint(
    planet: string,
    p: AstrologyPoint,
    dignity: { isExalted: boolean; isDebilitated: boolean; isOwnSign: boolean },
): boolean {
    if (planet === "Ascendant") return true
    if (planet === "Sun" || planet === "Moon") return true
    return (
        dignity.isExalted ||
        dignity.isDebilitated ||
        dignity.isOwnSign ||
        (p.retrograde ?? false)
    )
}

export function BirthChartCard({
    chartData,
    planetMeanings,
    houseMeanings,
    onRefetchWithSystem,
}: {
    chartData: ChartData
    question?: string | null
    planetMeanings?: Record<string, string>
    houseMeanings?: Record<string, string>
    onRefetchWithSystem?: (system: AstrologySystem) => void
}) {
    const t = useTranslations("BirthChart")
    const [activeTab, setActiveTab] = useState<"birth" | "transit">("birth")
    const hasTransit = Boolean(
        chartData?.transit?.charts?.length &&
            chartData.transit?.date?.day &&
            chartData.transit?.date?.month &&
            chartData.transit?.date?.year,
    )
    const chart =
        activeTab === "transit" && hasTransit
            ? chartData!.transit!.charts![0]
            : chartData?.charts?.[0]
    if (!chart?.planets) return null

    const birth = chartData.birth
    const transit = chartData.transit
    const isBirthTab = activeTab === "birth" || !hasTransit
    const contextDate = isBirthTab
        ? birth?.date && birth?.time
            ? {
                  day: birth.date.day,
                  month: birth.date.month,
                  year: birth.date.year,
                  hour: birth!.time!.hour,
                  minute: birth!.time!.minute,
              }
            : null
        : transit?.date?.day && transit?.date?.month && transit?.date?.year
          ? {
                day: transit.date.day,
                month: transit.date.month,
                year: transit.date.year,
                hour: transit.date.hour ?? 12,
                minute: transit.date.minute ?? 0,
            }
          : null
    const { dateStr, timeStr } = contextDate
        ? formatDate(contextDate)
        : { dateStr: "", timeStr: "" }
    const contextLocation = isBirthTab ? birth?.location : transit?.location
    const locationLabel = [contextLocation?.state, contextLocation?.country]
        .filter(Boolean)
        .join(", ")

    const hasQuestionRelevantPlanets =
        planetMeanings && Object.keys(planetMeanings).length > 0
    const planetsToShow = PLANET_ORDER.filter((key) => {
        const p = chart.planets?.[key]
        if (!p) return false
        if (hasQuestionRelevantPlanets) {
            return key in (planetMeanings ?? {})
        }
        const dignity = getPlanetDignity(key, p.sign)
        return isInterestedPoint(key, p, dignity)
    })

    return (
        <div className='space-y-8 pb-4'>
            {hasTransit && (
                <div className='flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1'>
                    <button
                        type='button'
                        onClick={() => setActiveTab("birth")}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === "birth"
                                ? "bg-primary/20 text-primary"
                                : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        {t("tabBirthChart")}
                    </button>
                    <button
                        type='button'
                        onClick={() => setActiveTab("transit")}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                            activeTab === "transit"
                                ? "bg-primary/20 text-primary"
                                : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        {t("tabTransitChart")}
                    </button>
                </div>
            )}
            {/* Context Summary Header - same as info-tab */}
            <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8'>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-8'>
                    <div className='grid grid-cols-2 xs:grid-cols-3 gap-6'>
                        {contextDate && (
                            <>
                                <div className='flex items-center gap-3'>
                                    <div className='p-2 rounded-full border border-white/10 bg-white/5 text-accent'>
                                        <CalendarIcon className='w-4 h-4' />
                                    </div>
                                    <div>
                                        <p className='text-white/40 text-[10px] uppercase tracking-wider'>
                                            Date
                                        </p>
                                        <p className='text-sm font-semibold text-white'>
                                            {dateStr}
                                        </p>
                                    </div>
                                </div>
                                <div className='flex items-center gap-3'>
                                    <div className='p-2 rounded-full border border-white/10 bg-white/5 text-accent'>
                                        <Clock className='w-4 h-4' />
                                    </div>
                                    <div>
                                        <p className='text-white/40 text-[10px] uppercase tracking-wider'>
                                            Time
                                        </p>
                                        <p className='text-sm font-semibold text-white'>
                                            {timeStr}
                                            {isBirthTab &&
                                                birth?.time?.approximate && (
                                                    <span className='text-white/40 font-normal'>
                                                        {" "}
                                                        (approx)
                                                    </span>
                                                )}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                        <div className='flex items-center gap-3'>
                            <div className='p-2 rounded-full border border-white/10 bg-white/5 text-accent'>
                                <MapPin className='w-4 h-4' />
                            </div>
                            <div>
                                <p className='text-white/40 text-[10px] uppercase tracking-wider'>
                                    Location
                                </p>
                                <p className='truncate max-w-[150px] text-sm font-semibold text-white'>
                                    {locationLabel || "Unknown"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Placements - filter by planetMeanings when question-relevant */}
            {planetsToShow.length > 0 && (
                <div className='space-y-6'>
                    <div className='flex items-center gap-4'>
                        <div className='rounded-xl border border-accent/30 bg-accent/20 p-2.5 text-accent shadow-lg shadow-accent/10'>
                            <Sparkles className='w-5 h-5' />
                        </div>
                        <div>
                            <div className='flex-1 min-w-0'>
                                <h3 className='text-xl font-serif font-bold text-white'>
                                    Key Placements
                                </h3>
                                {onRefetchWithSystem && (
                                    <SystemBadgePopover
                                        currentSystem={
                                            (chart?.system as AstrologySystem) ??
                                            "vedic_sidereal"
                                        }
                                        onSelect={onRefetchWithSystem}
                                        t={t}
                                    />
                                )}
                            </div>
                        </div>
                        <div className='ml-4 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
                    </div>

                    <div className='grid gap-5 grid-cols-2 lg:grid-cols-3'>
                        {planetsToShow.map((planet) => {
                            const p = chart.planets![planet]
                            const dignity = getPlanetDignity(planet, p.sign)
                            const meaning =
                                planetMeanings?.[planet] ??
                                getPlanetMeaning(planet, p.sign)
                            const PlanetIconComponent =
                                PLANET_ICONS[planet] ?? Star
                            const isRetrograde = p.retrograde ?? false

                            const cardStyle = dignity.isExalted
                                ? "border-amber-400/50 bg-amber-500/15 animate-exalted-aura hover:border-amber-400/70"
                                : dignity.isDebilitated
                                  ? "border-red-500/50 bg-red-500/15 shadow-lg shadow-red-500/10 hover:border-red-500/70"
                                  : dignity.isOwnSign
                                    ? "border-blue-400/50 bg-blue-500/10 shadow-[0_0_20px_rgba(96,165,250,0.15)] hover:border-blue-400/70 hover:shadow-[0_0_28px_rgba(96,165,250,0.25)]"
                                    : isRetrograde
                                      ? "border-white/10 bg-white/5 hover:bg-white/[0.08]"
                                      : "border-white/10 bg-white/5 hover:border-accent/30 hover:bg-white/[0.08]"

                            const iconStyle = dignity.isExalted
                                ? "border-amber-400/40 bg-amber-500/20 text-amber-400"
                                : dignity.isDebilitated
                                  ? "border-red-500/30 bg-red-500/20 text-red-400"
                                  : dignity.isOwnSign
                                    ? "border-blue-400/40 bg-blue-500/20 text-blue-400"
                                    : isRetrograde
                                      ? "border-white/10 bg-white/5 text-white/50"
                                      : "border-accent/20 bg-accent/10 text-accent"

                            const signStyle = isRetrograde
                                ? "text-white/40"
                                : dignity.isExalted
                                  ? "text-amber-400/90"
                                  : dignity.isDebilitated
                                    ? "text-red-400/90"
                                    : dignity.isOwnSign
                                      ? "text-blue-400/90"
                                      : "text-accent opacity-80"

                            const meaningBorderStyle = dignity.isExalted
                                ? "border-amber-400/30"
                                : dignity.isDebilitated
                                  ? "border-red-500/20"
                                  : dignity.isOwnSign
                                    ? "border-blue-400/30"
                                    : "border-accent/20"

                            return (
                                <Card
                                    key={planet}
                                    className={`py-0 group overflow-hidden transition-all duration-500 ${cardStyle}`}
                                >
                                    <div className='space-y-4 p-5'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-3'>
                                                <div
                                                    className={`rounded-lg border p-2 transition-transform duration-500 group-hover:scale-110 ${iconStyle}`}
                                                >
                                                    <PlanetIconComponent className='w-5 h-5' />
                                                </div>
                                                <div>
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <h4
                                                            className={`text-sm font-bold tracking-tight ${
                                                                isRetrograde
                                                                    ? "text-white/60"
                                                                    : "text-white"
                                                            }`}
                                                        >
                                                            {planet}
                                                        </h4>
                                                        {dignity.isExalted && (
                                                            <span className='rounded border border-amber-400/40 bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400'>
                                                                Exalted
                                                            </span>
                                                        )}
                                                        {dignity.isDebilitated && (
                                                            <span className='rounded border border-red-500/40 bg-red-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-400'>
                                                                Debilitated
                                                            </span>
                                                        )}
                                                        {dignity.isOwnSign && (
                                                            <span className='rounded border border-blue-400/40 bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase text-blue-400'>
                                                                Own Sign
                                                            </span>
                                                        )}
                                                        {isRetrograde && (
                                                            <span className='rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white/60'>
                                                                Retrograde
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p
                                                        className={`text-[10px] font-bold uppercase tracking-widest ${signStyle}`}
                                                    >
                                                        {p.sign}
                                                        {p.degree > 0
                                                            ? ` · ${p.degree.toFixed(1)}°`
                                                            : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {meaning && (
                                            <p
                                                className={`line-clamp-3 border-l-2 pl-3 text-xs leading-relaxed italic text-white/70 transition-all duration-500 group-hover:line-clamp-none ${meaningBorderStyle}`}
                                            >
                                                {meaning}
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Houses - filter by houseMeanings when question-relevant */}
            {chart.houses &&
                Object.keys(chart.houses).length > 0 &&
                (() => {
                    const hasQuestionRelevantHouses =
                        houseMeanings && Object.keys(houseMeanings).length > 0
                    const houseIndices = hasQuestionRelevantHouses
                        ? Object.keys(houseMeanings ?? {})
                              .map(Number)
                              .filter((n) => n >= 1 && n <= 12)
                              .sort((a, b) => a - b)
                        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                    if (houseIndices.length === 0) return null
                    return (
                        <div className='space-y-6'>
                            <div className='flex items-center gap-4'>
                                <div className='rounded-xl border border-accent/30 bg-accent/20 p-2.5 text-accent shadow-lg shadow-accent/10'>
                                    <Home className='w-5 h-5' />
                                </div>
                                <div>
                                    <h3 className='text-xl font-serif font-bold text-white'>
                                        Life Areas
                                    </h3>
                                    <p className='mt-0.5 text-xs uppercase tracking-widest text-white/40'>
                                        {hasQuestionRelevantHouses
                                            ? "Relevant to your question"
                                            : "Houses of Destiny"}
                                    </p>
                                </div>
                                <div className='ml-4 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
                            </div>

                            <div className='grid gap-5 grid-cols-2 lg:grid-cols-3'>
                                {houseIndices.map((i) => {
                                    const h = chart.houses?.[String(i)]
                                    if (!h) return null
                                    const HouseIconComponent =
                                        HOUSE_ICONS[String(i)] ?? Home
                                    const suffix = getOrdinalSuffix(i)
                                    const aiMeaning = houseMeanings?.[String(i)]
                                    const staticLabel = t(
                                        `houseMeanings.${i}`,
                                        {
                                            defaultValue: "",
                                        },
                                    )
                                    const staticDesc = t(
                                        `houseDescriptions.${i}`,
                                        {
                                            defaultValue: "",
                                        },
                                    )

                                    return (
                                        <Card
                                            key={i}
                                            className='py-0 group overflow-hidden border-white/10 bg-white/5 transition-all duration-500 hover:border-accent/30 hover:bg-white/[0.08]'
                                        >
                                            <div className='space-y-4 p-5'>
                                                <div className='flex items-start justify-between'>
                                                    <div className='flex items-center gap-3'>
                                                        <div className='rounded-lg border border-accent/20 bg-accent/10 p-2 text-accent transition-colors duration-500 group-hover:bg-accent group-hover:text-white'>
                                                            <HouseIconComponent className='w-5 h-5' />
                                                        </div>
                                                        <div>
                                                            <h4 className='text-sm font-bold tracking-tight text-white'>
                                                                {i}
                                                                {suffix} House
                                                            </h4>
                                                            <p className='text-[10px] uppercase tracking-wider text-white/40'>
                                                                {h.sign}{" "}
                                                                {formatDegree(
                                                                    h.degree,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className='space-y-2'>
                                                    {aiMeaning ? (
                                                        <p className='text-[11px] text-white/70 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all italic border-l-2 border-accent/20 pl-3'>
                                                            {aiMeaning}
                                                        </p>
                                                    ) : (
                                                        <>
                                                            {staticLabel && (
                                                                <p className='text-sm font-semibold text-white leading-tight group-hover:text-accent transition-colors'>
                                                                    {
                                                                        staticLabel
                                                                    }
                                                                </p>
                                                            )}
                                                            {staticDesc && (
                                                                <p className='text-[11px] text-white/50 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all'>
                                                                    {staticDesc}
                                                                </p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })()}

            {chart.system === "vedic_sidereal" && chart.ayanamsa != null && (
                <p className='text-[10px] text-white/40'>
                    Ayanāṃśa (Lahiri): {chart.ayanamsa.toFixed(2)}°
                </p>
            )}
        </div>
    )
}
