"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
import { TypewriterText } from "../../typewriter-text"
import { ChevronDown } from "lucide-react"

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
    const t = useTranslations("Home")
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

    // Sync selectedDate with day/month/year
    useEffect(() => {
        if (day && month && year) {
            try {
                const date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day)
                )
                if (!isNaN(date.getTime())) {
                    setSelectedDate(date)
                }
            } catch {
                // Ignore invalid dates
            }
        }
    }, [day, month, year])

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

    // Format date display
    const formattedDate = useMemo(() => {
        if (day && month && year) {
            try {
                const date = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day)
                )
                return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })
            } catch {
                return ""
            }
        }
        return ""
    }, [day, month, year])

    const formattedTime = useMemo(() => {
        if (hour && minute) {
            const h = parseInt(hour)
            const m = parseInt(minute)
            const h12 = h % 12 || 12
            const ampm = h >= 12 ? "PM" : "AM"
            return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
        }
        return ""
    }, [hour, minute])

    return (
        <div className='w-full max-w-3xl mx-auto px-4 space-y-8'>
            {/* Main Heading with Typewriter */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <TypewriterText
                        text={t("birthChart.line1")}
                        speed={60}
                        className='text-white'
                    />
                    <br />
                    <TypewriterText
                        text={t("birthChart.line2")}
                        speed={60}
                        delay={60 * t("birthChart.line1").length}
                        className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                    />
                </h1>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className='space-y-6'>
                {/* Compact Date & Time Display */}
                <div className='flex flex-col items-center gap-3 w-full max-w-md mx-auto'>
                    {/* Date Display */}
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                type='button'
                                variant='outline'
                                className='w-full border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-3 rounded-xl h-14 text-base transition-all duration-200'
                            >
                                <Calendar className='w-4 h-4 shrink-0' />
                                <span className='flex-1 text-left font-medium'>
                                    {formattedDate || (
                                        <span className='text-white/50 font-normal'>
                                            Select birth date
                                        </span>
                                    )}
                                </span>
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

                    {/* Time Display */}
                    <Popover
                        open={timePickerOpen}
                        onOpenChange={setTimePickerOpen}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                type='button'
                                variant='outline'
                                className='w-full border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 gap-3 rounded-xl h-14 text-base transition-all duration-200'
                            >
                                <Clock className='w-4 h-4 shrink-0' />
                                <span className='flex-1 text-left font-medium'>
                                    {formattedTime || (
                                        <span className='text-white/50 font-normal'>
                                            Select birth time
                                        </span>
                                    )}
                                </span>
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

            {/* Learn More Button */}
            <button
                type='button'
                className='flex flex-col items-center gap-2 text-white/80 hover:text-white mx-auto'
                onClick={() => {
                    const event = new CustomEvent("scrollToAbout")
                    window.dispatchEvent(event)
                }}
            >
                <div className='flex items-center gap-4'>
                    <div className='h-px w-12 bg-white/30' />
                    <span className='text-xs uppercase tracking-wide'>
                        Learn more
                    </span>
                    <div className='h-px w-12 bg-white/30' />
                </div>
                <ChevronDown className='w-5 h-5 animate-bounce' />
            </button>
        </div>
    )
}
