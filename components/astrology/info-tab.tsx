"use client"

import { Card } from "@/components/ui/card"

function formatDate(d: {
    day: number
    month: number
    year: number
    hour: number
    minute: number
}) {
    const date = new Date(d.year, d.month - 1, d.day)
    const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    })
    const h = d.hour
    const ampm = h >= 12 ? "PM" : "AM"
    const displayHour = h % 12 || 12
    const timeStr = `${displayHour}:${String(d.minute).padStart(2, "0")} ${ampm}`
    return { dateStr, timeStr }
}

export default function InfoTab({
    title,
    date,
    location,
    houses,
    planets,
}: {
    title: string
    date: { day: number; month: number; year: number; hour: number; minute: number }
    location: {
        country: string
        state: string
        lat: number
        lng: number
        timezone: number
    }
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}) {
    const { dateStr, timeStr } = formatDate(date)
    const locationLabel = [location.state, location.country]
        .filter(Boolean)
        .join(", ")

    return (
        <div className='space-y-6'>
            <Card className='p-6 bg-card/10 border-border/20'>
                <h2 className='font-serif font-semibold text-xl text-white mb-4'>
                    {title}
                </h2>

                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm'>
                    <div className='rounded-lg bg-white/5 border border-white/10 p-4'>
                        <div className='text-white/60 text-xs uppercase tracking-wide mb-1'>
                            Date
                        </div>
                        <div className='text-white font-medium'>{dateStr}</div>
                    </div>
                    <div className='rounded-lg bg-white/5 border border-white/10 p-4'>
                        <div className='text-white/60 text-xs uppercase tracking-wide mb-1'>
                            Time
                        </div>
                        <div className='text-white font-medium'>{timeStr}</div>
                    </div>
                    <div className='rounded-lg bg-white/5 border border-white/10 p-4'>
                        <div className='text-white/60 text-xs uppercase tracking-wide mb-1'>
                            Location
                        </div>
                        <div className='text-white font-medium truncate'>
                            {locationLabel || "Unknown"}
                        </div>
                        <div className='text-white/50 text-xs mt-1'>
                            TZ {location.timezone} · {location.lat.toFixed(3)},{" "}
                            {location.lng.toFixed(3)}
                        </div>
                    </div>
                </div>
            </Card>

            {(houses || planets) && (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    <Card className='p-5 bg-card/10 border-border/20'>
                        <h3 className='text-sm text-white/70 mb-3'>Houses</h3>
                        <pre className='text-xs whitespace-pre-wrap break-words bg-white/5 p-3 rounded-md border border-white/10 text-white/90'>
                            {JSON.stringify(houses ?? {}, null, 2)}
                        </pre>
                    </Card>
                    <Card className='p-5 bg-card/10 border-border/20'>
                        <h3 className='text-sm text-white/70 mb-3'>Planets</h3>
                        <pre className='text-xs whitespace-pre-wrap break-words bg-white/5 p-3 rounded-md border border-white/10 text-white/90'>
                            {JSON.stringify(planets ?? {}, null, 2)}
                        </pre>
                    </Card>
                </div>
            )}
        </div>
    )
}


