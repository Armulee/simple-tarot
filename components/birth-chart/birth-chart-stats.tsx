"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { calculatePlanetStats, PlanetStats, PlanetStatType } from "@/lib/birth-chart-utils"
import { Sun, Moon, Sword, Brain, Crown, Heart, Scale, CloudFog, Ghost, ArrowDown, Star, ShieldCheck, Circle, CircleDot } from "lucide-react"

interface BirthChartStatsProps {
    planets?: Record<string, unknown> | null
}

// Updated Icons matching Archetypes
const STAT_ICONS: Record<PlanetStatType, React.ElementType> = {
    Sun: Crown,        // Leadership
    Moon: Heart,       // Emotion
    Mars: Sword,       // Drive
    Mercury: Brain,    // Intellect
    Jupiter: Star,     // Wisdom
    Venus: Heart,      // Romance
    Saturn: Scale,     // Discipline
    Rahu: CloudFog,    // Ambition
    Ketu: Ghost,       // Spirituality
}

// Planet-specific icons for displaying planet names
const PLANET_ICONS: Record<PlanetStatType, React.ElementType> = {
    Sun: Sun,
    Moon: Moon,
    Mars: CircleDot,
    Mercury: Circle,
    Jupiter: Circle,
    Venus: Circle,
    Saturn: Circle,
    Rahu: Circle,
    Ketu: Circle,
}

const STAT_COLORS: Record<PlanetStatType, string> = {
    Sun: "bg-orange-500",
    Moon: "bg-slate-300",
    Mars: "bg-red-500",
    Mercury: "bg-emerald-500",
    Jupiter: "bg-yellow-500",
    Venus: "bg-pink-500",
    Saturn: "bg-indigo-500",
    Rahu: "bg-violet-500",
    Ketu: "bg-stone-500",
}

const STAT_DESCRIPTIONS: Record<PlanetStatType, string> = {
    Sun: "Soul, Ego, Vitality, Authority",
    Moon: "Mind, Comfort, Intuition, Peace",
    Mars: "Energy, Action, Courage, Sibling",
    Mercury: "Speech, Business, Logic, Trade",
    Jupiter: "Wealth, Growth, Guru, Luck",
    Venus: "Beauty, Luxury, Desire, Art",
    Saturn: "Karma, Delay, Labor, Structure",
    Rahu: "Obsession, Innovation, Illusion, Foreign",
    Ketu: "Detachment, Liberation, Past, Mysticism",
}

const PLANET_ARCHETYPES: Record<PlanetStatType, string> = {
    Sun: "Leadership",
    Moon: "Emotion",
    Mars: "Drive",
    Mercury: "Intellect",
    Jupiter: "Wisdom",
    Venus: "Romance",
    Saturn: "Discipline",
    Rahu: "Ambition",
    Ketu: "Spirituality",
}

export default function BirthChartStats({ planets }: BirthChartStatsProps) {
    const stats = useMemo(() => {
        if (!planets) return null
        return calculatePlanetStats(planets)
    }, [planets])

    if (!stats) return null

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {Object.entries(stats).map(([key, stat]) => {
                const k = key as PlanetStatType
                const { value, status } = stat
                const Icon = STAT_ICONS[k]
                const PlanetIcon = PLANET_ICONS[k]
                const archetype = PLANET_ARCHETYPES[k]
                
                // Determine styling based on status
                let cardClassName = "p-3 sm:p-4 bg-white/5 border-white/10 backdrop-blur-sm transition-all duration-500"
                let iconAura = ""
                let progressIndicatorClass = STAT_COLORS[k]
                let labelColor = "text-white"
                let statusLabel = null
                
                if (status === 'exalted') {
                    // Golden/Exalted styling
                    cardClassName = "p-3 sm:p-4 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                    iconAura = "shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    progressIndicatorClass = "bg-gradient-to-r from-yellow-400 to-amber-600"
                    labelColor = "text-yellow-200"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-400 flex items-center gap-1 mb-1 ml-auto">
                            <Star className="w-3 h-3 fill-yellow-400 animate-pulse" /> Exalted
                        </span>
                    )
                } else if (status === 'own_sign') {
                    // Own Sign Styling
                    cardClassName = "p-3 sm:p-4 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    iconAura = "shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                    progressIndicatorClass = "bg-gradient-to-r from-blue-400 to-indigo-600"
                    labelColor = "text-blue-200"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1 mb-1 ml-auto">
                            <ShieldCheck className="w-3 h-3 fill-blue-400" /> Own Sign
                        </span>
                    )
                } else if (status === 'debilitated') {
                    // Dark/Debilitated styling
                    cardClassName = "p-3 sm:p-4 bg-gradient-to-br from-gray-900/40 to-black/40 border-gray-700/30 backdrop-blur-sm"
                    iconAura = "opacity-80 grayscale"
                    progressIndicatorClass = "bg-gray-600"
                    labelColor = "text-gray-400"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1 mb-1 ml-auto">
                            <ArrowDown className="w-3 h-3" /> Debilitated
                        </span>
                    )
                } else {
                    // Normal case
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-white/50 flex items-center gap-1.5 mb-1 ml-auto">
                            <div className="h-1.5 w-1.5 rounded-full bg-white/50 animate-pulse" />
                            Normal
                        </span>
                    )
                }

                // Override text value for exalted
                const displayValue = status === 'exalted' ? 120 : value

                return (
                    <Card
                        key={key}
                        className={cardClassName}
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${STAT_COLORS[k]} ${iconAura} relative overflow-hidden shrink-0`}>
                                        <Icon className="w-4 h-4 text-white relative z-10" />
                                        {(status === 'exalted' || status === 'own_sign') && (
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className={`font-bold capitalize text-sm sm:text-base ${labelColor} leading-tight`}>
                                            {archetype}
                                        </h3>
                                        <span className="text-[10px] sm:text-xs opacity-60 font-medium flex items-center gap-1">
                                            <PlanetIcon className="w-2.5 h-2.5" /> {key}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                                {STAT_DESCRIPTIONS[k]}
                            </p>

                            <div className="mt-1">
                                <div className="flex justify-between items-end mb-1.5">
                                    <span className={`font-bold text-base sm:text-lg leading-none ${status === 'exalted' ? 'text-yellow-400' : status === 'own_sign' ? 'text-blue-300' : 'text-white'}`}>
                                        {displayValue}%
                                    </span>
                                    {statusLabel}
                                </div>
                                <Progress 
                                    value={displayValue} 
                                    className={`h-1.5 sm:h-2 bg-black/40 ${status === 'exalted' ? 'border border-yellow-500/20' : status === 'own_sign' ? 'border border-blue-500/20' : ''}`}
                                    indicatorClassName={progressIndicatorClass}
                                />
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
