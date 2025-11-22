import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Calendar, Clock, MapPin } from "lucide-react"

async function getBirthChart(id: string) {
    const { data } = await supabase
        .from("birth_charts")
        .select("*")
        .eq("id", id)
        .maybeSingle()
    return data
}

function formatDate(day: number, month: number, year: number): string {
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

function formatTime(hour: number, minute: number): string {
    const h = hour % 12 || 12
    const m = minute.toString().padStart(2, "0")
    const ampm = hour >= 12 ? "PM" : "AM"
    return `${h}:${m} ${ampm}`
}

export default async function BirthChartPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getBirthChart(id)
    if (!data) return notFound()

    const houses = data.houses as Record<string, unknown>
    const planets = data.planets as Record<string, unknown>

    return (
        <div className='min-h-screen relative overflow-hidden py-12 px-4'>
            <div className='max-w-6xl mx-auto space-y-8'>
                {/* Header */}
                <div className='text-center space-y-4'>
                    <div className='flex items-center justify-center gap-2'>
                        <Sparkles className='w-8 h-8 text-primary' />
                        <h1 className='font-serif font-bold text-4xl md:text-5xl text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                            Your Birth Chart
                        </h1>
                        <Sparkles className='w-8 h-8 text-primary' />
                    </div>
                    <p className='text-lg text-muted-foreground'>
                        Your cosmic blueprint revealed
                    </p>
                </div>

                {/* Birth Details */}
                <Card className='bg-card/10 backdrop-blur-sm border-border/20'>
                    <CardHeader>
                        <CardTitle className='font-serif flex items-center gap-2'>
                            <Calendar className='w-5 h-5' />
                            Birth Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                    <Calendar className='w-4 h-4' />
                                    <span>Date</span>
                                </div>
                                <p className='text-lg font-semibold'>
                                    {formatDate(data.day, data.month, data.year)}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                    <Clock className='w-4 h-4' />
                                    <span>Time</span>
                                </div>
                                <p className='text-lg font-semibold'>
                                    {formatTime(data.hour, data.minute)}
                                </p>
                            </div>
                            {data.country && (
                                <div className='space-y-2'>
                                    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                        <MapPin className='w-4 h-4' />
                                        <span>Location</span>
                                    </div>
                                    <p className='text-lg font-semibold'>
                                        {data.country}
                                        {data.state_prov && `, ${data.state_prov}`}
                                    </p>
                                </div>
                            )}
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                    <span>Coordinates</span>
                                </div>
                                <p className='text-lg font-semibold'>
                                    {data.lat}, {data.lng}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Planets */}
                {planets && Object.keys(planets).length > 0 && (
                    <Card className='bg-card/10 backdrop-blur-sm border-border/20'>
                        <CardHeader>
                            <CardTitle className='font-serif'>
                                Planetary Positions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                                {Object.entries(planets).map(([planet, data]) => {
                                    const planetData = data as {
                                        sign?: string
                                        degree?: number
                                        house?: number
                                    }
                                    return (
                                        <div
                                            key={planet}
                                            className='p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors'
                                        >
                                            <div className='flex items-center justify-between mb-2'>
                                                <span className='font-semibold capitalize'>
                                                    {planet}
                                                </span>
                                                {planetData.house !== undefined && (
                                                    <Badge variant='secondary'>
                                                        House {planetData.house}
                                                    </Badge>
                                                )}
                                            </div>
                                            {planetData.sign && (
                                                <div className='text-sm text-muted-foreground'>
                                                    {planetData.sign}
                                                    {planetData.degree !== undefined &&
                                                        ` ${planetData.degree.toFixed(2)}°`}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Houses */}
                {houses && Object.keys(houses).length > 0 && (
                    <Card className='bg-card/10 backdrop-blur-sm border-border/20'>
                        <CardHeader>
                            <CardTitle className='font-serif'>Houses</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                                {Object.entries(houses).map(([house, data]) => {
                                    const houseData = data as {
                                        sign?: string
                                        degree?: number
                                    }
                                    return (
                                        <div
                                            key={house}
                                            className='p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-center'
                                        >
                                            <div className='font-semibold mb-2'>
                                                {house}
                                            </div>
                                            {houseData.sign && (
                                                <div className='text-sm text-muted-foreground'>
                                                    {houseData.sign}
                                                    {houseData.degree !== undefined &&
                                                        ` ${houseData.degree.toFixed(2)}°`}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Raw Data (for debugging/advanced users) */}
                <Card className='bg-card/5 backdrop-blur-sm border-border/10'>
                    <CardHeader>
                        <CardTitle className='font-serif text-sm'>
                            Technical Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div>
                                <h3 className='text-sm text-muted-foreground mb-2'>
                                    Houses Data
                                </h3>
                                <pre className='text-xs whitespace-pre-wrap break-words bg-white/5 p-3 rounded-md border border-white/10 overflow-auto max-h-64'>
                                    {JSON.stringify(houses, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <h3 className='text-sm text-muted-foreground mb-2'>
                                    Planets Data
                                </h3>
                                <pre className='text-xs whitespace-pre-wrap break-words bg-white/5 p-3 rounded-md border border-white/10 overflow-auto max-h-64'>
                                    {JSON.stringify(planets, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Disclaimer */}
                <Card className='p-4 bg-card/5 backdrop-blur-sm border-border/10'>
                    <p className='text-xs text-muted-foreground text-center'>
                        Birth chart readings are for entertainment and
                        educational purposes only. The interpretations provided
                        are based on Vedic astrology principles and should not
                        be considered as professional advice. Always consult with
                        qualified professionals for important life decisions.
                    </p>
                </Card>
            </div>
        </div>
    )
}
