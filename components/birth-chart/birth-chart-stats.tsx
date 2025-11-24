"use client"

import { useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { calculateRPGStats, RPGStats } from "@/lib/birth-chart-utils"
import { Shield, Heart, Zap, Brain, Sparkles, Crown } from "lucide-react"

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
            {Object.entries(stats).map(([key, value]) => {
                const k = key as keyof RPGStats
                const Icon = STAT_ICONS[k]
                return (
                    <Card
                        key={key}
                        className="p-4 bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${STAT_COLORS[k]} bg-opacity-20`}>
                                    <Icon className={`w-4 h-4 ${STAT_COLORS[k].replace('bg-', 'text-')}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white capitalize">
                                        {key}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {STAT_DESCRIPTIONS[k]}
                                    </p>
                                </div>
                            </div>
                            <span className="font-bold text-lg text-white">
                                {value}%
                            </span>
                        </div>
                        <Progress 
                            value={value} 
                            className="h-2 bg-black/40" 
                            indicatorClassName={STAT_COLORS[k]}
                        />
                    </Card>
                )
            })}
        </div>
    )
}
