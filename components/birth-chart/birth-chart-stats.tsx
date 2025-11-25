"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { calculatePlanetStats, PlanetStatType } from "@/lib/birth-chart-utils"
import { Sun, Moon, Sword, Brain, Crown, Heart, Scale, CloudFog, Ghost, ArrowDown, Star } from "lucide-react"

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
    Venus: Heart,      // Romance (using Heart again, or maybe Sparkles/Flower?)
    Saturn: Scale,     // Discipline
    Rahu: CloudFog,    // Ambition
    Ketu: Ghost,       // Spirituality
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
    Mercury: "Speech, Business, Logic, Trade", // Removed "Intellect" from description as it's the header
    Jupiter: "Wealth, Growth, Guru, Luck", // Removed "Wisdom"
    Venus: "Beauty, Luxury, Desire, Art", // Removed "Love"
    Saturn: "Karma, Delay, Labor, Structure", // Removed "Discipline"
    Rahu: "Obsession, Innovation, Illusion, Foreign", // Removed "Ambition"
    Ketu: "Detachment, Liberation, Past, Mysticism", // Removed "Spirituality"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats).map(([key, stat]) => {
                const k = key as PlanetStatType
                const { value, status } = stat
                const Icon = STAT_ICONS[k]
                const archetype = PLANET_ARCHETYPES[k]
                
                // Determine styling based on status
                let cardClassName = "p-4 bg-white/5 border-white/10 backdrop-blur-sm transition-all duration-500"
                let iconAura = ""
                let progressIndicatorClass = STAT_COLORS[k]
                let labelColor = "text-white"
                let statusLabel = null
                
                if (status === 'exalted') {
                    // Golden/Exalted styling
                    cardClassName = "p-4 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                    iconAura = "shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    progressIndicatorClass = "bg-gradient-to-r from-yellow-400 to-amber-600"
                    labelColor = "text-yellow-200"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-400 flex items-center gap-1 mb-1 ml-auto">
                            <Star className="w-3 h-3 fill-yellow-400 animate-pulse" /> Exalted
                        </span>
                    )
                } else if (status === 'debilitated') {
                    // Dark/Debilitated styling
                    cardClassName = "p-4 bg-gradient-to-br from-gray-900/40 to-black/40 border-gray-700/30 backdrop-blur-sm"
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

                return (
                    <Card
                        key={key}
                        className={cardClassName}
                    >
                        <div className="flex items-start gap-3 mb-1">
                            <div className={`p-2.5 rounded-xl ${STAT_COLORS[k]} ${iconAura} relative overflow-hidden shrink-0 mt-1`}>
                                {/* Icon Box with stat color bg */}
                                {/* Icon itself is white, no bg */}
                                <Icon className="w-5 h-5 text-white relative z-10" />
                                
                                {/* Shine effect for exalted */}
                                {status === 'exalted' && (
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className={`font-bold capitalize text-lg ${labelColor} flex items-center gap-1`}>
                                            {archetype} 
                                            <span className="opacity-60 text-sm font-normal flex items-center gap-1">
                                                (<Icon className="w-3 h-3" /> {key})
                                            </span>
                                        </h3>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {STAT_DESCRIPTIONS[k]}
                                </p>
                            </div>
                        </div>

                        <div className="mt-1.5">
                            <div className="flex justify-between items-end mb-1.5">
                                <span className={`font-bold text-lg leading-none ${status === 'exalted' ? 'text-yellow-400' : 'text-white'}`}>
                                    {value}%
                                </span>
                                {statusLabel}
                            </div>
                            <Progress 
                                value={value} 
                                className={`h-2 bg-black/40 ${status === 'exalted' ? 'border border-yellow-500/20' : ''}`}
                                indicatorClassName={progressIndicatorClass}
                            />
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
