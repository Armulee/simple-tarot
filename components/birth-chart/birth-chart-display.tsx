"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

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
    const formatDate = () => {
        const date = new Date(
            birthChart.year,
            birthChart.month - 1,
            birthChart.day
        )
        return date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        })
    }

    const formatTime = () => {
        const hours = birthChart.hour % 12 || 12
        const minutes = birthChart.minute.toString().padStart(2, "0")
        const ampm = birthChart.hour >= 12 ? "PM" : "AM"
        return `${hours}:${minutes} ${ampm}`
    }

    const formatLocation = () => {
        const parts = []
        if (birthChart.state_province) parts.push(birthChart.state_province)
        if (birthChart.country) parts.push(birthChart.country)
        return parts.length > 0 ? parts.join(", ") : "Unknown location"
    }

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
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-8'>
                        <div className='text-center'>
                            <p className='text-sm text-muted-foreground mb-1'>
                                Birth Date
                            </p>
                            <p className='font-semibold text-white'>
                                {formatDate()}
                            </p>
                        </div>
                        <div className='text-center'>
                            <p className='text-sm text-muted-foreground mb-1'>
                                Birth Time
                            </p>
                            <p className='font-semibold text-white'>
                                {formatTime()}
                            </p>
                        </div>
                        <div className='text-center'>
                            <p className='text-sm text-muted-foreground mb-1'>
                                Location
                            </p>
                            <p className='font-semibold text-white'>
                                {formatLocation()}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Houses */}
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
                                        {String(sign)}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </Card>
            )}

            {/* Planets */}
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
                                        {typeof position === "object" && position !== null
                                            ? JSON.stringify(position)
                                            : String(position)}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </Card>
            )}

            {/* Disclaimer */}
            <Card className='p-4 bg-card/5 backdrop-blur-sm border-border/10'>
                <p className='text-xs text-muted-foreground text-center'>
                    Birth chart readings are for entertainment purposes only. The
                    interpretations provided are generated by AI and should not
                    be considered as professional advice. Always consult with
                    qualified professionals for important life decisions.
                </p>
            </Card>
        </div>
    )
}
