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
    type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface BirthChartStatsProps {
    planets?: Record<string, unknown> | null
}

const STAT_ICONS: Record<PlanetStatType, LucideIcon> = {
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

type Status = "exalted" | "own_sign" | "debilitated" | "normal"

type Style = {
    badge: string
    badgeIcon: React.ReactNode
    bar: string
    value: string
}

export default function BirthChartStats({ planets }: BirthChartStatsProps) {
    const t = useTranslations("BirthChart")

    const stats = useMemo(() => {
        if (!planets) return null
        return calculatePlanetStats(planets)
    }, [planets])

    if (!stats) return null

    const styles: Record<Status, Style> = {
        exalted: {
            badge: "bg-amber-300/[0.14] text-amber-100 ring-amber-300/30",
            badgeIcon: <Star className='h-3 w-3 fill-amber-300 text-amber-300' />,
            bar: "bg-amber-300/85",
            value: "text-amber-100",
        },
        own_sign: {
            badge: "bg-white/10 text-white ring-white/15",
            badgeIcon: <ShieldCheck className='h-3 w-3 text-white' />,
            bar: "bg-white/75",
            value: "text-white",
        },
        debilitated: {
            badge: "bg-white/[0.05] text-white/55 ring-white/10",
            badgeIcon: <ArrowDown className='h-3 w-3' />,
            bar: "bg-white/30",
            value: "text-white/65",
        },
        normal: {
            badge: "bg-white/[0.05] text-white/65 ring-white/10",
            badgeIcon: <span className='h-1.5 w-1.5 rounded-full bg-white/55' />,
            bar: "bg-white/55",
            value: "text-white",
        },
    }

    const statusLabel: Record<Status, string> = {
        exalted: t("stats.status.exalted"),
        own_sign: t("stats.status.ownSign"),
        debilitated: t("stats.status.debilitated"),
        normal: t("stats.status.normal"),
    }

    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {Object.entries(stats).map(([key, stat]) => {
                const k = key as PlanetStatType
                const { value, status } = stat
                const s = styles[status as Status]
                const Icon = STAT_ICONS[k]
                const planetImg = PLANET_IMAGES[k]
                const isMirrored = MIRRORED_PLANETS[k] ?? false
                const archetype = t(`stats.archetypes.${k}`)
                const description = t(`stats.descriptions.${k}`)
                const planetName = t(`planets.${k}`)
                const displayValue = status === "exalted" ? 120 : value
                const barWidth = Math.min(displayValue, 100)

                return (
                    <article
                        key={key}
                        className='group rounded-2xl bg-white/[0.04] backdrop-blur-2xl ring-1 ring-white/[0.06] shadow-[0_12px_40px_-20px_rgba(0,0,0,0.5)] p-5 transition-shadow duration-300 hover:shadow-[0_18px_50px_-22px_rgba(0,0,0,0.6)]'
                    >
                        <div className='flex items-start gap-3.5'>
                            <div className='relative h-12 w-12 shrink-0 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] grid place-items-center overflow-hidden'>
                                <Image
                                    src={planetImg}
                                    alt=''
                                    aria-hidden
                                    width={40}
                                    height={40}
                                    className='h-9 w-9 rounded-full object-cover'
                                    style={{
                                        transform: isMirrored
                                            ? "rotate(180deg)"
                                            : undefined,
                                    }}
                                />
                            </div>
                            <div className='min-w-0 flex-1 space-y-1'>
                                <div className='flex items-center gap-1.5 text-[11px] font-medium text-white/55'>
                                    <Icon className='h-3 w-3' />
                                    {planetName}
                                </div>
                                <h3 className='text-[15px] font-semibold leading-tight text-white truncate'>
                                    {archetype}
                                </h3>
                            </div>
                            <span
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1",
                                    s.badge,
                                )}
                            >
                                {s.badgeIcon}
                                {statusLabel[status as Status]}
                            </span>
                        </div>

                        <p className='mt-4 line-clamp-2 min-h-[2.5rem] text-[13px] leading-relaxed text-white/60'>
                            {description}
                        </p>

                        <div className='mt-4'>
                            <div className='mb-1.5 flex items-baseline justify-between'>
                                <span className='text-[11px] text-white/45'>
                                    Strength
                                </span>
                                <span
                                    className={cn(
                                        "text-lg font-semibold tabular-nums leading-none",
                                        s.value,
                                    )}
                                >
                                    {displayValue}
                                    <span className='ml-0.5 text-xs text-white/40'>
                                        %
                                    </span>
                                </span>
                            </div>
                            <div className='relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]'>
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-[width] duration-700",
                                        s.bar,
                                    )}
                                    style={{ width: `${barWidth}%` }}
                                />
                            </div>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}
