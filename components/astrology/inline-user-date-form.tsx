"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { resolveLocationFromCountryState } from "@/lib/location"
import { loadBirthFromStorage, saveBirthToStorage } from "@/lib/birth-storage"
import type { HoroscopeBirthData } from "@/types/horoscope"
import {
    Calendar,
    CalendarDays,
    Clock,
    MapPin,
    Sparkles,
    ChevronDown,
    Send,
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"

function TimePickerPopover({
    value,
    onChange,
    onDone,
    t,
}: {
    value: string
    onChange: (time: string) => void
    onDone: () => void
    t: (key: string) => string
}) {
    const parts = value ? value.split(":") : []
    const hour = (parts[0] || "00").padStart(2, "0")
    const minute = (parts[1] || "00").padStart(2, "0")
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    const handleHourSelect = (h: number) => {
        onChange(`${String(h).padStart(2, "0")}:${minute}`)
    }
    const handleMinuteSelect = (min: number) => {
        onChange(`${hour}:${String(min).padStart(2, "0")}`)
    }

    return (
        <div className='space-y-4'>
            <div className='text-center'>
                <h3 className='text-sm font-medium text-white/80 mb-1'>
                    {t("timePickerTitle")}
                </h3>
                <div className='text-xl font-mono text-primary'>
                    {hour}:{minute}
                </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                    <div className='text-xs font-medium text-white/60 text-center'>
                        {t("timePickerHour")}
                    </div>
                    <div className='max-h-40 overflow-y-auto border border-white/10 rounded-lg'>
                        {hours.map((h) => (
                            <Button
                                key={h}
                                variant='ghost'
                                size='sm'
                                onClick={() => handleHourSelect(h)}
                                className='w-full justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-none h-9'
                            >
                                {String(h).padStart(2, "0")}
                            </Button>
                        ))}
                    </div>
                </div>
                <div className='space-y-2'>
                    <div className='text-xs font-medium text-white/60 text-center'>
                        {t("timePickerMinute")}
                    </div>
                    <div className='max-h-40 overflow-y-auto border border-white/10 rounded-lg'>
                        {minutes.map((min) => (
                            <Button
                                key={min}
                                variant='ghost'
                                size='sm'
                                onClick={() => handleMinuteSelect(min)}
                                className='w-full justify-center text-white/90 hover:text-white hover:bg-white/10 rounded-none h-9'
                            >
                                {String(min).padStart(2, "0")}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
            <div className='flex justify-end pt-2'>
                <Button
                    size='sm'
                    onClick={onDone}
                    className='bg-primary hover:bg-primary/90 text-white'
                >
                    {t("timePickerDone")}
                </Button>
            </div>
        </div>
    )
}

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
    onBeforeSubmit?: (value: HoroscopeBirthData) => boolean
    title: string
    submitLabel: string
    /** When true, always save to storage on submit */
    alwaysSave?: boolean
    variant?: "default" | "inlineSticky"
}

function toDateInputValue(data: HoroscopeBirthData | null) {
    if (!data?.year || !data?.month || !data?.day) return ""
    const y = String(data.year).padStart(4, "0")
    const m = String(data.month).padStart(2, "0")
    const d = String(data.day).padStart(2, "0")
    return `${y}-${m}-${d}`
}

const BE_OFFSET = 543

function toDisplayFormat(
    iso: string,
    yearEra: "CE" | "BE" = "CE",
    options?: { includeSuffix?: boolean },
): string {
    if (!iso || iso.length < 10) return ""
    const [y, m, d] = iso.split("-")
    if (!y || !m || !d) return ""
    const yearNum = parseInt(y, 10)
    const displayYear =
        yearEra === "BE" && Number.isFinite(yearNum)
            ? String(yearNum + BE_OFFSET)
            : y
    const suffix =
        yearEra === "BE" && (options?.includeSuffix ?? true) ? " B.E." : ""
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${displayYear}${suffix}`
}

/** Returns validation error for day (1-31) or month (1-12) from display value dd/mm/yyyy or dd/mm/yyyy B.E. */
function getDateValidationError(displayValue: string): {
    day?: string
    month?: string
} | null {
    const cleaned = displayValue.replace(/\s*B\.?E\.?$/i, "").trim()
    const parts = cleaned.split("/")
    const dayStr = parts[0]?.replace(/\D/g, "") ?? ""
    const monthStr = parts[1]?.replace(/\D/g, "") ?? ""
    const errors: { day?: string; month?: string } = {}
    if (dayStr.length >= 2) {
        const day = parseInt(dayStr, 10)
        if (day < 1 || day > 31) errors.day = "day"
    }
    if (monthStr.length >= 2) {
        const month = parseInt(monthStr, 10)
        if (month < 1 || month > 12) errors.month = "month"
    }
    if (Object.keys(errors).length === 0) return null
    return errors
}

/** Format raw digits as dd/mm/yy or dd/mm/yyyy while typing (adds / after day and month) */
function formatDateInputWithSlashes(digits: string): string {
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    if (digits.length <= 6)
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 6)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

function expandTwoDigitYear(yy: number): number {
    const currentYearLast2 = new Date().getFullYear() % 100
    return currentYearLast2 < yy ? 1900 + yy : 2000 + yy
}

function parseDisplayFormat(
    value: string,
    yearEra: "CE" | "BE" = "CE",
): string {
    const withoutSuffix = value.replace(/\s*B\.?E\.?$/i, "").trim()
    const cleaned = withoutSuffix.replace(/\D/g, "")
    if (cleaned.length === 6) {
        const d = cleaned.slice(0, 2)
        const m = cleaned.slice(2, 4)
        const yy = parseInt(cleaned.slice(4, 6), 10)
        const day = parseInt(d, 10)
        const month = parseInt(m, 10)
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && yy >= 0 && yy <= 99) {
            const year = expandTwoDigitYear(yy)
            const y = String(year).padStart(4, "0")
            return `${y}-${m}-${d}`
        }
    }
    if (cleaned.length === 8) {
        const d = cleaned.slice(0, 2)
        const m = cleaned.slice(2, 4)
        const yRaw = cleaned.slice(4, 8)
        const day = parseInt(d, 10)
        const month = parseInt(m, 10)
        let year = parseInt(yRaw, 10)
        if (yearEra === "BE") {
            year = year - BE_OFFSET
        }
        const yearOk =
            yearEra === "BE"
                ? year >= 1857 && year <= 2057
                : year >= 1900 && year <= 2100
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && yearOk) {
            const y = String(year).padStart(4, "0")
            return `${y}-${m}-${d}`
        }
    }
    return ""
}

/** Format raw digits as HH:MM while typing (adds : after hour) */
function formatTimeInputWithColons(digits: string): string {
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
}

function parseTimeDisplay(value: string): string {
    const withColon = value.match(/^(\d{2}):(\d{2})$/)
    if (withColon) {
        const h = parseInt(withColon[1], 10)
        const m = parseInt(withColon[2], 10)
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        return ""
    }
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length === 4) {
        const h = parseInt(cleaned.slice(0, 2), 10)
        const m = parseInt(cleaned.slice(2, 4), 10)
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59)
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        return ""
    }
    if (cleaned.length === 3) {
        const h = parseInt(cleaned.slice(0, 1), 10)
        const m = parseInt(cleaned.slice(1, 3), 10)
        if (h >= 1 && h <= 9 && m >= 0 && m <= 59)
            return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        return ""
    }
    return ""
}

function getInitialTimeMode(data: HoroscopeBirthData | null): "exact" | "day" | "night" {
    if (data?.hour != null && data?.minute != null) return "exact"
    if (data?.timeHint === "day") return "day"
    if (data?.timeHint === "night") return "night"
    return "exact"
}

function hasLocationDetails(data: HoroscopeBirthData | null | undefined): boolean {
    return Boolean(
        data?.country ||
            data?.state ||
            data?.lat != null ||
            data?.lng != null ||
            data?.timezone != null,
    )
}

export default function InlineUserDateForm({
    initial,
    currentLocation,
    onSubmit,
    onBeforeSubmit,
    title,
    submitLabel,
    alwaysSave = false,
    variant = "default",
}: Props) {
    const t = useTranslations("BirthForm")
    const isInlineSticky = variant === "inlineSticky"
    const [date, setDate] = useState(toDateInputValue(initial))
    const [timeMode, setTimeMode] = useState<"exact" | "day" | "night">(
        getInitialTimeMode(initial),
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
    const [showLocationSettings, setShowLocationSettings] = useState(
        hasLocationDetails(initial),
    )
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [dateInputValue, setDateInputValue] = useState("")
    /** True when date was entered as B.E. (year 2400–2600); false when from calendar or C.E. input */
    const [displayAsBE, setDisplayAsBE] = useState(false)
    const dateMeasureRef = useRef<HTMLSpanElement>(null)
    const [timePickerOpen, setTimePickerOpen] = useState(false)
    const [timeInputValue, setTimeInputValue] = useState("")
    const [isSubmitted, setIsSubmitted] = useState(false)

    const applyBirthToForm = (birth: HoroscopeBirthData | null) => {
        setDate(toDateInputValue(birth))
        setDateInputValue("")
        setDisplayAsBE(false)
        setTimeMode(getInitialTimeMode(birth))
        setTime(
            birth?.hour != null && birth?.minute != null
                ? `${String(birth.hour).padStart(2, "0")}:${String(birth.minute).padStart(2, "0")}`
                : "",
        )
        setTimeInputValue("")
        setCountry(birth?.country || "")
        setState(birth?.state || "")
        setLat(birth?.lat != null ? String(birth.lat) : "")
        setLng(birth?.lng != null ? String(birth.lng) : "")
        setTimezone(birth?.timezone != null ? String(birth.timezone) : "")
        setShowLocationSettings(hasLocationDetails(birth))
    }

    useEffect(() => {
        setIsSubmitted(false)
        const saved = loadBirthFromStorage()
        if (saved && !initial?.day && !initial?.month && !initial?.year) {
            applyBirthToForm(saved)
            return
        }
        applyBirthToForm(initial)
    }, [initial])

    const dateInputDisplay = date
        ? toDisplayFormat(date, displayAsBE ? "BE" : "CE", {
              includeSuffix: false,
          })
        : dateInputValue

    const canSubmit = useMemo(() => {
        if (!date) return false
        if (timeMode === "exact" && !time) return false
        return true
    }, [date, time, timeMode])
    const shouldPersistBirth = alwaysSave || isInlineSticky

    const applyCurrentLocation = () => {
        if (!currentLocation) return
        setShowLocationSettings(true)
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
        if (onBeforeSubmit && !onBeforeSubmit(payload)) {
            applyBirthToForm(loadBirthFromStorage() ?? initial)
            return
        }
        if (shouldPersistBirth) {
            saveBirthToStorage(payload)
        }
        onSubmit(payload)
        if (isInlineSticky) {
            setIsSubmitted(true)
        }
    }

    return (
        <div
            className={`w-full overflow-hidden rounded-2xl border shadow-xl backdrop-blur-sm transition-all duration-500 ${
                isInlineSticky
                    ? `border-primary/25 bg-[#090713]/95 shadow-[0_18px_48px_-24px_rgba(99,102,241,0.65)] ${
                          isSubmitted
                              ? "pointer-events-none max-h-0 translate-y-6 opacity-0"
                              : "animate-fade-up opacity-100"
                      }`
                    : "md:max-w-[85%] border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-black/20"
            }`}
        >
            {/* Header */}
            <div
                className={`border-b border-white/10 space-y-2 ${
                    isInlineSticky ? "px-4 py-3" : "px-5 py-4"
                }`}
            >
                <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-2 min-w-0'>
                        <div
                            className={`flex shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary ${
                                isInlineSticky ? "h-8 w-8" : "h-9 w-9"
                            }`}
                        >
                            <Sparkles className='h-4 w-4' />
                        </div>
                        <div className='min-w-0'>
                            <span className='font-semibold text-white'>
                                {title}
                            </span>
                            {isInlineSticky ? (
                                <p className='mt-1 text-xs text-white/60'>
                                    {t("inlineAccuracyHint")}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
                {(() => {
                    const hasDateFromPrefill =
                        initial?.year && initial?.month && initial?.day
                    const hasTimeFromPrefill =
                        initial?.hour != null && initial?.minute != null
                    const missingDateHint =
                        hasTimeFromPrefill && !hasDateFromPrefill && !date
                    const missingTimeHint =
                        hasDateFromPrefill &&
                        !hasTimeFromPrefill &&
                        timeMode === "exact" &&
                        !time
                    if (!missingDateHint && !missingTimeHint) return null
                    return (
                        <div className='flex flex-col gap-0.5 text-sm text-amber-400/90'>
                            {missingDateHint && (
                                <span>{t("missingDateHint")}</span>
                            )}
                            {missingTimeHint && (
                                <span>{t("missingTimeHint")}</span>
                            )}
                        </div>
                    )
                })()}
            </div>

            <div className={`space-y-5 ${isInlineSticky ? "p-4" : "p-5"}`}>
                <div
                    className={`${
                        isInlineSticky
                            ? "flex min-w-0 flex-nowrap items-start gap-2 overflow-hidden"
                            : "space-y-5"
                    }`}
                >
                    <div
                        className={`space-y-3 ${
                            isInlineSticky ? "min-w-0 flex-[1.1]" : ""
                        }`}
                    >
                        <div
                            className={`flex items-center gap-2 text-white/70 ${
                                isInlineSticky ? "text-xs" : "text-sm"
                            }`}
                        >
                            <Calendar className='h-4 w-4' />
                            <span>{t("birthDate")}</span>
                        </div>
                        <div className='flex gap-2'>
                            <div className='flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'>
                                <div
                                    className='relative flex min-w-0 shrink'
                                    style={{ width: 75 }}
                                >
                                    <span
                                        ref={dateMeasureRef}
                                        className='invisible absolute left-0 top-0 whitespace-nowrap text-base text-white'
                                        aria-hidden
                                    >
                                        {dateInputDisplay ||
                                            t("datePlaceholder")}
                                    </span>
                                    <input
                                        type='text'
                                        inputMode='numeric'
                                        placeholder={t("datePlaceholder")}
                                        value={dateInputDisplay}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            const digits = v.replace(/\D/g, "")
                                            if (digits.length === 0) {
                                                setDate("")
                                                setDateInputValue("")
                                                setDisplayAsBE(false)
                                                return
                                            }
                                            const formatted =
                                                formatDateInputWithSlashes(
                                                    digits,
                                                )
                                            setDateInputValue(formatted)
                                            if (digits.length === 8) {
                                                const yearRaw = parseInt(
                                                    formatted.slice(6, 10),
                                                    10,
                                                )
                                                const isBE =
                                                    yearRaw >= 2400 &&
                                                    yearRaw <= 2600
                                                const parsed =
                                                    parseDisplayFormat(
                                                        formatted,
                                                        isBE ? "BE" : "CE",
                                                    )
                                                if (parsed) {
                                                    setDate(parsed)
                                                    setDateInputValue("")
                                                    setDisplayAsBE(isBE)
                                                } else {
                                                    setDate("")
                                                }
                                            } else {
                                                setDate("")
                                            }
                                        }}
                                        onBlur={() => {
                                            if (dateInputValue) {
                                                const digits =
                                                    dateInputValue.replace(
                                                        /\D/g,
                                                        "",
                                                    )
                                                const isBE =
                                                    digits.length === 8 &&
                                                    (() => {
                                                        const y = parseInt(
                                                            digits.slice(4, 8),
                                                            10,
                                                        )
                                                        return (
                                                            y >= 2400 &&
                                                            y <= 2600
                                                        )
                                                    })()
                                                const parsed =
                                                    parseDisplayFormat(
                                                        dateInputValue,
                                                        isBE ? "BE" : "CE",
                                                    )
                                                if (parsed) {
                                                    setDate(parsed)
                                                    setDateInputValue("")
                                                    setDisplayAsBE(isBE)
                                                } else {
                                                    setDateInputValue("")
                                                }
                                            }
                                        }}
                                        className='min-w-0 w-full border-0 bg-transparent p-0 text-base text-white placeholder:text-gray-400 focus:outline-none'
                                    />
                                </div>
                                {(() => {
                                    const digits = dateInputDisplay.replace(
                                        /\D/g,
                                        "",
                                    )
                                    if (digits.length !== 8) return null
                                    const y = parseInt(digits.slice(4, 8), 10)
                                    const isBE = y >= 2400 && y <= 2600
                                    return (
                                        <span className='shrink-0 text-white'>
                                            {" "}
                                            {isBE
                                                ? t("yearEraBE")
                                                : t("yearEraCE")}
                                        </span>
                                    )
                                })()}
                            </div>
                            <Popover
                                open={calendarOpen}
                                onOpenChange={setCalendarOpen}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        type='button'
                                        className='flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition-colors hover:bg-white/[0.08] hover:border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                        aria-label='Open calendar'
                                    >
                                        <CalendarDays className='h-5 w-5 text-white/80' />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align='end'
                                    sideOffset={8}
                                    className='w-auto overflow-hidden rounded-xl border-white/10 bg-[#0A0F26]/95 p-0 shadow-2xl backdrop-blur-xl'
                                >
                                    <CalendarComponent
                                        mode='single'
                                        selected={
                                            date
                                                ? new Date(date + "T12:00:00")
                                                : undefined
                                        }
                                        onSelect={(d) => {
                                            if (d) {
                                                const y = d.getFullYear()
                                                const m = String(
                                                    d.getMonth() + 1,
                                                ).padStart(2, "0")
                                                const day = String(
                                                    d.getDate(),
                                                ).padStart(2, "0")
                                                setDate(`${y}-${m}-${day}`)
                                                setDateInputValue("")
                                                setDisplayAsBE(false)
                                                setCalendarOpen(false)
                                            }
                                        }}
                                        captionLayout='dropdown'
                                        fromYear={1900}
                                        toYear={new Date().getFullYear()}
                                        disabled={(d) =>
                                            d > new Date() ||
                                            d < new Date("1900-01-01")
                                        }
                                        className='rounded-xl border-0 bg-transparent'
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {(() => {
                            const displayValue = date
                                ? toDisplayFormat(
                                      date,
                                      displayAsBE ? "BE" : "CE",
                                      {
                                          includeSuffix: false,
                                      },
                                  )
                                : dateInputValue
                            const err = getDateValidationError(displayValue)
                            if (!err) return null
                            return (
                                <div className='flex flex-col gap-0.5 text-sm text-red-400'>
                                    {err.day && (
                                        <span>{t("dateErrorDay")}</span>
                                    )}
                                    {err.month && (
                                        <span>{t("dateErrorMonth")}</span>
                                    )}
                                </div>
                            )
                        })()}
                    </div>

                    <div
                        className={`space-y-3 ${
                            isInlineSticky ? "min-w-0 flex-1" : ""
                        }`}
                    >
                        <div
                            className={`flex items-center gap-2 text-white/70 ${
                                isInlineSticky ? "text-xs" : "text-sm"
                            }`}
                        >
                            <Clock className='h-4 w-4' />
                            <span>{t("birthTime")}</span>
                        </div>
                        {timeMode === "exact" && (
                            <div className='flex gap-2'>
                                <input
                                    type='text'
                                    inputMode='numeric'
                                    placeholder={t("timePlaceholder")}
                                    value={time ? time : timeInputValue}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        const digits = v.replace(/\D/g, "")
                                        if (digits.length === 0) {
                                            setTime("")
                                            setTimeInputValue("")
                                            return
                                        }
                                        const formatted =
                                            formatTimeInputWithColons(digits)
                                        setTimeInputValue(formatted)
                                        if (digits.length === 4) {
                                            const parsed =
                                                parseTimeDisplay(formatted)
                                            if (parsed) {
                                                setTime(parsed)
                                                setTimeInputValue("")
                                            } else {
                                                setTime("")
                                            }
                                        } else {
                                            setTime("")
                                        }
                                    }}
                                    onBlur={() => {
                                        if (timeInputValue) {
                                            const parsed =
                                                parseTimeDisplay(
                                                    timeInputValue,
                                                )
                                            if (parsed) {
                                                setTime(parsed)
                                                setTimeInputValue("")
                                            } else {
                                                setTimeInputValue("")
                                            }
                                        }
                                    }}
                                    className='flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-gray-400 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                />
                                <Popover
                                    open={timePickerOpen}
                                    onOpenChange={setTimePickerOpen}
                                >
                                    <PopoverTrigger asChild>
                                        <button
                                            type='button'
                                            className='flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition-colors hover:bg-white/[0.08] hover:border-white/20 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                            aria-label='Open time picker'
                                        >
                                            <Clock className='h-5 w-5 text-white/80' />
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        align='end'
                                        sideOffset={8}
                                        className='w-80 overflow-hidden rounded-xl border-white/10 bg-[#0A0F26]/95 p-4 shadow-2xl backdrop-blur-xl'
                                    >
                                        <TimePickerPopover
                                            value={time}
                                            onChange={(val) => {
                                                setTime(val)
                                                setTimeInputValue("")
                                            }}
                                            onDone={() =>
                                                setTimePickerOpen(false)
                                            }
                                            t={t}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                        <div
                            className={`gap-2 ${
                                isInlineSticky ? "flex flex-nowrap overflow-x-auto" : "flex flex-wrap"
                            }`}
                        >
                            {(["exact", "day", "night"] as const).map(
                                (mode) => (
                                    <button
                                        key={mode}
                                        type='button'
                                        onClick={() => setTimeMode(mode)}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                            timeMode === mode
                                                ? "bg-primary/30 text-white ring-1 ring-primary/50"
                                                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                                        } ${isInlineSticky ? "shrink-0 whitespace-nowrap" : ""}`}
                                    >
                                        {mode === "exact"
                                            ? t("exactTime")
                                            : mode === "day"
                                              ? t("daytime")
                                              : t("nighttime")}
                                    </button>
                                ),
                            )}
                        </div>
                        {isInlineSticky ? (
                            <p className='text-xs leading-relaxed text-white/55'>
                                {t("timeAccuracyHint")}
                            </p>
                        ) : null}
                    </div>
                </div>

                {!isInlineSticky ? (
                    <div className='space-y-3'>
                        <div className='flex items-center gap-2 text-sm text-white/70'>
                            <MapPin className='h-4 w-4' />
                            <span>{t("birthPlace")}</span>
                        </div>
                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            <input
                                placeholder={t("country")}
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className='rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                            />
                            <input
                                placeholder={t("stateProvince")}
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className='rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                            />
                        </div>
                        <button
                            type='button'
                            onClick={applyCurrentLocation}
                            disabled={!currentLocation}
                            className='inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                        >
                            <MapPin className='h-3.5 w-3.5' />
                            {t("useCurrentLocation")}
                        </button>
                    </div>
                ) : null}

                {(showLocationSettings || !isInlineSticky) && (
                    <div className='space-y-3'>
                        {isInlineSticky ? (
                            <div className='grid gap-3 md:grid-cols-2'>
                                <input
                                    placeholder={t("country")}
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className='rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                />
                                <input
                                    placeholder={t("stateProvince")}
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    className='rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20'
                                />
                            </div>
                        ) : null}
                    </div>
                )}

                {(!isInlineSticky || showLocationSettings || showAdvanced) && (
                    <div className='rounded-xl border border-white/10 bg-white/[0.02]'>
                        <button
                            type='button'
                            onClick={() => setShowAdvanced((v) => !v)}
                            className='flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white/60 hover:text-white/80'
                        >
                            <span>{t("advanced")}</span>
                            <ChevronDown
                                className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                            />
                        </button>
                        {showAdvanced && (
                            <div className='space-y-4 border-t border-white/10 p-4'>
                                {isInlineSticky && !showLocationSettings ? (
                                    <div className='grid gap-3 sm:grid-cols-2'>
                                        <input
                                            placeholder={t("country")}
                                            value={country}
                                            onChange={(e) =>
                                                setCountry(e.target.value)
                                            }
                                            className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                        />
                                        <input
                                            placeholder={t("stateProvince")}
                                            value={state}
                                            onChange={(e) =>
                                                setState(e.target.value)
                                            }
                                            className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                        />
                                    </div>
                                ) : null}
                                <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                                    <input
                                        placeholder={t("latitude")}
                                        value={lat}
                                        onChange={(e) => setLat(e.target.value)}
                                        className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                    />
                                    <input
                                        placeholder={t("longitude")}
                                        value={lng}
                                        onChange={(e) => setLng(e.target.value)}
                                        className='rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40'
                                    />
                                    <input
                                        placeholder={t("timezone")}
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
                )}

                <div
                    className={`flex items-center gap-3 pt-2 ${
                        isInlineSticky ? "justify-between" : "justify-end"
                    }`}
                >
                    {isInlineSticky ? (
                        <div className='flex flex-wrap items-center gap-2'>
                            <button
                                type='button'
                                onClick={() =>
                                    setShowLocationSettings((value) => !value)
                                }
                                className='inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white'
                            >
                                <MapPin className='h-3.5 w-3.5' />
                                {t("locationSettings")}
                            </button>
                            <button
                                type='button'
                                onClick={applyCurrentLocation}
                                disabled={!currentLocation}
                                className='inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                            >
                                <MapPin className='h-3.5 w-3.5' />
                                {t("useCurrentLocation")}
                            </button>
                        </div>
                    ) : null}
                    <button
                        type='button'
                        onClick={submit}
                        disabled={!canSubmit}
                        className='inline-flex items-center gap-2 rounded-xl bg-primary/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary disabled:opacity-40 disabled:shadow-none'
                    >
                        {isInlineSticky ? <Send className='h-4 w-4' /> : null}
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
