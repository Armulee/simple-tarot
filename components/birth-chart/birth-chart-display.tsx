"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import BirthChartStats from "./birth-chart-stats"
import BirthChartWheel from "./birth-chart-wheel"
import BirthChartShareSection from "./birth-chart-share-section"
import BirthChartQuestion from "./birth-chart-question"
import BirthChartDebugSection from "./birth-chart-debug-section"
import BirthChartInfoCard from "./birth-chart-info-card"
import { AstroPoint } from "@/lib/birth-chart-utils"

interface BirthChartDisplayProps {
    birthChart: {
        id: string
        day: number
        month: number
        year: number
        hour: number
        minute: number
        timezone: number
        lat: number
        lng: number
        country?: string | null
        state_province?: string | null
        houses?: Record<string, unknown> | null
        planets?: Record<string, unknown> | null
        created_at: string
    }
}

export default function BirthChartDisplay({
    birthChart,
}: BirthChartDisplayProps) {
    return (
        <div className='space-y-8 px-4 max-w-4xl mx-auto h-full py-8'>
            {/* Header */}
            <Card className='px-6 pt-10 pb-6 border-0 relative overflow-hidden bg-gradient-to-br from-[#0A0F26] to-[#131A3A]'>
                <div className='text-center space-y-6 relative z-10'>
                    <div className='flex items-center justify-center space-x-2 relative'>
                        <Sparkles className='w-6 h-6 text-primary' />
                        <h1 className='font-serif font-bold text-2xl text-white'>
                            Your Birth Chart
                        </h1>
                        <Sparkles className='w-6 h-6 text-primary' />
                    </div>

                    {/* Birth Information */}
                    <BirthChartInfoCard birthChart={birthChart} />
                </div>
            </Card>

            {/* Wheel */}
            <div className="flex justify-center">
                <BirthChartWheel 
                    houses={birthChart.houses} 
                    planets={birthChart.planets} 
                />
            </div>

            {/* Stats */}
            <BirthChartStats planets={birthChart.planets} />

            {/* Houses Detail (Foldable or just listed) */}
            {birthChart.houses && (
                <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                    <h2 className='font-serif font-bold text-xl mb-4 text-white'>
                        Houses
                    </h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {Object.entries(birthChart.houses as Record<string, unknown>).map(
                            ([house, sign]: [string, unknown]) => (
                                <div
                                    key={house}
                                    className='p-4 rounded-lg bg-white/5 border border-white/10'
                                >
                                    <Badge variant='secondary' className='mb-2'>
                                        {house}
                                    </Badge>
                                    <p className='text-white font-semibold'>
                                        {typeof sign === "object" && sign !== null && "sign" in sign 
                                            ? (sign as AstroPoint).sign 
                                            : String(sign)}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </Card>
            )}

            {/* Planets Detail */}
            {birthChart.planets && (
                <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                    <h2 className='font-serif font-bold text-xl mb-4 text-white'>
                        Planetary Positions
                    </h2>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {Object.entries(birthChart.planets as Record<string, unknown>).map(
                            ([planet, position]: [string, unknown]) => (
                                <div
                                    key={planet}
                                    className='p-4 rounded-lg bg-white/5 border border-white/10'
                                >
                                    <Badge variant='secondary' className='mb-2'>
                                        {planet}
                                    </Badge>
                                    <p className='text-white font-semibold'>
                                        {typeof position === "object" && position !== null && "sign" in position
                                            ? (position as AstroPoint).sign
                                            : typeof position === "object"
                                                ? JSON.stringify(position)
                                                : String(position)}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </Card>
            )}

            {/* Share Section */}
            <BirthChartShareSection id={birthChart.id} />

            {/* Question Section */}
            <BirthChartQuestion 
                houses={birthChart.houses} 
                planets={birthChart.planets} 
            />

            {/* Disclaimer */}
            <Card className='p-4 bg-card/5 backdrop-blur-sm border-border/10'>
                <p className='text-xs text-muted-foreground text-center'>
                    Birth chart readings are for entertainment purposes only. The
                    interpretations provided are generated by AI and should not
                    be considered as professional advice. Always consult with
                    qualified professionals for important life decisions.
                </p>
            </Card>

            {/* Debug Section */}
            <BirthChartDebugSection data={birthChart} />
        </div>
    )
}
