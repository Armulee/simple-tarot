"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import { LocationSelector } from "@/components/ui/location-selector"
import { Calendar, Clock, MapPin, Loader2, Sparkles } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { TimePicker } from "@/components/ui/time-picker"
import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { useAuth } from "@/contexts/auth-context"

function getDeviceTimezone(): number {
    if (typeof window === "undefined") return 0
    try {
        const timezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        const now = new Date()
        const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
        const targetTime = new Date(
            utc.toLocaleString("en-US", { timeZone: timezone })
        )
        const offset = (targetTime.getTime() - utc.getTime()) / (1000 * 60 * 60)
        return Math.round(offset * 2) / 2
    } catch {
        return 0
    }
}

export default function BirthChart() {
    const router = useRouter()
    const { user } = useAuth()
    const [day, setDay] = useState("")
    const [month, setMonth] = useState("")
    const [year, setYear] = useState("")
    const [hour, setHour] = useState("")
    const [minute, setMinute] = useState("")
    const [country, setCountry] = useState<string>("")
    const [stateProv, setStateProv] = useState<string>("")
    const [timezone, setTimezone] = useState<number>(getDeviceTimezone())
    const [lat, setLat] = useState<string>("")
    const [lng, setLng] = useState<string>("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string>("")
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [timePickerOpen, setTimePickerOpen] = useState(false)

    function onCalendarSelect(date: Date | undefined) {
        if (!date) return
        setSelectedDate(date)
        const y = date.getFullYear().toString()
        const m = (date.getMonth() + 1).toString().padStart(2, "0")
        const d = date.getDate().toString().padStart(2, "0")
        setYear(y)
        setMonth(m)
        setDay(d)
        setCalendarOpen(false)
    }

    function onTimeSelect(time: { hour: string; minute: string }) {
        setHour(time.hour)
        setMinute(time.minute)
        setTimePickerOpen(false)
    }

    // Detect geolocation on mount
    useEffect(() => {
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

    // Resolve location from country/state
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
        const d = parseInt(day)
        const m = parseInt(month)
        const y = parseInt(year)
        const h = parseInt(hour)
        const min = parseInt(minute)
        const validDate =
            !Number.isNaN(d) &&
            !Number.isNaN(m) &&
            !Number.isNaN(y) &&
            d > 0 &&
            m > 0 &&
            m <= 12 &&
            y > 0
        const validTime =
            !Number.isNaN(h) &&
            !Number.isNaN(min) &&
            h >= 0 &&
            h <= 23 &&
            min >= 0 &&
            min <= 59
        const validGeo = !!timezone && lat !== "" && lng !== ""

        return validDate && validTime && validGeo
    }, [day, month, year, hour, minute, timezone, lat, lng])

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError("")

        try {
            const response = await fetch("/api/birth-chart/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    day,
                    month,
                    year,
                    hour,
                    minute,
                    timezone,
                    lat,
                    lng,
                    country: country || null,
                    state_prov: stateProv || null,
                    user_id: user?.id || null,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to create birth chart")
            }

            const data = await response.json()
            router.push(`/birth-chart/${data.id}`)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong"
            )
            setSubmitting(false)
        }
    }

    return (
        <div className='w-full max-w-4xl mx-auto px-4 space-y-8'>
            {/* Main Heading */}
            <div className='space-y-4 text-center'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance'>
                    <span className='text-white'>Discover Your</span>
                    <br />
                    <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        Cosmic Blueprint
                    </span>
                </h1>
                <p className='text-lg sm:text-xl text-white/70 max-w-2xl mx-auto'>
                    Enter your birth details to generate your personalized birth
                    chart
                </p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className='space-y-6'>
                {/* Date Inputs */}
                <div className='space-y-4'>
                    <div className='grid grid-cols-3 gap-4'>
                        <CustomDatePicker
                            value={day}
                            onChange={setDay}
                            min={1}
                            max={31}
                            placeholder={"DD"}
                            label={"Day"}
                        />
                        <CustomDatePicker
                            value={month}
                            onChange={setMonth}
                            min={1}
                            max={12}
                            placeholder={"MM"}
                            label={"Month"}
                        />
                        <CustomDatePicker
                            value={year}
                            onChange={setYear}
                            min={1900}
                            max={new Date().getFullYear()}
                            placeholder={"YYYY"}
                            label={"Year"}
                        />
                    </div>

                    <div className='flex items-center justify-center'>
                        <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    type='button'
                                    variant='outline'
                                    className='border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-2 rounded-xl'
                                >
                                    <Calendar className='w-4 h-4' /> Pick from
                                    Calendar
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-auto p-3 bg-black/80 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                <CalendarComponent
                                    mode='single'
                                    selected={selectedDate}
                                    onSelect={onCalendarSelect}
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
                </div>

                {/* Time Inputs */}
                <div className='space-y-4'>
                    <div className='grid grid-cols-2 gap-4'>
                        <CustomTimePicker
                            value={hour}
                            onChange={setHour}
                            min={0}
                            max={23}
                            placeholder={"HH"}
                            label={"Hour"}
                        />
                        <CustomTimePicker
                            value={minute}
                            onChange={setMinute}
                            min={0}
                            max={59}
                            placeholder={"MM"}
                            label={"Minute"}
                        />
                    </div>

                    <div className='flex items-center justify-center'>
                        <Popover
                            open={timePickerOpen}
                            onOpenChange={setTimePickerOpen}
                        >
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
                                    value={{ hour, minute }}
                                    onChange={onTimeSelect}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Location Selector */}
                <div className='space-y-4'>
                    <LocationSelector
                        selectedCountry={country}
                        selectedState={stateProv}
                        onCountryChange={setCountry}
                        onStateChange={setStateProv}
                    />

                    <div className='flex items-center justify-center'>
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
                    </div>
                </div>

                {/* Submit Button */}
                <div className='flex justify-center pt-4'>
                    <Button
                        type='submit'
                        disabled={!isValid || submitting}
                        className='card-glow min-w-[200px] h-14 text-lg font-semibold'
                    >
                        {submitting ? (
                            <span className='inline-flex items-center gap-2'>
                                <Loader2 className='w-5 h-5 animate-spin' />
                                Generating...
                            </span>
                        ) : (
                            <span className='inline-flex items-center gap-2'>
                                <Sparkles className='w-5 h-5' />
                                Generate Birth Chart
                            </span>
                        )}
                    </Button>
                </div>

                {error && (
                    <div className='text-center text-destructive text-sm'>
                        {error}
                    </div>
                )}
            </form>
        </div>
    )
}
