"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { calculatePlanetStats, PlanetStats, PlanetStatType } from "@/lib/birth-chart-utils"
import { Sun, Moon, Sword, Brain, Crown, Heart, Scale, CloudFog, Ghost, ArrowDown, Star, ShieldCheck, Circle, CircleDot } from "lucide-react"
import { useTranslations } from "next-intl"

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


export default function BirthChartStats({ planets }: BirthChartStatsProps) {
    const t = useTranslations("BirthChart")
    
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
                const archetype = t(`stats.archetypes.${k}`)
                const description = t(`stats.descriptions.${k}`)
                const planetName = t(`planets.${k}`)
                
                // Determine styling based on status
                let cardClassName = "p-4 sm:p-5 bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/20 backdrop-blur-xl transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-accent/20 hover:border-accent/40"
                let iconAura = ""
                let progressIndicatorClass = STAT_COLORS[k]
                let labelColor = "text-white"
                let statusLabel = null
                
                if (status === 'exalted') {
                    // Golden/Exalted styling
                    cardClassName = "p-4 sm:p-5 bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-yellow-500/10 border-yellow-500/50 backdrop-blur-xl shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_35px_rgba(234,179,8,0.6)] hover:scale-105 transition-all duration-500"
                    iconAura = "shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse"
                    progressIndicatorClass = "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600"
                    labelColor = "text-yellow-200"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-yellow-400 flex items-center gap-1 mb-1 ml-auto">
                            <Star className="w-3 h-3 fill-yellow-400 animate-pulse" /> {t("stats.status.exalted")}
                        </span>
                    )
                } else if (status === 'own_sign') {
                    // Own Sign Styling
                    cardClassName = "p-4 sm:p-5 bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-blue-500/10 border-blue-500/50 backdrop-blur-xl shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] hover:scale-105 transition-all duration-500"
                    iconAura = "shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    progressIndicatorClass = "bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600"
                    labelColor = "text-blue-200"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1 mb-1 ml-auto">
                            <ShieldCheck className="w-3 h-3 fill-blue-400" /> {t("stats.status.ownSign")}
                        </span>
                    )
                } else if (status === 'debilitated') {
                    // Dark/Debilitated styling
                    cardClassName = "p-4 sm:p-5 bg-gradient-to-br from-gray-900/50 to-black/50 border-gray-700/40 backdrop-blur-xl hover:scale-105 transition-all duration-500"
                    iconAura = "opacity-70 grayscale"
                    progressIndicatorClass = "bg-gradient-to-r from-gray-600 to-gray-700"
                    labelColor = "text-gray-400"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-1 mb-1 ml-auto">
                            <ArrowDown className="w-3 h-3" /> {t("stats.status.debilitated")}
                        </span>
                    )
                } else {
                    // Normal case
                    cardClassName = "p-4 sm:p-5 bg-gradient-to-br from-white/10 via-white/5 to-transparent border-white/20 backdrop-blur-xl hover:scale-105 hover:shadow-xl hover:shadow-accent/10 hover:border-accent/30 transition-all duration-500"
                    statusLabel = (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-white/50 flex items-center gap-1.5 mb-1 ml-auto">
                            <div className="h-1.5 w-1.5 rounded-full bg-white/50 animate-pulse" />
                            {t("stats.status.normal")}
                        </span>
                    )
                }

                // Override text value for exalted
                const displayValue = status === 'exalted' ? 120 : value

                return (
                    <Card
                        key={key}
                        className={`${cardClassName} group relative overflow-hidden`}
                    >
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${STAT_COLORS[k]} ${iconAura} relative overflow-hidden shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                                        <Icon className="w-5 h-5 text-white relative z-10" />
                                        {(status === 'exalted' || status === 'own_sign') && (
                                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className={`font-bold capitalize text-base sm:text-lg ${labelColor} leading-tight`}>
                                            {archetype}
                                        </h3>
                                        <span className="text-[10px] sm:text-xs opacity-70 font-medium flex items-center gap-1.5 mt-0.5">
                                            <PlanetIcon className="w-3 h-3" /> {planetName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
                                {description}
                            </p>

                            <div className="mt-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className={`font-bold text-lg sm:text-xl leading-none ${status === 'exalted' ? 'text-yellow-400' : status === 'own_sign' ? 'text-blue-300' : 'text-white'} transition-colors`}>
                                        {displayValue}%
                                    </span>
                                    {statusLabel}
                                </div>
                                <Progress 
                                    value={displayValue} 
                                    className={`h-2 sm:h-2.5 bg-black/50 rounded-full ${status === 'exalted' ? 'border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : status === 'own_sign' ? 'border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : ''}`}
                                    indicatorClassName={`${progressIndicatorClass} rounded-full transition-all duration-500`}
                                />
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
