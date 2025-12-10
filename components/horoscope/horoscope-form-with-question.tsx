"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import { Loader2, Calendar, Clock, MapPin } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { TimePicker } from "@/components/ui/time-picker"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { LocationSelector } from "@/components/ui/location-selector"
import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { Textarea } from "@/components/ui/textarea"
import { useCompletion } from "@ai-sdk/react"

function getDeviceTimezone(): number {
    if (typeof window === "undefined") return 0 // Server-side fallback
    try {
        const timezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        // Convert timezone name to numeric offset
        const now = new Date()
        const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
        const targetTime = new Date(
            utc.toLocaleString("en-US", { timeZone: timezone })
        )
        const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60)

        return Math.round(offset * 2) / 2 // Round to nearest 0.5
    } catch {
        return 0 // UTC fallback
    }
}

export default function HoroscopeFormWithQuestion() {
    // Birth date and time
    const [birthDay, setBirthDay] = useState("")
    const [birthMonth, setBirthMonth] = useState("")
    const [birthYear, setBirthYear] = useState("")
    const [birthHour, setBirthHour] = useState("")
    const [birthMinute, setBirthMinute] = useState("")

    // Transit date and time
    const [transitDay, setTransitDay] = useState("")
    const [transitMonth, setTransitMonth] = useState("")
    const [transitYear, setTransitYear] = useState("")
    const [transitHour, setTransitHour] = useState("")
    const [transitMinute, setTransitMinute] = useState("")

    // Question
    const [question, setQuestion] = useState("")

    // Country/State selection
    const [country, setCountry] = useState<string>("")
    const [stateProv, setStateProv] = useState<string>("")

    // Resolved geo fields (computed from selection or device location)
    const [timezone, setTimezone] = useState<number>(getDeviceTimezone())
    const [lat, setLat] = useState<string>("")
    const [lng, setLng] = useState<string>("")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string>("")

    // Calendar popover states
    const [birthCalendarOpen, setBirthCalendarOpen] = useState(false)
    const [birthSelectedDate, setBirthSelectedDate] = useState<Date | undefined>(undefined)
    const [transitCalendarOpen, setTransitCalendarOpen] = useState(false)
    const [transitSelectedDate, setTransitSelectedDate] = useState<Date | undefined>(undefined)

    // Time picker states
    const [birthTimePickerOpen, setBirthTimePickerOpen] = useState(false)
    const [transitTimePickerOpen, setTransitTimePickerOpen] = useState(false)

    const { completion, complete } = useCompletion({
        api: "/api/horoscope/generate",
        onFinish: () => {
            setSubmitting(false)
        },
        onError: (e) => {
            setError(e.message)
            setSubmitting(false)
        },
    })

    function onBirthCalendarSelect(date: Date | undefined) {
        if (!date) return
        setBirthSelectedDate(date)
        const y = date.getFullYear().toString()
        const m = (date.getMonth() + 1).toString().padStart(2, "0")
        const d = date.getDate().toString().padStart(2, "0")
        setBirthYear(y)
        setBirthMonth(m)
        setBirthDay(d)
        setBirthCalendarOpen(false)
    }

    function onTransitCalendarSelect(date: Date | undefined) {
        if (!date) return
        setTransitSelectedDate(date)
        const y = date.getFullYear().toString()
        const m = (date.getMonth() + 1).toString().padStart(2, "0")
        const d = date.getDate().toString().padStart(2, "0")
        setTransitYear(y)
        setTransitMonth(m)
        setTransitDay(d)
        setTransitCalendarOpen(false)
    }

    function onBirthTimeSelect(time: { hour: string; minute: string }) {
        setBirthHour(time.hour)
        setBirthMinute(time.minute)
        setBirthTimePickerOpen(false)
    }

    function onTransitTimeSelect(time: { hour: string; minute: string }) {
        setTransitHour(time.hour)
        setTransitMinute(time.minute)
        setTransitTimePickerOpen(false)
    }

    // Detect geolocation on mount only if no stored location data
    useEffect(() => {
        // Only detect location if we don't have stored lat/lng
        if (lat && lng) return

        if (navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const latNum = pos.coords.latitude
                    const lngNum = pos.coords.longitude
                    const resolved = await resolveLocationFromCoords(
                        latNum,
                        lngNum
                    )
                    setLat(latNum.toFixed(6))
                    setLng(lngNum.toFixed(6))
                    if (resolved?.timezone !== undefined)
                        setTimezone(resolved.timezone)
                },
                () => {
                    // Ignore geolocation errors
                },
                { enableHighAccuracy: true, timeout: 8000 }
            )
        }
    }, [lat, lng])

    // Fallback: if we have country but no lat/lng, try to resolve again
    useEffect(() => {
        if (country && (!lat || !lng)) {
            const resolved = resolveLocationFromCountryState(
                country,
                stateProv || undefined
            )
            if (resolved) {
                setTimezone(resolved.timezone)
                setLat(resolved.latitude.toFixed(6))
                setLng(resolved.longitude.toFixed(6))
            }
        }
    }, [country, stateProv, lat, lng])

    // When user selects country/state, resolve coordinates and timezone
    useEffect(() => {
        if (!country) return
        const resolved = resolveLocationFromCountryState(
            country,
            stateProv || undefined
        )
        if (resolved) {
            setTimezone(resolved.timezone)
            setLat(resolved.latitude.toFixed(6))
            setLng(resolved.longitude.toFixed(6))
        }
    }, [country, stateProv])

    const isValid = useMemo(() => {
        const bd = parseInt(birthDay)
        const bm = parseInt(birthMonth)
        const by = parseInt(birthYear)
        const bh = parseInt(birthHour)
        const bmin = parseInt(birthMinute)
        
        const td = parseInt(transitDay)
        const tm = parseInt(transitMonth)
        const ty = parseInt(transitYear)
        const th = parseInt(transitHour)
        const tmin = parseInt(transitMinute)

        const validBirthDate =
            !Number.isNaN(bd) &&
            !Number.isNaN(bm) &&
            !Number.isNaN(by) &&
            bd > 0 &&
            bm > 0 &&
            bm <= 12 &&
            by > 0

        const validBirthTime =
            !Number.isNaN(bh) &&
            !Number.isNaN(bmin) &&
            bh >= 0 &&
            bh <= 23 &&
            bmin >= 0 &&
            bmin <= 59

        const validTransitDate =
            !Number.isNaN(td) &&
            !Number.isNaN(tm) &&
            !Number.isNaN(ty) &&
            td > 0 &&
            tm > 0 &&
            tm <= 12 &&
            ty > 0

        const validTransitTime =
            !Number.isNaN(th) &&
            !Number.isNaN(tmin) &&
            th >= 0 &&
            th <= 23 &&
            tmin >= 0 &&
            tmin <= 59

        const validGeo = !!timezone && lat !== "" && lng !== ""
        const validQuestion = question.trim().length > 0

        return validBirthDate && validBirthTime && validTransitDate && validTransitTime && validGeo && validQuestion
    }, [birthDay, birthMonth, birthYear, birthHour, birthMinute, transitDay, transitMonth, transitYear, transitHour, transitMinute, timezone, lat, lng, question])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError("")
        
        try {
            const birthDateStr = `${birthDay} ${getMonthName(parseInt(birthMonth))} ${birthYear}`
            const birthTimeStr = `${birthHour.padStart(2, "0")}:${birthMinute.padStart(2, "0")}${parseInt(birthHour) >= 12 ? "PM" : "AM"}`
            const transitDateStr = `${transitDay} ${getMonthName(parseInt(transitMonth))} ${transitYear}`
            const transitTimeStr = `${transitHour.padStart(2, "0")}:${transitMinute.padStart(2, "0")}${parseInt(transitHour) >= 12 ? "PM" : "AM"}`
            
            const locationStr = country || "Unknown Location"
            
            // useCompletion sends { prompt: string } in the body
            const prompt = JSON.stringify({
                birthDay,
                birthMonth,
                birthYear,
                birthHour,
                birthMinute,
                transitDay,
                transitMonth,
                transitYear,
                transitHour,
                transitMinute,
                timezone: timezone.toString(),
                lat,
                lng,
                question,
                birthDateStr,
                birthTimeStr,
                transitDateStr,
                transitTimeStr,
                locationStr,
            })

            await complete(prompt)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong"
            )
            setSubmitting(false)
        }
    }

    function getMonthName(month: number): string {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ]
        return months[month - 1] || ""
    }

    return (
        <form onSubmit={onSubmit} className='space-y-8'>
            {/* Question Input */}
            <div className='space-y-4'>
                <h2 className='text-xl font-semibold mb-4'>Your Question</h2>
                <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask your question for the horoscope reading..."
                    className='min-h-24 text-base'
                />
            </div>

            <Separator className='bg-white/10' />

            {/* Birth Information */}
            <div className='space-y-4'>
                <h2 className='text-xl font-semibold mb-4'>Birth Information</h2>
                
                <div className='grid grid-cols-3 gap-4'>
                    <CustomDatePicker
                        value={birthDay}
                        onChange={setBirthDay}
                        min={1}
                        max={31}
                        placeholder={"DD"}
                        label={"Day"}
                    />
                    <CustomDatePicker
                        value={birthMonth}
                        onChange={setBirthMonth}
                        min={1}
                        max={12}
                        placeholder={"MM"}
                        label={"Month"}
                    />
                    <CustomDatePicker
                        value={birthYear}
                        onChange={setBirthYear}
                        min={1900}
                        max={new Date().getFullYear()}
                        placeholder={"YYYY"}
                        label={"Year"}
                    />
                </div>

                <div className='flex items-center justify-end'>
                    <Popover open={birthCalendarOpen} onOpenChange={setBirthCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type='button'
                                variant='outline'
                                className='border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-2 rounded-xl'
                            >
                                <Calendar className='w-4 h-4' /> Pick from Calendar
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                            <CalendarComponent
                                mode='single'
                                selected={birthSelectedDate}
                                onSelect={onBirthCalendarSelect}
                                captionLayout='dropdown'
                                disabled={(date) =>
                                    date > new Date() ||
                                    date < new Date("1900-01-01")
                                }
                                className='rounded-md border-0 bg-transparent'
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                    <CustomTimePicker
                        value={birthHour}
                        onChange={setBirthHour}
                        min={0}
                        max={23}
                        placeholder={"HH"}
                        label={"Hour"}
                    />
                    <CustomTimePicker
                        value={birthMinute}
                        onChange={setBirthMinute}
                        min={0}
                        max={59}
                        placeholder={"MM"}
                        label={"Minute"}
                    />
                </div>

                <div className='flex items-center justify-end'>
                    <Popover open={birthTimePickerOpen} onOpenChange={setBirthTimePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type='button'
                                variant='outline'
                                className='border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-2 rounded-xl'
                            >
                                <Clock className='w-4 h-4' /> Pick from Clock
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                            <TimePicker
                                value={{ hour: birthHour, minute: birthMinute }}
                                onChange={onBirthTimeSelect}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Separator className='bg-white/10' />

            {/* Transit Information */}
            <div className='space-y-4'>
                <h2 className='text-xl font-semibold mb-4'>Transit Date & Time</h2>
                
                <div className='grid grid-cols-3 gap-4'>
                    <CustomDatePicker
                        value={transitDay}
                        onChange={setTransitDay}
                        min={1}
                        max={31}
                        placeholder={"DD"}
                        label={"Day"}
                    />
                    <CustomDatePicker
                        value={transitMonth}
                        onChange={setTransitMonth}
                        min={1}
                        max={12}
                        placeholder={"MM"}
                        label={"Month"}
                    />
                    <CustomDatePicker
                        value={transitYear}
                        onChange={setTransitYear}
                        min={1900}
                        max={new Date().getFullYear() + 10}
                        placeholder={"YYYY"}
                        label={"Year"}
                    />
                </div>

                <div className='flex items-center justify-end'>
                    <Popover open={transitCalendarOpen} onOpenChange={setTransitCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type='button'
                                variant='outline'
                                className='border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-2 rounded-xl'
                            >
                                <Calendar className='w-4 h-4' /> Pick from Calendar
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                            <CalendarComponent
                                mode='single'
                                selected={transitSelectedDate}
                                onSelect={onTransitCalendarSelect}
                                captionLayout='dropdown'
                                disabled={(date) =>
                                    date < new Date("1900-01-01")
                                }
                                className='rounded-md border-0 bg-transparent'
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                    <CustomTimePicker
                        value={transitHour}
                        onChange={setTransitHour}
                        min={0}
                        max={23}
                        placeholder={"HH"}
                        label={"Hour"}
                    />
                    <CustomTimePicker
                        value={transitMinute}
                        onChange={setTransitMinute}
                        min={0}
                        max={59}
                        placeholder={"MM"}
                        label={"Minute"}
                    />
                </div>

                <div className='flex items-center justify-end'>
                    <Popover open={transitTimePickerOpen} onOpenChange={setTransitTimePickerOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type='button'
                                variant='outline'
                                className='border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-2 rounded-xl'
                            >
                                <Clock className='w-4 h-4' /> Pick from Clock
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                            <TimePicker
                                value={{ hour: transitHour, minute: transitMinute }}
                                onChange={onTransitTimeSelect}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <Separator className='bg-white/10' />

            {/* Location Information */}
            <div className='space-y-4'>
                <h2 className='text-xl font-semibold mb-4'>Birth Location</h2>
                <LocationSelector
                    selectedCountry={country}
                    selectedState={stateProv}
                    onCountryChange={setCountry}
                    onStateChange={setStateProv}
                />
            </div>

            <div className='flex justify-between items-center gap-3'>
                <Button
                    type='button'
                    variant='outline'
                    onClick={() => {
                        if (navigator?.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                    const latNum = pos.coords.latitude
                                    const lngNum = pos.coords.longitude
                                    const resolved =
                                        await resolveLocationFromCoords(
                                            latNum,
                                            lngNum
                                        )
                                    setLat(latNum.toFixed(6))
                                    setLng(lngNum.toFixed(6))
                                    if (resolved?.timezone !== undefined)
                                        setTimezone(resolved.timezone)
                                },
                                () => {
                                    // Ignore geolocation errors
                                },
                                { enableHighAccuracy: true, timeout: 8000 }
                            )
                        }
                    }}
                    className='border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-2'
                >
                    <MapPin className='w-4 h-4' /> Use My Location
                </Button>

                <Button
                    type='submit'
                    disabled={!isValid || submitting}
                    className='card-glow'
                >
                    {submitting ? (
                        <span className='inline-flex items-center gap-2'>
                            <Loader2 className='w-4 h-4 animate-spin' />{" "}
                            Generating...
                        </span>
                    ) : (
                        "Generate Horoscope"
                    )}
                </Button>
            </div>

            {!!error && <div className='text-destructive text-sm'>{error}</div>}

            {completion && (
                <Card className='bg-card/10 border-border/20'>
                    <CardHeader>
                        <CardTitle className='font-serif'>
                            Your Horoscope Reading
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='prose prose-invert max-w-none'>
                            <div className='text-foreground leading-relaxed whitespace-pre-wrap'>
                                {completion}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </form>
    )
}
