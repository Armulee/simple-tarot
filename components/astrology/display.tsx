"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SummaryTab from "./summary-tab"
import InfoTab from "./info-tab"
import SideWheel from "./side-wheel"
import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"

function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return "th"
    switch (day % 10) {
        case 1:
            return "st"
        case 2:
            return "nd"
        case 3:
            return "rd"
        default:
            return "th"
    }
}

export type AstrologyReading = {
    id: string
    created_at?: string
    updated_at?: string
    owner_user_id?: string | null
    did?: string | null

    birth_day: number
    birth_month: number
    birth_year: number
    birth_hour: number
    birth_minute: number
    birth_timezone: number
    birth_lat: number
    birth_lng: number
    birth_country?: string | null
    birth_state_province?: string | null

    transit_day: number
    transit_month: number
    transit_year: number
    transit_hour: number
    transit_minute: number
    transit_timezone: number
    transit_lat: number
    transit_lng: number
    transit_country?: string | null
    transit_state_province?: string | null

    question?: string | null
    summary?: string | null

    birth_houses?: Record<string, unknown> | null
    birth_planets?: Record<string, unknown> | null
    transit_houses?: Record<string, unknown> | null
    transit_planets?: Record<string, unknown> | null
}

export default function AstrologyDisplay({
    reading: initialReading,
}: {
    reading: AstrologyReading
}) {
    const [reading, setReading] = useState(initialReading)

    // Sync state with initialReading prop if it changes externally
    useEffect(() => {
        setReading(initialReading)
    }, [initialReading])

    const handleSummaryGenerated = (summary: string) => {
        setReading((prev) => ({ ...prev, summary }))
    }

    const tReading = useTranslations("ReadingPage")

    return (
        <div className='relative space-y-10 px-4 max-w-5xl mx-auto h-full pb-2 pt-12'>
            <SideWheel
                side='left'
                planets={reading.birth_planets}
                houses={reading.birth_houses}
                title='Birth Chart'
                subtitle='Natal'
            />
            <SideWheel
                side='right'
                planets={reading.transit_planets}
                houses={reading.transit_houses}
                title='Transit Sky'
                subtitle='Current'
            />
            <div className='text-center space-y-1 mb-4'>
                <p className='text-white/50 text-xs font-medium uppercase tracking-[0.2em]'>
                    Birth Chart Baseline
                </p>
                <div className='text-white text-3xl font-serif font-bold flex items-center justify-center'>
                    <span>{reading.birth_year}</span>
                    <span className='mx-2 opacity-30'>,</span>
                    <span>
                        {
                            [
                                "Jan",
                                "Feb",
                                "Mar",
                                "Apr",
                                "May",
                                "Jun",
                                "Jul",
                                "Aug",
                                "Sep",
                                "Oct",
                                "Nov",
                                "Dec",
                            ][reading.birth_month - 1]
                        }
                    </span>
                    <span className='ml-2'>{reading.birth_day}</span>
                    <span className='text-base self-start mt-1 opacity-70'>
                        {getOrdinalSuffix(reading.birth_day)}
                    </span>
                </div>
            </div>

            <Tabs defaultValue='summary' className='space-y-6'>
                <div className='flex justify-center'>
                    <TabsList>
                        <TabsTrigger value='summary'>Summary</TabsTrigger>
                        <TabsTrigger value='birth'>
                            Birth information
                        </TabsTrigger>
                        <TabsTrigger value='transit'>
                            Transit information
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value='summary' className='space-y-4'>
                    <SummaryTab
                        reading={reading}
                        onSummaryGenerated={handleSummaryGenerated}
                    />
                </TabsContent>

                <TabsContent value='birth' className='space-y-4'>
                    <InfoTab
                        title='Birth information'
                        date={{
                            day: reading.birth_day,
                            month: reading.birth_month,
                            year: reading.birth_year,
                            hour: reading.birth_hour,
                            minute: reading.birth_minute,
                        }}
                        location={{
                            country: reading.birth_country ?? "",
                            state: reading.birth_state_province ?? "",
                            lat: reading.birth_lat,
                            lng: reading.birth_lng,
                            timezone: reading.birth_timezone,
                        }}
                        houses={reading.birth_houses}
                        planets={reading.birth_planets}
                    />
                </TabsContent>

                <TabsContent value='transit' className='space-y-4'>
                    <InfoTab
                        title='Transit information'
                        date={{
                            day: reading.transit_day,
                            month: reading.transit_month,
                            year: reading.transit_year,
                            hour: reading.transit_hour,
                            minute: reading.transit_minute,
                        }}
                        location={{
                            country: reading.transit_country ?? "",
                            state: reading.transit_state_province ?? "",
                            lat: reading.transit_lat,
                            lng: reading.transit_lng,
                            timezone: reading.transit_timezone,
                        }}
                        houses={reading.transit_houses}
                        planets={reading.transit_planets}
                    />
                </TabsContent>
            </Tabs>

            {/* Disclaimer */}
            <Card className='p-6 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border-white/10 shadow-lg'>
                <p className='text-xs text-muted-foreground text-center leading-relaxed'>
                    {tReading("disclaimer")}
                </p>
            </Card>
        </div>
    )
}
