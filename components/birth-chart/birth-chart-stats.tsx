"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { calculateRPGStats, RPGStats, RPGStatType } from "@/lib/birth-chart-utils"
import { Shield, Heart, Zap, Brain, Sparkles, Crown, ArrowDown, Star } from "lucide-react"

interface BirthChartStatsProps {
    planets?: Record<string, unknown> | null
}

const STAT_ICONS = {
    leadership: Crown,
    charm: Heart,
    intellect: Brain,
    vitality: Shield,
    spirituality: Sparkles,
    creativity: Zap,
}

const STAT_COLORS = {
    leadership: "bg-yellow-500",
    charm: "bg-pink-500",
    intellect: "bg-blue-500",
    vitality: "bg-green-500",
    spirituality: "bg-purple-500",
    creativity: "bg-orange-500",
}

const STAT_DESCRIPTIONS = {
    leadership: "Authority, Command, Willpower",
    charm: "Social Grace, Attraction, Harmony",
    intellect: "Logic, Communication, Analysis",
    vitality: "Energy, Resilience, Physical Strength",
    spirituality: "Intuition, Faith, Inner Wisdom",
    creativity: "Innovation, Artistry, Expression",
}

export default function BirthChartStats({ planets }: BirthChartStatsProps) {
    const stats = useMemo(() => {
        if (!planets) return null
        return calculateRPGStats(planets)
    }, [planets])

    if (!stats) return null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(stats).map(([key, stat]) => {
                const k = key as RPGStatType
                const { value, status } = stat
                const Icon = STAT_ICONS[k]
                
                // Determine styling based on status
                let cardClassName = "p-4 bg-white/5 border-white/10 backdrop-blur-sm transition-all duration-500"
                let iconAura = ""
                let progressIndicatorClass = STAT_COLORS[k]
                let labelColor = "text-white"
                
                if (status === 'exalted') {
                    // Golden/Exalted styling
                    cardClassName = "p-4 bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-transparent border-yellow-500/30 backdrop-blur-sm shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                    iconAura = "shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    progressIndicatorClass = "bg-gradient-to-r from-yellow-400 to-amber-600"
                    labelColor = "text-yellow-200"
                } else if (status === 'debilitated') {
                    // Dark/Debilitated styling
                    cardClassName = "p-4 bg-gradient-to-br from-gray-900/40 to-black/40 border-gray-700/30 backdrop-blur-sm"
                    iconAura = "opacity-80 grayscale"
                    progressIndicatorClass = "bg-gray-600"
                    labelColor = "text-gray-400"
                }

                return (
                    <Card
                        key={key}
                        className={cardClassName}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${STAT_COLORS[k]} ${iconAura} relative overflow-hidden`}>
                                    {/* Icon Box with stat color bg */}
                                    {/* Icon itself is white, no bg */}
                                    <Icon className="w-5 h-5 text-white relative z-10" />
                                    
                                    {/* Shine effect for exalted */}
                                    {status === 'exalted' && (
                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className={`font-bold capitalize flex items-center gap-2 ${labelColor}`}>
                                        {key}
                                        {status === 'exalted' && (
                                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
                                        )}
                                        {status === 'debilitated' && (
                                            <ArrowDown className="w-3 h-3 text-gray-500" />
                                        )}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {STAT_DESCRIPTIONS[k]}
                                    </p>
                                </div>
                            </div>
                            <span className={`font-bold text-lg ${status === 'exalted' ? 'text-yellow-400' : 'text-white'}`}>
                                {value}%
                            </span>
                        </div>
                        <Progress 
                            value={value} 
                            className={`h-2 bg-black/40 ${status === 'exalted' ? 'border border-yellow-500/20' : ''}`}
                            indicatorClassName={progressIndicatorClass}
                        />
                    </Card>
                )
            })}
        </div>
    )
}
