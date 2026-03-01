"use client"

import React, { useState } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
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
    CalendarDays,
    Clock3,
} from "lucide-react"
import { getPlanetDignity } from "@/lib/birth-chart-utils"
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

const PLANET_IMAGE_ASSETS: Record<string, string> = {
    Sun: "/assets/planetary/sun.png",
    Moon: "/assets/planetary/moon.png",
    Mercury: "/assets/planetary/mercury.png",
    Venus: "/assets/planetary/venus.png",
    Mars: "/assets/planetary/mars.png",
    Jupiter: "/assets/planetary/jupiter.png",
    Saturn: "/assets/planetary/saturn.png",
    Rahu: "/assets/planetary/rahu.png",
    Ketu: "/assets/planetary/rahu.png",
    Uranus: "/assets/planetary/uranus.png",
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
    มิถุน: 2,
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

function getLocalizedZodiacSign(
    signRaw: string,
    t: (key: string, values?: Record<string, string | number>) => string,
) {
    const signIndex = ZODIAC_SIGN_INDEX[signRaw]
    if (typeof signIndex !== "number") return signRaw
    const canonicalSign = ZODIAC_SIGNS_EN[signIndex] ?? signRaw
    return t(`zodiacSigns.${canonicalSign}`)
}

function formatDisplayDate(
    date: { day?: number | null; month?: number | null; year?: number | null },
    locale: string,
) {
    if (!date.day || !date.month || !date.year) return ""
    return new Date(date.year, date.month - 1, date.day).toLocaleDateString(
        locale.startsWith("th") ? "th-TH" : "en-US",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        },
    )
}

function formatDisplayTime(
    time: { hour?: number | null; minute?: number | null },
    locale: string,
) {
    if (time.hour == null || time.minute == null) return ""
    const base = new Date()
    base.setHours(time.hour, time.minute, 0, 0)
    return base.toLocaleTimeString(
        locale.startsWith("th") ? "th-TH" : "en-US",
        {
            hour: "numeric",
            minute: "2-digit",
        },
    )
}

function getOrdinalSuffix(i: number) {
    const j = i % 10,
        k = i % 100
    if (j === 1 && k !== 11) return "st"
    if (j === 2 && k !== 12) return "nd"
    if (j === 3 && k !== 13) return "rd"
    return "th"
}

const metaCardClass =
    "rounded-xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.03] px-3 py-2"

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
                <span
                    role='button'
                    tabIndex={0}
                    className='shrink-0 inline-flex cursor-pointer rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-500 hover:bg-primary/20 hover:text-white transition-colors'
                >
                    {label}
                </span>
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
                                ? "bg-yellow-500/20 text-yellow-500"
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
                                ? "bg-yellow-500/20 text-yellow-500"
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

export function BirthChartCard({
    chartData,
    planetMeanings,
    houseMeanings,
    onRefetchWithSystem,
    showBirthDetails,
    showTransitDetails,
    renderFromPanel,
}: {
    chartData: ChartData
    question?: string | null
    planetMeanings?: Record<string, string>
    houseMeanings?: Record<string, string>
    onRefetchWithSystem?: (system: AstrologySystem) => void
    showBirthDetails?: boolean
    showTransitDetails?: boolean
    renderFromPanel?: boolean
}) {
    void planetMeanings
    void houseMeanings
    const t = useTranslations("BirthChart")
    const locale = useLocale()
    const [birthSection, setBirthSection] = useState<"planetary" | "lifeAreas">(
        "planetary",
    )
    const hasTransit = Boolean(
        chartData?.transit?.charts?.length &&
            chartData.transit?.date?.day &&
            chartData.transit?.date?.month &&
            chartData.transit?.date?.year,
    )
    const chart = chartData?.charts?.[0]
    const transitChart = hasTransit ? chartData?.transit?.charts?.[0] : null
    if (!chart?.planets) return null

    const planetsToShow = PLANET_ORDER.filter(
        (key) => chart.planets?.[key] != null,
    )
    const transitPlanetsToShow = PLANET_ORDER.filter(
        (key) => key !== "Ascendant" && transitChart?.planets?.[key] != null,
    )
    const hasHouses = Boolean(
        chart.houses && Object.keys(chart.houses).length > 0,
    )
    const fromPanel = renderFromPanel === true
    const birthDateText = formatDisplayDate(chartData.birth?.date ?? {}, locale)
    const birthTimeText = formatDisplayTime(chartData.birth?.time ?? {}, locale)
    const transitDateText = formatDisplayDate(
        chartData.transit?.date ?? {},
        locale,
    )

    const renderPlanetaryGrid = (
        targetChart: NonNullable<ChartData["charts"]>[number],
        planetKeys: string[],
    ) => (
        <div className='px-1 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3'>
            {planetKeys.map((planet) => {
                const p = targetChart.planets?.[planet]
                if (!p) return null

                const dignity = getPlanetDignity(planet, p.sign)
                const PlanetIconComponent = PLANET_ICONS[planet] ?? Star
                const planetImageSrc = PLANET_IMAGE_ASSETS[planet]
                const isRetrograde = p.retrograde ?? false
                const toneClass = isRetrograde
                    ? "text-white/45"
                    : dignity.isExalted
                      ? "text-amber-300"
                      : dignity.isOwnSign
                        ? "text-sky-300"
                        : dignity.isDebilitated
                          ? "text-red-300"
                          : "text-white"
                const subToneClass = isRetrograde
                    ? "text-white/40"
                    : dignity.isExalted
                      ? "text-amber-200/90"
                      : dignity.isOwnSign
                        ? "text-sky-200/90"
                        : dignity.isDebilitated
                          ? "text-red-200/90"
                          : "text-white/65"
                const auraClass = isRetrograde
                    ? "shadow-none"
                    : dignity.isExalted
                      ? "shadow-[0_0_22px_rgba(251,191,36,0.5)]"
                      : dignity.isOwnSign
                        ? "shadow-[0_0_22px_rgba(56,189,248,0.5)]"
                        : dignity.isDebilitated
                          ? "shadow-[0_0_20px_rgba(248,113,113,0.45)]"
                          : "shadow-none"
                const ringClass = isRetrograde
                    ? "ring-1 ring-white/15"
                    : dignity.isExalted
                      ? "ring-1 ring-amber-300/70"
                      : dignity.isOwnSign
                        ? "ring-1 ring-sky-300/70"
                        : dignity.isDebilitated
                          ? "ring-1 ring-red-300/70"
                          : ""
                const statusToneClass = isRetrograde
                    ? "text-white/45"
                    : dignity.isExalted
                      ? "text-amber-300/90"
                      : dignity.isOwnSign
                        ? "text-sky-300/90"
                        : dignity.isDebilitated
                          ? "text-red-300/90"
                          : "text-white/45"

                return (
                    <div key={planet} className='flex items-start gap-3'>
                        {planetImageSrc ? (
                            <Image
                                src={planetImageSrc}
                                alt={planet}
                                width={52}
                                height={52}
                                className={`h-[52px] w-[52px] rounded-full object-cover ${ringClass} ${auraClass} ${
                                    planet === "Ketu" ? "rotate-90" : ""
                                }`}
                            />
                        ) : (
                            <div
                                className={`h-[52px] w-[52px] rounded-full bg-white/5 text-white/70 flex items-center justify-center ${ringClass} ${auraClass}`}
                            >
                                <PlanetIconComponent className='h-6 w-6' />
                            </div>
                        )}
                        <div className='min-w-0'>
                            <p className={`text-sm font-medium ${toneClass}`}>
                                {t(`planets.${planet}`)}
                            </p>
                            <p className={`text-xs ${subToneClass}`}>
                                {getLocalizedZodiacSign(p.sign, t)}
                                {p.degree > 0
                                    ? ` · ${p.degree.toFixed(1)}°`
                                    : ""}
                            </p>
                            <p className='text-[10px] text-white/45'>
                                {p.longitude.toFixed(3)}°
                            </p>
                            {(dignity.isExalted ||
                                dignity.isDebilitated ||
                                dignity.isOwnSign ||
                                isRetrograde) && (
                                <p
                                    className={`mt-1 text-[10px] uppercase tracking-wide ${statusToneClass}`}
                                >
                                    {[
                                        dignity.isExalted
                                            ? t("stats.status.exalted")
                                            : null,
                                        dignity.isDebilitated
                                            ? t("stats.status.debilitated")
                                            : null,
                                        dignity.isOwnSign
                                            ? t("stats.status.ownSign")
                                            : null,
                                        isRetrograde
                                            ? t("stats.status.retrograde")
                                            : null,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )

    const renderBirthDetailsContent = () => (
        <>
            {(birthDateText || birthTimeText) && (
                <div className='mb-4 grid gap-2 sm:grid-cols-2'>
                    {birthDateText && (
                        <div className={metaCardClass}>
                            <p className='mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/55'>
                                <CalendarDays className='h-3.5 w-3.5 text-accent/80' />
                                {t("birthDateLabel")}
                            </p>
                            <p className='text-sm font-medium text-white/90'>
                                {birthDateText}
                            </p>
                        </div>
                    )}
                    {birthTimeText && (
                        <div className={metaCardClass}>
                            <p className='mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/55'>
                                <Clock3 className='h-3.5 w-3.5 text-accent/80' />
                                {t("birthTimeLabel")}
                            </p>
                            <p className='text-sm font-medium text-white/90'>
                                {birthTimeText}
                            </p>
                        </div>
                    )}
                </div>
            )}
            <div className='mb-4 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1'>
                <button
                    type='button'
                    onClick={() => setBirthSection("planetary")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        birthSection === "planetary"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                >
                    {t("planetarySectionLabel")}
                </button>
                <button
                    type='button'
                    onClick={() => setBirthSection("lifeAreas")}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        birthSection === "lifeAreas"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                >
                    {t("lifeAreasSectionLabel")}
                </button>
            </div>
            {birthSection === "planetary" && renderPlanetaryGrid(chart, planetsToShow)}
            {birthSection === "lifeAreas" && hasHouses && (
                <div className='grid gap-5 grid-cols-2 lg:grid-cols-3'>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
                        const h = chart.houses?.[String(i)]
                        if (!h) return null
                        const HouseIconComponent = HOUSE_ICONS[String(i)] ?? Home
                        const suffix = getOrdinalSuffix(i)
                        const houseLabel = t(`houseMeanings.${i}`, {
                            defaultValue: "",
                        })

                        return (
                            <Card
                                key={i}
                                className='py-0 group overflow-hidden border-white/10 bg-white/5 transition-all duration-500 hover:border-accent/30 hover:bg-white/[0.08]'
                            >
                                <div className='space-y-4 px-3 py-2'>
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
                                                {houseLabel && (
                                                    <p className='text-xs font-semibold text-white/60 leading-tight mt-0.5'>
                                                        {houseLabel}
                                                    </p>
                                                )}
                                                <p className='text-[10px] uppercase tracking-wider text-white/40'>
                                                    {h.sign}{" "}
                                                    {formatDegree(h.degree)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </>
    )

    const renderTransitDetailsContent = () => (
        <>
            {transitDateText && (
                <div className='mb-4'>
                    <div className={`${metaCardClass} max-w-sm`}>
                        <p className='mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/55'>
                            <CalendarDays className='h-3.5 w-3.5 text-accent/80' />
                            {t("transitDateLabel")}
                        </p>
                        <p className='text-sm font-medium text-white/90'>
                            {transitDateText}
                        </p>
                    </div>
                </div>
            )}
            {renderPlanetaryGrid(transitChart!, transitPlanetsToShow)}
        </>
    )

    return (
        <div className='space-y-8 pb-4'>
            {/* Key Placements - expandable, hidden by default */}
            {planetsToShow.length > 0 && (
                fromPanel ? (
                    showBirthDetails ? (
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                            <div className='flex items-center gap-4 w-full mb-2'>
                                <div className='rounded-xl border border-accent/30 bg-accent/20 p-2.5 text-accent shadow-lg shadow-accent/10'>
                                    <Sparkles className='w-5 h-5' />
                                </div>
                                <div className='min-w-0 w-full'>
                                    <h3 className='text-xl font-serif font-bold text-white text-left w-full'>
                                        {t("birthDetailsTitle")}
                                    </h3>
                                    {onRefetchWithSystem && (
                                        <div className='mt-1'>
                                            <SystemBadgePopover
                                                currentSystem={
                                                    (chart?.system as AstrologySystem) ??
                                                    "vedic_sidereal"
                                                }
                                                onSelect={onRefetchWithSystem}
                                                t={t}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className='ml-4 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
                            </div>
                            {renderBirthDetailsContent()}
                        </div>
                    ) : null
                ) : (
                    <Accordion className='space-y-0'>
                        <AccordionItem
                            defaultOpen={false}
                            className='rounded-2xl border border-white/10 bg-white/5 p-4'
                        >
                            <AccordionTrigger className='py-0 hover:no-underline'>
                                <div className='flex items-center gap-4 w-full'>
                                    <div className='rounded-xl border border-accent/30 bg-accent/20 p-2.5 text-accent shadow-lg shadow-accent/10'>
                                        <Sparkles className='w-5 h-5' />
                                    </div>
                                    <div className='min-w-0 w-full'>
                                        <h3 className='text-xl font-serif font-bold text-white text-left w-full'>
                                            {t("birthDetailsTitle")}
                                        </h3>
                                        {onRefetchWithSystem && (
                                            <div
                                                className='mt-1'
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <SystemBadgePopover
                                                    currentSystem={
                                                        (chart?.system as AstrologySystem) ??
                                                        "vedic_sidereal"
                                                    }
                                                    onSelect={
                                                        onRefetchWithSystem
                                                    }
                                                    t={t}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className='ml-4 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='pt-2'>
                                {renderBirthDetailsContent()}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )
            )}

            {hasTransit && transitChart && transitPlanetsToShow.length > 0 && (
                fromPanel ? (
                    showTransitDetails ? (
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                            <div className='flex items-center gap-4 w-full mb-2'>
                                <div className='rounded-xl border border-accent/30 bg-accent/20 p-2.5 text-accent shadow-lg shadow-accent/10'>
                                    <Sparkles className='w-5 h-5' />
                                </div>
                                <div className='min-w-0 w-full'>
                                    <h3 className='text-xl font-serif font-bold text-white text-left w-full'>
                                        {t("transitDetailsTitle")}
                                    </h3>
                                </div>
                                <div className='ml-4 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
                            </div>
                            {renderTransitDetailsContent()}
                        </div>
                    ) : null
                ) : (
                    <Accordion className='space-y-0'>
                        <AccordionItem
                            defaultOpen={false}
                            className='rounded-2xl border border-white/10 bg-white/5 p-4'
                        >
                            <AccordionTrigger className='py-0 hover:no-underline'>
                                <div className='flex items-center gap-4 w-full'>
                                    <div className='rounded-xl border border-accent/30 bg-accent/20 p-2.5 text-accent shadow-lg shadow-accent/10'>
                                        <Sparkles className='w-5 h-5' />
                                    </div>
                                    <div className='min-w-0 w-full'>
                                        <h3 className='text-xl font-serif font-bold text-white text-left w-full'>
                                            {t("transitDetailsTitle")}
                                        </h3>
                                    </div>
                                    <div className='ml-4 h-px flex-1 bg-gradient-to-r from-white/10 to-transparent' />
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='pt-2'>
                                {renderTransitDetailsContent()}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )
            )}

            {chart.system === "vedic_sidereal" && chart.ayanamsa != null && (
                <p className='text-[10px] text-white/40'>
                    Ayanāṃśa (Lahiri): {chart.ayanamsa.toFixed(2)}°
                </p>
            )}
        </div>
    )
}
