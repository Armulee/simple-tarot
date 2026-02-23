"use client"

import { useEffect, useMemo, useState } from "react"
import { resolveLocationFromCountryState } from "@/lib/location"
import {
    clearBirthFromStorage,
    loadBirthFromStorage,
    saveBirthToStorage,
} from "@/lib/birth-storage"
import type { HoroscopeBirthData } from "@/types/horoscope"
import { Calendar, Clock, MapPin, Sparkles, ChevronDown } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

type Props = {
    initial: HoroscopeBirthData | null
    currentLocation?: {
        country?: string
        state?: string
        lat?: number
        lng?: number
        timezone?: number
    } | null
    onSubmit: (value: HoroscopeBirthData) => void
    title: string
    submitLabel: string
    /** When true, always save to storage on submit and hide the remember checkbox */
    alwaysSave?: boolean
}

function toDateInputValue(data: HoroscopeBirthData | null) {
    if (!data?.year || !data?.month || !data?.day) return ""
    const y = String(data.year).padStart(4, "0")
    const m = String(data.month).padStart(2, "0")
    const d = String(data.day).padStart(2, "0")
    return `${y}-${m}-${d}`
}

export default function InlineUserDateForm({
    initial,
    currentLocation,
    onSubmit,
    title,
    submitLabel,
    alwaysSave = false,
}: Props) {
    const [date, setDate] = useState(toDateInputValue(initial))
    const [timeMode, setTimeMode] = useState<"exact" | "day" | "night">(
        initial?.hour != null && initial?.minute != null ? "exact" : "exact",
    )
    const [time, setTime] = useState(
        initial?.hour != null && initial?.minute != null
            ? `${String(initial.hour).padStart(2, "0")}:${String(initial.minute).padStart(2, "0")}`
            : "",
    )
    const [country, setCountry] = useState(initial?.country || "")
    const [state, setState] = useState(initial?.state || "")
    const [lat, setLat] = useState(
        initial?.lat != null ? String(initial.lat) : "",
    )
    const [lng, setLng] = useState(
        initial?.lng != null ? String(initial.lng) : "",
    )
    const [timezone, setTimezone] = useState(
        initial?.timezone != null ? String(initial.timezone) : "",
    )
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [rememberBirth, setRememberBirth] = useState(false)

    useEffect(() => {
        const saved = loadBirthFromStorage()
        if (saved && !initial?.day && !initial?.month && !initial?.year) {
            setDate(toDateInputValue(saved))
            setTimeMode(
                saved.hour != null && saved.minute != null ? "exact" : "exact",
            )
            setTime(
                saved.hour != null && saved.minute != null
                    ? `${String(saved.hour).padStart(2, "0")}:${String(saved.minute).padStart(2, "0")}`
                    : "",
            )
            setCountry(saved.country || "")
            setState(saved.state || "")
            setLat(saved.lat != null ? String(saved.lat) : "")
            setLng(saved.lng != null ? String(saved.lng) : "")
            setTimezone(saved.timezone != null ? String(saved.timezone) : "")
        }
    }, [initial])

    const canSubmit = useMemo(() => {
        if (!date) return false
        if (timeMode === "exact" && !time) return false
        return true
    }, [date, time, timeMode])

    const applyCurrentLocation = () => {
        if (!currentLocation) return
        setCountry(currentLocation.country || "")
        setState(currentLocation.state || "")
        if (typeof currentLocation.lat === "number") {
            setLat(String(currentLocation.lat))
        }
        if (typeof currentLocation.lng === "number") {
            setLng(String(currentLocation.lng))
        }
        if (typeof currentLocation.timezone === "number") {
            setTimezone(String(currentLocation.timezone))
        }
    }

    const submit = () => {
        if (!canSubmit) return
        const [y, m, d] = date.split("-").map((v) => Number(v))
        let hour: number | null = null
        let minute: number | null = null
        let timeHint: "day" | "night" | "unknown" = "unknown"

        if (timeMode === "exact") {
            const [h, mm] = time.split(":").map((v) => Number(v))
            hour = Number.isFinite(h) ? h : null
            minute = Number.isFinite(mm) ? mm : null
        } else {
            timeHint = timeMode
        }

        let nextLat = lat ? Number(lat) : null
        let nextLng = lng ? Number(lng) : null
        let nextTimezone = timezone ? Number(timezone) : null
        let resolvedCountry = country || null
        let resolvedState = state || null
        let usedLocationFallback = false

        if (
            resolvedCountry &&
            (!Number.isFinite(nextLat as number) ||
                !Number.isFinite(nextLng as number) ||
                !Number.isFinite(nextTimezone as number))
        ) {
            const resolved = resolveLocationFromCountryState(
                resolvedCountry,
                resolvedState || undefined,
            )
            if (resolved) {
                resolvedCountry = resolved.countryName
                resolvedState = resolved.stateName
                nextLat = resolved.latitude
                nextLng = resolved.longitude
                nextTimezone = resolved.timezone
            }
        }

        if (!resolvedCountry && currentLocation?.country) {
            resolvedCountry = currentLocation.country
            resolvedState = currentLocation.state || null
            nextLat =
                typeof currentLocation.lat === "number"
                    ? currentLocation.lat
                    : nextLat
            nextLng =
                typeof currentLocation.lng === "number"
                    ? currentLocation.lng
                    : nextLng
            nextTimezone =
                typeof currentLocation.timezone === "number"
                    ? currentLocation.timezone
                    : nextTimezone
            usedLocationFallback = true
        }

        const payload: HoroscopeBirthData = {
            day: Number.isFinite(d) ? d : null,
            month: Number.isFinite(m) ? m : null,
            year: Number.isFinite(y) ? y : null,
            hour,
            minute,
            timeHint,
            timezone: Number.isFinite(nextTimezone as number)
                ? nextTimezone
                : null,
            lat: Number.isFinite(nextLat as number) ? nextLat : null,
            lng: Number.isFinite(nextLng as number) ? nextLng : null,
            country: resolvedCountry,
            state: resolvedState,
            usedLocationFallback,
        }
        if (alwaysSave || rememberBirth) {
            saveBirthToStorage(payload)
        } else if (loadBirthFromStorage()) {
            clearBirthFromStorage()
        }
        onSubmit(payload)
    }

    return (
        <div className='w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-xl shadow-black/20 backdrop-blur-sm'>
            {/* Header */}
            <div className='flex items-center gap-2 px-5 py-4 border-b border-white/10'>
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary'>
                    <Sparkles className='h-4 w-4' />
                </div>
                <span className='font-semibold text-white'>{title}</span>
            </div>

            <div className='space-y-5 p-5'>
                {/* Date & Time */}
                <div className='space-y-3'>
                    <div className='flex items-center gap-2 text-sm text-white/70'>
                        <Calendar className='h-4 w-4' />
                        <span>Birth date</span>
                    </div>
                    <input
                        type='date'
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className='w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                    />
                </div>

                <div className='space-y-3'>
                    <div className='flex items-center gap-2 text-sm text-white/70'>
                        <Clock className='h-4 w-4' />
                        <span>Birth time</span>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        {(["exact", "day", "night"] as const).map((mode) => (
                            <button
                                key={mode}
                                type='button'
                                onClick={() => setTimeMode(mode)}
                                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                    timeMode === mode
                                        ? "bg-primary/30 text-white ring-1 ring-primary/50"
                                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                {mode === "exact"
                                    ? "Exact time"
                                    : mode === "day"
                                      ? "Daytime"
                                      : "Nighttime"}
                            </button>
                        ))}
                    </div>
                    {timeMode === "exact" && (
                        <input
                            type='time'
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className='w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                        />
                    )}
                </div>

                {/* Location */}
                <div className='space-y-3'>
                    <div className='flex items-center gap-2 text-sm text-white/70'>
                        <MapPin className='h-4 w-4' />
                        <span>Birth place (optional)</span>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                        <input
                            placeholder='Country'
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className='rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                        />
                        <input
                            placeholder='State / Province'
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className='rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                        />
                    </div>
                    <button
                        type='button'
                        onClick={applyCurrentLocation}
                        className='inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white'
                    >
                        <MapPin className='h-3.5 w-3.5' />
                        Use current location
                    </button>
                </div>

                {/* Advanced (collapsible) */}
                <div className='rounded-xl border border-white/10 bg-white/[0.02]'>
                    <button
                        type='button'
                        onClick={() => setShowAdvanced((v) => !v)}
                        className='flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/60 hover:text-white/80'
                    >
                        <span>Advanced (lat, lng, timezone)</span>
                        <ChevronDown
                            className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                        />
                    </button>
                    {showAdvanced && (
                        <div className='space-y-4 border-t border-white/10 p-4'>
                            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
                                <input
                                    placeholder='Latitude'
                                    value={lat}
                                    onChange={(e) => setLat(e.target.value)}
                                    className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                />
                                <input
                                    placeholder='Longitude'
                                    value={lng}
                                    onChange={(e) => setLng(e.target.value)}
                                    className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                />
                                <input
                                    placeholder='Timezone (e.g. 7)'
                                    value={timezone}
                                    onChange={(e) =>
                                        setTimezone(e.target.value)
                                    }
                                    className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className='flex items-center justify-between gap-3 pt-2'>
                    {!alwaysSave && (
                        <label className='flex items-center gap-2 cursor-pointer text-sm text-white/80 hover:text-white'>
                            <Checkbox
                                id='remember-birth'
                                checked={rememberBirth}
                                onCheckedChange={(c) =>
                                    setRememberBirth(c === true)
                                }
                                className='border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                            />
                            <span>Remember my birth date</span>
                        </label>
                    )}
                    {alwaysSave && <div />}
                    <button
                        type='button'
                        onClick={submit}
                        disabled={!canSubmit}
                        className='rounded-xl bg-primary/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary disabled:opacity-40 disabled:shadow-none'
                    >
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
