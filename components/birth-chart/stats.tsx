"use client"

import { useMemo } from "react"
import Image from "next/image"
import { calculatePlanetStats, PlanetStatType } from "@/lib/birth-chart-utils"
import {
    Sword,
    Brain,
    Crown,
    Heart,
    Scale,
    CloudFog,
    Ghost,
    ArrowDown,
    Star,
    ShieldCheck,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface BirthChartStatsProps {
    planets?: Record<string, unknown> | null
}

const STAT_ICONS: Record<PlanetStatType, React.ElementType> = {
    Sun: Crown,
    Moon: Heart,
    Mars: Sword,
    Mercury: Brain,
    Jupiter: Star,
    Venus: Heart,
    Saturn: Scale,
    Rahu: CloudFog,
    Ketu: Ghost,
}

const PLANET_IMAGES: Record<PlanetStatType, string> = {
    Sun: "/assets/planetary/sun.png",
    Moon: "/assets/planetary/moon.png",
    Mars: "/assets/planetary/mars.png",
    Mercury: "/assets/planetary/mercury.png",
    Jupiter: "/assets/planetary/jupiter.png",
    Venus: "/assets/planetary/venus.png",
    Saturn: "/assets/planetary/saturn.png",
    Rahu: "/assets/planetary/rahu.png",
    Ketu: "/assets/planetary/rahu.png",
}

const MIRRORED_PLANETS: Partial<Record<PlanetStatType, boolean>> = {
    Ketu: true,
}

const PLANET_GLOW: Record<PlanetStatType, string> = {
    Sun: "drop-shadow(0 6px 16px rgba(252,211,77,0.55))",
    Moon: "drop-shadow(0 6px 14px rgba(226,232,240,0.45))",
    Mars: "drop-shadow(0 6px 14px rgba(248,113,113,0.55))",
    Mercury: "drop-shadow(0 6px 14px rgba(110,231,183,0.45))",
    Jupiter: "drop-shadow(0 6px 14px rgba(253,224,71,0.45))",
    Venus: "drop-shadow(0 6px 14px rgba(244,114,182,0.45))",
    Saturn: "drop-shadow(0 6px 14px rgba(165,180,252,0.45))",
    Rahu: "drop-shadow(0 6px 14px rgba(196,181,253,0.45))",
    Ketu: "drop-shadow(0 6px 14px rgba(214,211,209,0.45))",
}

type DignityStyle = {
    card: string
    iconRing: string
    iconText: string
    badge: string
    badgeIcon: React.ReactNode
    bar: string
    barTrack: string
    value: string
    halo: string
    archetypeColor: string
}

type Status = "exalted" | "own_sign" | "debilitated" | "normal"

export default function BirthChartStats({ planets }: BirthChartStatsProps) {
    const t = useTranslations("BirthChart")

    const stats = useMemo(() => {
        if (!planets) return null
        return calculatePlanetStats(planets)
    }, [planets])

    if (!stats) return null

    const dignityStyles: Record<Status, DignityStyle> = {
        exalted: {
            card: "border-amber-300/30 hover:border-amber-300/50 shadow-[0_0_40px_-18px_rgba(252,211,77,0.55)]",
            iconRing: "ring-1 ring-amber-300/45 bg-amber-300/10",
            iconText: "text-amber-200",
            badge: "border-amber-300/40 bg-amber-300/10 text-amber-200",
            badgeIcon: (
                <Star className='h-3 w-3 fill-amber-300 text-amber-300' />
            ),
            bar: "from-amber-200 via-amber-300 to-yellow-400",
            barTrack: "bg-amber-300/10",
            value: "text-amber-200",
            halo: "bg-amber-300/10",
            archetypeColor: "text-amber-100",
        },
        own_sign: {
            card: "border-sky-300/25 hover:border-sky-300/45 shadow-[0_0_40px_-18px_rgba(125,211,252,0.45)]",
            iconRing: "ring-1 ring-sky-300/40 bg-sky-300/10",
            iconText: "text-sky-200",
            badge: "border-sky-300/40 bg-sky-300/10 text-sky-200",
            badgeIcon: <ShieldCheck className='h-3 w-3 text-sky-200' />,
            bar: "from-sky-300 via-indigo-300 to-blue-400",
            barTrack: "bg-sky-300/10",
            value: "text-sky-100",
            halo: "bg-sky-300/10",
            archetypeColor: "text-sky-50",
        },
        debilitated: {
            card: "border-white/8 hover:border-white/15",
            iconRing: "ring-1 ring-white/10 bg-white/[0.03]",
            iconText: "text-white/55",
            badge: "border-white/15 bg-white/[0.03] text-white/50",
            badgeIcon: <ArrowDown className='h-3 w-3' />,
            bar: "from-white/30 via-white/20 to-white/10",
            barTrack: "bg-white/[0.04]",
            value: "text-white/55",
            halo: "bg-white/[0.02]",
            archetypeColor: "text-white/60",
        },
        normal: {
            card: "border-white/10 hover:border-white/20",
            iconRing: "ring-1 ring-white/15 bg-white/[0.04]",
            iconText: "text-white/85",
            badge: "border-white/15 bg-white/[0.03] text-white/60",
            badgeIcon: (
                <span className='h-1.5 w-1.5 rounded-full bg-white/55' />
            ),
            bar: "from-violet-300 via-fuchsia-300 to-rose-300",
            barTrack: "bg-white/[0.05]",
            value: "text-white",
            halo: "bg-violet-400/10",
            archetypeColor: "text-white",
        },
    }

    const statusLabel: Record<Status, string> = {
        exalted: t("stats.status.exalted"),
        own_sign: t("stats.status.ownSign"),
        debilitated: t("stats.status.debilitated"),
        normal: t("stats.status.normal"),
    }

    return (
        <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'>
            {Object.entries(stats).map(([key, stat]) => {
                const k = key as PlanetStatType
                const { value, status } = stat
                const s = dignityStyles[status as Status]
                const Icon = STAT_ICONS[k]
                const planetImg = PLANET_IMAGES[k]
                const isMirrored = MIRRORED_PLANETS[k] ?? false
                const planetGlow = PLANET_GLOW[k]
                const archetype = t(`stats.archetypes.${k}`)
                const description = t(`stats.descriptions.${k}`)
                const planetName = t(`planets.${k}`)
                const displayValue = status === "exalted" ? 120 : value
                const barWidth = Math.min(displayValue, 100)

                return (
                    <div
                        key={key}
                        className={cn(
                            "group relative overflow-hidden rounded-2xl border bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl p-5 transition-colors duration-300",
                            s.card,
                        )}
                    >
                        <div
                            aria-hidden
                            className={cn(
                                "pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl opacity-70",
                                s.halo,
                            )}
                        />

                        <div className='relative space-y-4'>
                            <div className='flex items-start justify-between gap-3'>
                                <div className='flex min-w-0 items-center gap-3'>
                                    <div
                                        className={cn(
                                            "relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1",
                                            s.iconRing,
                                        )}
                                    >
                                        <span
                                            aria-hidden
                                            className={cn(
                                                "pointer-events-none absolute inset-0 rounded-full blur-md opacity-80",
                                                s.halo,
                                            )}
                                        />
                                        <Image
                                            src={planetImg}
                                            alt=''
                                            aria-hidden
                                            width={44}
                                            height={44}
                                            className='relative h-10 w-10 rounded-full object-cover'
                                            style={{
                                                filter: planetGlow,
                                                transform: isMirrored
                                                    ? "rotate(180deg)"
                                                    : undefined,
                                            }}
                                        />
                                    </div>
                                    <div className='min-w-0'>
                                        <h3
                                            className={cn(
                                                "font-serif italic leading-tight truncate",
                                                s.archetypeColor,
                                            )}
                                        >
                                            {archetype}
                                        </h3>
                                        <p className='mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/45'>
                                            <Icon
                                                className={cn(
                                                    "h-3.5 w-3.5",
                                                    s.iconText,
                                                )}
                                            />

                                            {planetName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className='line-clamp-2 min-h-[2.5rem] text-[11px] sm:text-xs leading-relaxed text-white/55'>
                                {description}
                            </p>

                            <div>
                                <div className='mb-1.5 flex items-baseline justify-between'>
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]",
                                            s.badge,
                                        )}
                                    >
                                        {s.badgeIcon}
                                        {statusLabel[status as Status]}
                                    </span>
                                    <span
                                        className={cn(
                                            "font-serif text-2xl sm:text-3xl tabular-nums leading-none",
                                            s.value,
                                        )}
                                    >
                                        {displayValue}
                                        <span className='ml-0.5 text-sm text-white/35'>
                                            %
                                        </span>
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "relative h-1.5 w-full overflow-hidden rounded-full",
                                        s.barTrack,
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "h-full rounded-full bg-gradient-to-r transition-[width] duration-700",
                                            s.bar,
                                        )}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
