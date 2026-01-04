"use client"

import React from "react"
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
    type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export const PLANET_ICONS: Record<string, LucideIcon> = {
    Ascendant: User,
    Sun: Sun,
    Moon: Moon,
    Mercury: Zap,
    Venus: Heart,
    Mars: Flame,
    Jupiter: ArrowUpRight,
    Saturn: Shield,
    Rahu: Target,
    Ketu: History,
}

export const HOUSE_ICONS: Record<string, LucideIcon> = {
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

export const PLANET_COLORS: Record<string, string> = {
    Sun: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Moon: "text-blue-200 bg-blue-200/10 border-blue-200/20",
    Mercury: "text-green-400 bg-green-400/10 border-green-400/20",
    Venus: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    Mars: "text-red-500 bg-red-500/10 border-red-500/20",
    Jupiter: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    Saturn: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    Rahu: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    Ketu: "text-slate-400 bg-slate-400/10 border-slate-400/20",
    Ascendant: "text-amber-400 bg-accent/10 border-accent/20",
}

interface SummaryIconProps {
    planet: string
    house: string
    className?: string
}

export function SummaryIcon({ planet, house, className }: SummaryIconProps) {
    const t = useTranslations("BirthChart")

    // Normalize names
    const normalizedPlanet =
        Object.keys(PLANET_ICONS).find(
            (k) => k.toLowerCase() === planet.toLowerCase()
        ) || planet

    const PlanetIcon = PLANET_ICONS[normalizedPlanet] || Sparkles
    const HouseIcon = HOUSE_ICONS[house] || Home
    const colorClass =
        PLANET_COLORS[normalizedPlanet] ||
        "text-accent bg-accent/10 border-accent/20"

    const suffix = (i: number) => {
        const j = i % 10,
            k = i % 100
        if (j == 1 && k != 11) return "st"
        if (j == 2 && k != 12) return "nd"
        if (j == 3 && k != 13) return "rd"
        return "th"
    }

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all hover:scale-105",
                colorClass,
                className
            )}
        >
            <div className='flex items-center gap-1.5'>
                <PlanetIcon className='w-3.5 h-3.5' />
                <span className='text-[10px] font-bold uppercase tracking-wider'>
                    {t(`planets.${normalizedPlanet}`, {
                        defaultValue: normalizedPlanet,
                    })}
                </span>
            </div>

            <div className='w-px h-3 bg-current opacity-20' />

            <div className='flex items-center gap-1.5'>
                <HouseIcon className='w-3.5 h-3.5' />
                <span className='text-[10px] font-bold uppercase tracking-wider'>
                    {house}
                    {suffix(parseInt(house))} House
                </span>
            </div>
        </div>
    )
}
