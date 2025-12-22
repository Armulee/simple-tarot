"use client"

import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SummaryTab from "./summary-tab"
import InfoTab from "./info-tab"

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
    reading,
}: {
    reading: AstrologyReading
}) {
    return (
        <div className='space-y-10 px-4 max-w-5xl mx-auto h-full py-12'>
            <Card className='px-8 pt-12 pb-8 border-0 relative overflow-hidden bg-transparent shadow-2xl'>
                <div className='absolute inset-0 overflow-hidden'>
                    <div className='absolute -top-40 -right-40 w-80 h-80 bg-transparent rounded-full blur-3xl animate-pulse' />
                    <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-transparent rounded-full blur-3xl animate-pulse delay-1000' />
                </div>
                <div className='text-center space-y-6 relative z-10'>
                    <div className='flex items-center justify-center space-x-3 relative'>
                        <Sparkles className='w-7 h-7 text-accent animate-pulse' />
                        <h1 className='font-serif font-bold text-3xl sm:text-4xl text-white'>
                            Astrology Reading
                        </h1>
                        <Sparkles className='w-7 h-7 text-accent animate-pulse' />
                    </div>
                    {reading.question ? (
                        <p className='text-white/70 italic max-w-2xl mx-auto'>
                            &ldquo;{reading.question}&rdquo;
                        </p>
                    ) : null}
                </div>
            </Card>

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
                    <SummaryTab reading={reading} />
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
        </div>
    )
}
