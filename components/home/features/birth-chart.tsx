"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import {
    CalendarDays,
    Clock,
    Loader2,
    MapPin,
    Sparkles,
    Stars,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"

function getDeviceTimezone(): number {
    if (typeof window === "undefined") return 0
    try {
        const offsetMinutes = new Date().getTimezoneOffset()
        return -(offsetMinutes / 60)
    } catch {
        return 0
    }
}

function formatTimezone(offset: number) {
    const sign = offset >= 0 ? "+" : "-"
    const absolute = Math.abs(offset)
    const hours = Math.floor(absolute)
    const minutes = Math.round((absolute - hours) * 60)
    return `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`
}

function createId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return Math.random().toString(36).slice(2, 10)
}

export default function BirthChart() {
    const router = useRouter()
    const locale = useLocale()
    const [day, setDay] = useState("")
    const [month, setMonth] = useState("")
    const [year, setYear] = useState("")
    const [hour, setHour] = useState("")
    const [minute, setMinute] = useState("")

    const [lat, setLat] = useState("")
    const [lng, setLng] = useState("")
    const [geoStatus, setGeoStatus] = useState<
        "idle" | "locating" | "ready" | "error"
    >("idle")

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [timezone] = useState(() => getDeviceTimezone())

    const requestGeo = useCallback(() => {
        if (typeof window === "undefined" || !navigator?.geolocation) {
            setGeoStatus("error")
            setLat("")
            setLng("")
            return
        }

        setGeoStatus("locating")
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLat(position.coords.latitude.toFixed(6))
                setLng(position.coords.longitude.toFixed(6))
                setGeoStatus("ready")
            },
            () => {
                setGeoStatus("error")
                setLat("")
                setLng("")
            },
            { enableHighAccuracy: true, timeout: 7000 }
        )
    }, [])

    useEffect(() => {
        requestGeo()
    }, [requestGeo])

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
            d <= 31 &&
            m > 0 &&
            m <= 12 &&
            y >= 1900

        const validTime =
            !Number.isNaN(h) &&
            !Number.isNaN(min) &&
            h >= 0 &&
            h <= 23 &&
            min >= 0 &&
            min <= 59

        return validDate && validTime
    }, [day, month, year, hour, minute])

    const timezoneLabel = useMemo(() => formatTimezone(timezone), [timezone])

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!isValid || submitting) return

        setSubmitting(true)
        setError("")

        const params = new URLSearchParams({
            day,
            month,
            year,
            hour,
            minute,
            timezone: timezone.toString(),
            lat: lat || "0",
            lng: lng || "0",
        })

        try {
            const response = await fetch(
                `/api/calculate-horoscope?${params.toString()}`
            )

            if (!response.ok) {
                throw new Error("Unable to generate birth chart right now.")
            }

            const chart = await response.json()
            const payload = {
                id: createId(),
                generatedAt: new Date().toISOString(),
                input: {
                    day,
                    month,
                    year,
                    hour,
                    minute,
                    timezone,
                    lat: lat || "0",
                    lng: lng || "0",
                },
                chart,
            }

            const encoded = encodeURIComponent(JSON.stringify(payload))
            const localePrefix = locale ? `/${locale}` : ""
            router.push(`${localePrefix}/birth-chart/${payload.id}?data=${encoded}`)
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again."
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className='w-full max-w-4xl mx-auto px-4'>
            <div className='space-y-8 text-left'>
                <div className='space-y-4'>
                    <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-[11px] tracking-[0.3em] uppercase'>
                        <Sparkles className='w-3.5 h-3.5 text-cosmic-gold' />
                        Birth Chart
                    </span>
                    <h1 className='font-serif text-4xl sm:text-5xl md:text-6xl leading-tight text-white'>
                        Decode your cosmic fingerprint in seconds
                    </h1>
                    <p className='text-base sm:text-lg text-white/70 max-w-2xl'>
                        Enter your birth date and time to generate a personalized
                        chart powered by NASA-grade ephemeris math. We will guide
                        you to a detailed interpretation moments later.
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className='relative rounded-[32px] border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/10 p-[1px] shadow-[0_25px_120px_rgba(123,97,255,0.25)]'
                >
                    <div className='absolute inset-0 rounded-[32px] bg-gradient-to-br from-cosmic-purple/30 via-transparent to-cosmic-blue/20 blur-3xl opacity-40 pointer-events-none' />
                    <div className='relative rounded-[31px] bg-black/40 backdrop-blur-2xl border border-white/5 p-6 sm:p-10 space-y-10'>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                            <CustomDatePicker
                                value={day}
                                onChange={setDay}
                                min={1}
                                max={31}
                                placeholder='DD'
                                label='DAY'
                            />
                            <CustomDatePicker
                                value={month}
                                onChange={setMonth}
                                min={1}
                                max={12}
                                placeholder='MM'
                                label='MONTH'
                            />
                            <CustomDatePicker
                                value={year}
                                onChange={setYear}
                                min={1900}
                                max={new Date().getFullYear()}
                                placeholder='YYYY'
                                label='YEAR'
                            />
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <CustomTimePicker
                                value={hour}
                                onChange={setHour}
                                min={0}
                                max={23}
                                placeholder='HH'
                                label='HOUR'
                            />
                            <CustomTimePicker
                                value={minute}
                                onChange={setMinute}
                                min={0}
                                max={59}
                                placeholder='MM'
                                label='MINUTE'
                            />
                        </div>

                        <div className='flex flex-col gap-3 text-sm sm:text-base text-white/80'>
                            <div className='flex items-center gap-3'>
                                <CalendarDays className='w-4 h-4 text-cosmic-purple shrink-0' />
                                <span>
                                    Your chart will be calculated for{" "}
                                    <strong className='font-semibold text-white'>
                                        {timezoneLabel}
                                    </strong>
                                </span>
                            </div>
                            <div className='flex items-center gap-3 flex-wrap'>
                                <Clock className='w-4 h-4 text-cosmic-blue shrink-0' />
                                <span className='text-white/70'>
                                    We auto-sync your exact birth minute for maximum
                                    precision.
                                </span>
                            </div>
                            <div className='flex items-center gap-3 flex-wrap'>
                                <MapPin className='w-4 h-4 text-cosmic-gold shrink-0' />
                                <span className='text-white/70'>
                                    {geoStatus === "ready" && lat && lng
                                        ? `Pinned to ${lat}, ${lng}`
                                        : geoStatus === "locating"
                                          ? "Locating your sky..."
                                          : "Using Greenwich meridian if your location is unavailable."}
                                </span>
                            </div>
                        </div>

                        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3'>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={requestGeo}
                                className='w-full sm:w-auto border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 text-white/80 shadow-inner shadow-white/5'
                            >
                                <Stars className='w-4 h-4 mr-2' />
                                Use my sky
                            </Button>
                            <div className='flex-1' />
                            <Button
                                type='submit'
                                disabled={!isValid || submitting}
                                className='w-full sm:w-auto h-14 px-8 text-base font-semibold tracking-wide bg-gradient-to-r from-cosmic-purple to-cosmic-blue border-none shadow-[0_15px_60px_rgba(114,96,255,0.45)]'
                            >
                                {submitting ? (
                                    <span className='inline-flex items-center gap-2'>
                                        <Loader2 className='w-4 h-4 animate-spin' />
                                        Generating
                                    </span>
                                ) : (
                                    "Reveal my birth chart"
                                )}
                            </Button>
                        </div>

                        {error && (
                            <p className='text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3'>
                                {error}
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}