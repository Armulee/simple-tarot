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

// Local storage keys
const STORAGE_KEYS = {
    day: "horoscope_day",
    month: "horoscope_month",
    year: "horoscope_year",
    hour: "horoscope_hour",
    minute: "horoscope_minute",
    country: "horoscope_country",
    stateProv: "horoscope_stateProv",
    timezone: "horoscope_timezone",
    lat: "horoscope_lat",
    lng: "horoscope_lng",
}

// Helper functions for localStorage
function getStoredValue<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue
    try {
        const stored = localStorage.getItem(key)
        return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
        return defaultValue
    }
}

function setStoredValue<T>(key: string, value: T): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // Ignore storage errors
    }
}

export default function HoroscopeForm() {
    const [day, setDay] = useState("")
    const [month, setMonth] = useState("")
    const [year, setYear] = useState("")

    const [hour, setHour] = useState("")
    const [minute, setMinute] = useState("")

    // Country/State selection
    const [country, setCountry] = useState<string>("")
    const [stateProv, setStateProv] = useState<string>("")

    // Resolved geo fields (computed from selection or device location)
    const [timezone, setTimezone] = useState<number>(getDeviceTimezone())
    const [lat, setLat] = useState<string>("")
    const [lng, setLng] = useState<string>("")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string>("")

    const [result, setResult] = useState<{
        houses: unknown
        planets: unknown
    } | null>(null)

    // Calendar popover state
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined
    )

    // Time picker state
    const [timePickerOpen, setTimePickerOpen] = useState(false)

    // Load from localStorage after hydration
    useEffect(() => {
        setDay(getStoredValue(STORAGE_KEYS.day, ""))
        setMonth(getStoredValue(STORAGE_KEYS.month, ""))
        setYear(getStoredValue(STORAGE_KEYS.year, ""))
        setHour(getStoredValue(STORAGE_KEYS.hour, ""))
        setMinute(getStoredValue(STORAGE_KEYS.minute, ""))
        setCountry(getStoredValue(STORAGE_KEYS.country, ""))
        setStateProv(getStoredValue(STORAGE_KEYS.stateProv, ""))
        setTimezone(getStoredValue(STORAGE_KEYS.timezone, getDeviceTimezone()))
        setLat(getStoredValue(STORAGE_KEYS.lat, ""))
        setLng(getStoredValue(STORAGE_KEYS.lng, ""))
    }, [])

    // Save to localStorage whenever values change
    useEffect(() => {
        setStoredValue(STORAGE_KEYS.day, day)
    }, [day])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.month, month)
    }, [month])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.year, year)
    }, [year])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.hour, hour)
    }, [hour])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.minute, minute)
    }, [minute])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.country, country)
    }, [country])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.stateProv, stateProv)
    }, [stateProv])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.timezone, timezone)
    }, [timezone])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.lat, lat)
    }, [lat])

    useEffect(() => {
        setStoredValue(STORAGE_KEYS.lng, lng)
    }, [lng])

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
        } else {
        }
        // If resolution fails, keep current defaults
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
        setResult(null)
        try {
            const params = new URLSearchParams({
                day,
                month,
                year,
                hour,
                minute,
                timezone: timezone.toString(),
                lat,
                lng,
            })
            const res = await fetch(
                `/api/calculate-horoscope?${params.toString()}`
            )
            if (!res.ok) throw new Error("Failed to calculate horoscope")
            const data = await res.json()
            setResult(data)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong"
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={onSubmit} className='space-y-8'>
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

            <div className='flex items-center justify-end'>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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

            <div className='flex items-center justify-end'>
                <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
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

            <Separator className='bg-white/10' />

            {/* Country/State selection and resolved values */}
            <div className='space-y-4'>
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

            {result && (
                <Card className='bg-card/10 border-border/20'>
                    <CardHeader>
                        <CardTitle className='font-serif'>
                            Your Vedic Birth Chart
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div>
                                <h3 className='text-sm text-muted-foreground mb-2'>
                                    Houses
                                </h3>
                                <pre className='text-xs whitespace-pre-wrap break-words bg-white/5 p-3 rounded-md border border-white/10'>
                                    {JSON.stringify(result.houses, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <h3 className='text-sm text-muted-foreground mb-2'>
                                    Planets
                                </h3>
                                <pre className='text-xs whitespace-pre-wrap break-words bg-white/5 p-3 rounded-md border border-white/10'>
                                    {JSON.stringify(result.planets, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </form>
    )
}
