"use client"

import { useMemo, useState } from "react"
import type { HoroscopeBirthData, HoroscopeTransitData } from "@/types/horoscope"
import { Calendar, Clock, MapPin, Sparkles, ChevronDown } from "lucide-react"

type Props = {
    birth: HoroscopeBirthData
    initialTransit?: HoroscopeTransitData | null
    onSubmit: (value: HoroscopeTransitData) => void
    title: string
    submitLabel: string
}

function toDateInput(data?: HoroscopeTransitData | null) {
    if (!data?.year || !data?.month || !data?.day) return ""
    return `${String(data.year).padStart(4, "0")}-${String(data.month).padStart(2, "0")}-${String(data.day).padStart(2, "0")}`
}

function toTimeInput(data?: HoroscopeTransitData | null) {
    if (data?.hour == null || data.minute == null) return ""
    return `${String(data.hour).padStart(2, "0")}:${String(data.minute).padStart(2, "0")}`
}

export default function InlineTransitDateForm({
    birth,
    initialTransit,
    onSubmit,
    title,
    submitLabel,
}: Props) {
    const now = new Date()
    const [date, setDate] = useState(
        toDateInput(initialTransit) ||
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    )
    const [time, setTime] = useState(
        toTimeInput(initialTransit) ||
            `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    )
    const [country, setCountry] = useState(initialTransit?.country || birth.country || "")
    const [state, setState] = useState(initialTransit?.state || birth.state || "")
    const [lat, setLat] = useState(
        initialTransit?.lat != null
            ? String(initialTransit.lat)
            : birth.lat != null
              ? String(birth.lat)
              : "",
    )
    const [lng, setLng] = useState(
        initialTransit?.lng != null
            ? String(initialTransit.lng)
            : birth.lng != null
              ? String(birth.lng)
              : "",
    )
    const [timezone, setTimezone] = useState(
        initialTransit?.timezone != null
            ? String(initialTransit.timezone)
            : birth.timezone != null
              ? String(birth.timezone)
              : "",
    )
    const [showAdvanced, setShowAdvanced] = useState(false)

    const canSubmit = useMemo(() => Boolean(date && time), [date, time])

    const submit = () => {
        if (!canSubmit) return
        const [y, m, d] = date.split("-").map((v) => Number(v))
        const [h, mm] = time.split(":").map((v) => Number(v))
        onSubmit({
            day: Number.isFinite(d) ? d : null,
            month: Number.isFinite(m) ? m : null,
            year: Number.isFinite(y) ? y : null,
            hour: Number.isFinite(h) ? h : null,
            minute: Number.isFinite(mm) ? mm : null,
            timezone: timezone ? Number(timezone) : null,
            lat: lat ? Number(lat) : null,
            lng: lng ? Number(lng) : null,
            country: country || null,
            state: state || null,
        })
    }

    const birthSummary = [
        birth.day && birth.month && birth.year
            ? `${birth.day}/${birth.month}/${birth.year}`
            : null,
        birth.hour != null && birth.minute != null
            ? `${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")}`
            : birth.timeHint,
        [birth.state, birth.country].filter(Boolean).join(", ") || "-",
    ]
        .filter(Boolean)
        .join(" · ")

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
                {/* Birth summary */}
                <div className='flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10'>
                        <MapPin className='h-4 w-4 text-white/70' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <p className='text-xs font-medium text-white/50'>Birth data</p>
                        <p className='truncate text-sm text-white/90'>{birthSummary}</p>
                    </div>
                </div>

                {/* Transit date & time */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-white/70'>
                            <Calendar className='h-4 w-4' />
                            <span>Transit date</span>
                        </div>
                        <input
                            type='date'
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className='w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                        />
                    </div>
                    <div className='space-y-2'>
                        <div className='flex items-center gap-2 text-sm text-white/70'>
                            <Clock className='h-4 w-4' />
                            <span>Transit time</span>
                        </div>
                        <input
                            type='time'
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className='w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                        />
                    </div>
                </div>

                {/* Location (optional) */}
                <div className='space-y-3'>
                    <div className='flex items-center gap-2 text-sm text-white/70'>
                        <MapPin className='h-4 w-4' />
                        <span>Location (optional)</span>
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
                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/10 p-4'>
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
                                onChange={(e) => setTimezone(e.target.value)}
                                className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className='flex items-center justify-end gap-3 pt-2'>
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
