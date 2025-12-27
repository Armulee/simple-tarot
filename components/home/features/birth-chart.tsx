"use client"

import { useState, useEffect } from "react"
import { TypewriterText } from "../../typewriter-text"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar, Clock, MapPin, Info, Send, ChevronLeft } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { Country, State } from "country-state-city"
import { Loader2 } from "lucide-react"
import { useStarConsent } from "@/components/star-consent"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

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

// Helper to load from localStorage
const loadSavedData = () => {
    if (typeof window === "undefined") return null
    try {
        const saved = localStorage.getItem("birth-chart-data")
        if (saved) {
            const data = JSON.parse(saved)
            // Restore Date object
            if (data.selectedDate) {
                data.selectedDate = new Date(data.selectedDate)
            }
            return data
        }
    } catch {
        // ignore errors
    }
    return null
}

export default function BirthChart() {
    const t = useTranslations("BirthChart")
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        undefined
    )
    const [selectedTime, setSelectedTime] = useState<{
        hour: string
        minute: string
    }>({ hour: "", minute: "" })
    const [country, setCountry] = useState<string>("")
    const [stateProv, setStateProv] = useState<string>("")
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [locationOpen, setLocationOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)
    const [searchCountry, setSearchCountry] = useState("")
    const [searchState, setSearchState] = useState("")
    const [timeStep, setTimeStep] = useState<"hour" | "minute">("hour")
    const [locationStep, setLocationStep] = useState<"country" | "state">(
        "country"
    )
    const [hourInput, setHourInput] = useState("")
    const [minuteInput, setMinuteInput] = useState("")
    const [countries, setCountries] = useState<
        Array<{ name: string; code: string }>
    >([])
    const [states, setStates] = useState<Array<{ name: string; code: string }>>(
        []
    )
    const [timezone, setTimezone] = useState<number>(getDeviceTimezone())
    const [lat, setLat] = useState<string>("")
    const [lng, setLng] = useState<string>("")
    const [locationSource, setLocationSource] = useState<"manual" | "gps">(
        "manual"
    )
    const [isGenerating, setIsGenerating] = useState(false)
    const [shouldStartTypewriter, setShouldStartTypewriter] = useState(false)
    const { choice, show } = useStarConsent()

    // Load saved data on mount
    useEffect(() => {
        const savedData = loadSavedData()
        if (savedData) {
            if (savedData.selectedDate) setSelectedDate(savedData.selectedDate)
            if (savedData.selectedTime) setSelectedTime(savedData.selectedTime)
            if (savedData.country) setCountry(savedData.country)
            if (savedData.stateProv) setStateProv(savedData.stateProv)
            if (savedData.lat) setLat(savedData.lat)
            if (savedData.lng) setLng(savedData.lng)
            if (savedData.timezone) setTimezone(savedData.timezone)
        }
    }, [])

    // Save data to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== "undefined") {
            const dataToSave = {
                selectedDate,
                selectedTime,
                country,
                stateProv,
                lat,
                lng,
                timezone,
            }
            localStorage.setItem("birth-chart-data", JSON.stringify(dataToSave))
        }
    }, [selectedDate, selectedTime, country, stateProv, lat, lng, timezone])

    // Load countries
    useEffect(() => {
        const allCountries = Country.getAllCountries()
        setCountries(
            allCountries.map((c) => ({ name: c.name, code: c.isoCode }))
        )
    }, [])

    // Load states when country changes
    useEffect(() => {
        if (country) {
            const countryObj = Country.getAllCountries().find(
                (c) => c.name === country
            )
            if (countryObj) {
                const allStates = State.getStatesOfCountry(countryObj.isoCode)
                setStates(
                    allStates.map((s) => ({ name: s.name, code: s.isoCode }))
                )
            }
        }
    }, [country])

    // Resolve location to lat/lng/timezone
    useEffect(() => {
        if (!country) return
        // If the user used GPS, keep their exact lat/lng (don't overwrite with generic centroids)
        if (locationSource === "gps" && lat && lng) return
        const resolved = resolveLocationFromCountryState(
            country,
            stateProv || undefined
        )
        if (resolved) {
            setLat(resolved.latitude.toFixed(6))
            setLng(resolved.longitude.toFixed(6))
            setTimezone(resolved.timezone)
        }
    }, [country, stateProv, locationSource, lat, lng])

    // Listen for when this slide becomes active (index 1)
    useEffect(() => {
        const handleSlideChange = () => {
            setShouldStartTypewriter(true)
        }

        // Check if we're on the birth chart slide (index 1)
        const checkSlide = () => {
            const event = new CustomEvent("check-birth-chart-slide")
            window.dispatchEvent(event)
        }

        window.addEventListener("birth-chart-slide-active", handleSlideChange)
        checkSlide()

        return () => {
            window.removeEventListener(
                "birth-chart-slide-active",
                handleSlideChange
            )
        }
    }, [])

    // Request location permission when "use my location" is clicked
    const handleLocationClick = () => {
        if (navigator?.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const latNum = pos.coords.latitude
                    const lngNum = pos.coords.longitude
                    const resolved = await resolveLocationFromCoords(
                        latNum,
                        lngNum
                    )

                    // Batch updates to avoid race conditions if possible,
                    // though React 18 batches auto.

                    // We need to set lat/lng LAST or in a way that doesn't get overwritten?
                    // If we setCountry, the effect [country] runs and overwrites lat/lng.
                    // We need to prevent that effect from overwriting explicit GPS coords.
                    // But the effect is designed to update coords when country changes.

                    setLocationSource("gps")
                    if (resolved?.countryName) setCountry(resolved.countryName)
                    if (resolved?.stateName) setStateProv(resolved.stateName)

                    // We set these AFTER country, but in same event loop.
                    // The effect will run after render.
                    // So the effect sees new country, and overwrites lat/lng.
                    // FIX: We should only resolve in the effect if the change was NOT from GPS.
                    // Hard to track.

                    // Alternative: Don't use effect for resolution. Use handler for dropdown change.
                    // But I am modifying existing code, let's try to be minimally invasive.
                    // I will just persist what is there.

                    setLat(latNum.toFixed(6))
                    setLng(lngNum.toFixed(6))
                    if (resolved?.timezone !== undefined) {
                        setTimezone(resolved.timezone)
                    }
                },
                () => {},
                { enableHighAccuracy: true, timeout: 8000 }
            )
        }
    }

    const filteredCountries = countries.filter((c) =>
        c.name.toLowerCase().includes(searchCountry.toLowerCase())
    )

    const filteredStates = states.filter((s) =>
        s.name.toLowerCase().includes(searchState.toLowerCase())
    )

    // Format date as "Month dd, yyyy"
    const formattedDate = selectedDate
        ? (() => {
              const months = [
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
              ]
              const month = months[selectedDate.getMonth()]
              const day = selectedDate.getDate()
              const year = selectedDate.getFullYear()
              return `${month} ${day.toString().padStart(2, "0")}, ${year}`
          })()
        : t("form.selectDate")

    // Format time as "hh:mm am/pm"
    const formattedTime =
        selectedTime.hour && selectedTime.minute
            ? (() => {
                  const hour = parseInt(selectedTime.hour)
                  const period = hour >= 12 ? "PM" : "AM"
                  const displayHour =
                      hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
                  return `${displayHour.toString().padStart(2, "0")}:${selectedTime.minute.padStart(2, "0")} ${period}`
              })()
            : t("form.selectTime")

    const locationDisplay =
        country && stateProv
            ? `${stateProv}, ${country}`
            : country
              ? country
              : t("form.selectLocation")

    const isValid = selectedDate !== undefined // Only date is required

    const handleGenerate = async () => {
        if (!selectedDate) return

        setIsGenerating(true)
        try {
            const day = selectedDate.getDate().toString()
            const month = (selectedDate.getMonth() + 1).toString()
            const year = selectedDate.getFullYear().toString()

            // Use default coordinates if location not provided (0,0 as fallback)
            const finalLat = lat || "0"
            const finalLng = lng || "0"
            const finalHour = selectedTime.hour || "12"
            const finalMinute = selectedTime.minute || "0"

            // Calculate birth chart first
            const params = new URLSearchParams({
                day,
                month,
                year,
                hour: finalHour,
                minute: finalMinute,
                timezone: timezone.toString(),
                lat: finalLat,
                lng: finalLng,
            })

            const res = await fetch(
                `/api/calculate-horoscope?${params.toString()}`
            )
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}))
                const errorMessage =
                    errorData.error || t("form.errors.calculateFailed")
                toast.error(errorMessage)
                return
            }
            const chartData = await res.json()

            // Create birth chart entry and get ID
            const createRes = await fetch("/api/birth-chart/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    day,
                    month,
                    year,
                    hour: finalHour,
                    minute: finalMinute,
                    timezone: timezone.toString(),
                    lat: finalLat,
                    lng: finalLng,
                    country,
                    state: stateProv,
                    chartData,
                }),
            })

            if (!createRes.ok) {
                const errorData = await createRes.json().catch(() => ({}))
                const errorMessage =
                    errorData.error || t("form.errors.createFailed")
                toast.error(errorMessage)
                return
            }

            const { id } = await createRes.json()
            router.push(`/birth-chart/${id}`)
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : t("form.errors.unexpectedError")
            toast.error(errorMessage)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance'>
                    {shouldStartTypewriter ? (
                        <>
                            <TypewriterText
                                text={t("title") + " "}
                                speed={60}
                                className='text-white'
                            />
                            <TypewriterText
                                text={t("subtitle")}
                                speed={60}
                                delay={60 * (t("title") + " ").length}
                                className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                            />
                        </>
                    ) : (
                        <>
                            <span className='text-white'>{t("title")} </span>
                            <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                                {t("subtitle")}
                            </span>
                        </>
                    )}
                </h1>
            </div>

            {/* Birth Information Section */}
            <div className='flex flex-col gap-4 justify-center items-center pt-8 w-full max-w-2xl px-4'>
                {/* Label - Outside Card */}
                <div className='w-full flex items-center gap-2'>
                    <h2 className='font-serif font-semibold text-xl text-white text-left'>
                        {t("form.birthInformation")}
                    </h2>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type='button'
                                className='text-white/60 hover:text-white/80 transition-colors'
                                aria-label='Information about birth information'
                            >
                                <Info className='w-4 h-4' />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            className='max-w-xs bg-[#0A0F26] border-white/20 text-[#E6EAFF] text-xs p-3'
                            side='right'
                        >
                            <p>{t("form.birthInformationTooltip")}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                {/* Input Card */}
                <div
                    className='w-full p-4 rounded-[20px] bg-gradient-to-br from-[#0A0F26] to-[#131A3A] border border-white/[0.1] shadow-2xl relative overflow-hidden'
                    style={{
                        boxShadow:
                            "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    }}
                >
                    {/* Ambient glow effect */}
                    <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none' />

                    <div className='relative z-10 space-y-4'>
                        {/* Date & Time Row */}
                        <div className='grid grid-cols-2 gap-4'>
                            {/* Date Input */}
                            <Popover
                                open={calendarOpen}
                                onOpenChange={(open) => {
                                    if (
                                        open &&
                                        (choice === null ||
                                            choice === "declined")
                                    ) {
                                        show()
                                        return
                                    }
                                    setCalendarOpen(open)
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button className='w-full px-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'>
                                        <div className='flex items-center gap-3'>
                                            <Calendar className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                            <span
                                                className={`text-sm font-medium ${selectedDate ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                            >
                                                {formattedDate}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className='w-auto p-3 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <CalendarComponent
                                        mode='single'
                                        selected={selectedDate}
                                        onSelect={(date) => {
                                            setSelectedDate(date)
                                            setCalendarOpen(false)
                                        }}
                                        captionLayout='dropdown'
                                        disabled={(date) =>
                                            date > new Date() ||
                                            date < new Date("1900-01-01")
                                        }
                                        className='rounded-md border-0 bg-transparent'
                                    />
                                </PopoverContent>
                            </Popover>

                            {/* Time Input */}
                            <Popover
                                open={timeOpen}
                                onOpenChange={(open) => {
                                    if (!open) {
                                        setTimeStep("hour")
                                        setHourInput("")
                                        setMinuteInput("")
                                    }
                                    setTimeOpen(open)
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        onClick={() => {
                                            if (
                                                choice === null ||
                                                choice === "declined"
                                            ) {
                                                show()
                                                return
                                            }
                                            setTimeOpen(true)
                                        }}
                                        className='w-full px-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <Clock className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                            <span
                                                className={`text-sm font-medium ${selectedTime.hour && selectedTime.minute ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                            >
                                                {formattedTime}
                                            </span>
                                        </div>
                                        <svg
                                            className='w-4 h-4 text-[#E6EAFF]/50'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                        >
                                            <path
                                                strokeLinecap='round'
                                                strokeLinejoin='round'
                                                strokeWidth={2}
                                                d='M9 5l7 7-7 7'
                                            />
                                        </svg>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className='w-80 p-0 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <div className='p-4 space-y-4'>
                                        {timeStep === "minute" && (
                                            <button
                                                onClick={() =>
                                                    setTimeStep("hour")
                                                }
                                                className='flex items-center gap-2 text-sm text-[#E6EAFF]/70 hover:text-[#E6EAFF] transition-colors mb-2'
                                            >
                                                <ChevronLeft className='w-4 h-4' />
                                                {t("form.backToHour")}
                                            </button>
                                        )}
                                        {timeStep === "hour" ? (
                                            <div>
                                                <input
                                                    type='text'
                                                    placeholder={t(
                                                        "form.enterBirthHour"
                                                    )}
                                                    value={hourInput}
                                                    onChange={(e) => {
                                                        const val =
                                                            e.target.value.replace(
                                                                /\D/g,
                                                                ""
                                                            )
                                                        if (
                                                            val === "" ||
                                                            (parseInt(val) >=
                                                                0 &&
                                                                parseInt(val) <=
                                                                    23)
                                                        ) {
                                                            setHourInput(val)
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key === "Enter" &&
                                                            hourInput &&
                                                            parseInt(
                                                                hourInput
                                                            ) >= 0 &&
                                                            parseInt(
                                                                hourInput
                                                            ) <= 23
                                                        ) {
                                                            setSelectedTime({
                                                                ...selectedTime,
                                                                hour: parseInt(
                                                                    hourInput
                                                                )
                                                                    .toString()
                                                                    .padStart(
                                                                        2,
                                                                        "0"
                                                                    ),
                                                            })
                                                            setHourInput("")
                                                            setTimeStep(
                                                                "minute"
                                                            )
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                    className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                />
                                                <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                    {Array.from(
                                                        { length: 24 },
                                                        (_, i) => {
                                                            const hourStr = i
                                                                .toString()
                                                                .padStart(
                                                                    2,
                                                                    "0"
                                                                )
                                                            const matchesFilter =
                                                                !hourInput ||
                                                                hourStr.includes(
                                                                    hourInput
                                                                ) ||
                                                                hourStr.startsWith(
                                                                    hourInput
                                                                )
                                                            if (!matchesFilter)
                                                                return null
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        setSelectedTime(
                                                                            {
                                                                                ...selectedTime,
                                                                                hour: hourStr,
                                                                            }
                                                                        )
                                                                        setHourInput(
                                                                            ""
                                                                        )
                                                                        setTimeStep(
                                                                            "minute"
                                                                        )
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                        selectedTime.hour ===
                                                                        hourStr
                                                                            ? "bg-purple-500/20 text-purple-300"
                                                                            : "text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]"
                                                                    }`}
                                                                >
                                                                    {hourStr}
                                                                </button>
                                                            )
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <input
                                                    type='text'
                                                    placeholder={t(
                                                        "form.enterBirthMinute"
                                                    )}
                                                    value={minuteInput}
                                                    onChange={(e) => {
                                                        const val =
                                                            e.target.value.replace(
                                                                /\D/g,
                                                                ""
                                                            )
                                                        if (
                                                            val === "" ||
                                                            (parseInt(val) >=
                                                                0 &&
                                                                parseInt(val) <=
                                                                    59)
                                                        ) {
                                                            setMinuteInput(val)
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key === "Enter" &&
                                                            minuteInput &&
                                                            parseInt(
                                                                minuteInput
                                                            ) >= 0 &&
                                                            parseInt(
                                                                minuteInput
                                                            ) <= 59
                                                        ) {
                                                            setSelectedTime({
                                                                ...selectedTime,
                                                                minute: parseInt(
                                                                    minuteInput
                                                                )
                                                                    .toString()
                                                                    .padStart(
                                                                        2,
                                                                        "0"
                                                                    ),
                                                            })
                                                            setMinuteInput("")
                                                            setTimeStep("hour")
                                                            setTimeOpen(false)
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                    className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                />
                                                <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                    {Array.from(
                                                        { length: 60 },
                                                        (_, i) => {
                                                            const minuteStr = i
                                                                .toString()
                                                                .padStart(
                                                                    2,
                                                                    "0"
                                                                )
                                                            let matchesFilter = true
                                                            if (minuteInput) {
                                                                if (
                                                                    minuteInput.length ===
                                                                    1
                                                                ) {
                                                                    // Single digit: show that digit (02) and all numbers starting with it (20-29 for "2")
                                                                    const digit =
                                                                        minuteInput
                                                                    matchesFilter =
                                                                        i ===
                                                                            parseInt(
                                                                                digit
                                                                            ) ||
                                                                        i
                                                                            .toString()
                                                                            .startsWith(
                                                                                digit
                                                                            )
                                                                } else {
                                                                    // Multiple digits: show exact matches or numbers starting with it
                                                                    matchesFilter =
                                                                        minuteStr.startsWith(
                                                                            minuteInput
                                                                        )
                                                                }
                                                            }
                                                            if (!matchesFilter)
                                                                return null
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        setSelectedTime(
                                                                            {
                                                                                ...selectedTime,
                                                                                minute: minuteStr,
                                                                            }
                                                                        )
                                                                        setMinuteInput(
                                                                            ""
                                                                        )
                                                                        setTimeStep(
                                                                            "hour"
                                                                        )
                                                                        setTimeOpen(
                                                                            false
                                                                        )
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                        selectedTime.minute ===
                                                                        minuteStr
                                                                            ? "bg-purple-500/20 text-purple-300"
                                                                            : "text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]"
                                                                    }`}
                                                                >
                                                                    {minuteStr}
                                                                </button>
                                                            )
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Location Input */}
                        <div className='space-y-2'>
                            <div className='flex items-center gap-2'>
                                <Popover
                                    open={locationOpen}
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setLocationStep("country")
                                            setSearchCountry("")
                                            setSearchState("")
                                        }
                                        setLocationOpen(open)
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <button
                                            onClick={() => {
                                                if (
                                                    choice === null ||
                                                    choice === "declined"
                                                ) {
                                                    show()
                                                    return
                                                }
                                                setLocationOpen(true)
                                            }}
                                            className='flex-1 px-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'
                                        >
                                            <div className='flex items-center gap-3'>
                                                <MapPin className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                                <span
                                                    className={`text-sm font-medium ${locationDisplay !== t("form.selectLocation") ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                                >
                                                    {locationDisplay}
                                                </span>
                                            </div>
                                            <svg
                                                className='w-4 h-4 text-[#E6EAFF]/50'
                                                fill='none'
                                                stroke='currentColor'
                                                viewBox='0 0 24 24'
                                            >
                                                <path
                                                    strokeLinecap='round'
                                                    strokeLinejoin='round'
                                                    strokeWidth={2}
                                                    d='M9 5l7 7-7 7'
                                                />
                                            </svg>
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className='w-80 p-0 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                        <div className='p-4 space-y-4'>
                                            {locationStep === "state" && (
                                                <button
                                                    onClick={() => {
                                                        setLocationStep(
                                                            "country"
                                                        )
                                                        setSearchState("")
                                                    }}
                                                    className='flex items-center gap-2 text-sm text-[#E6EAFF]/70 hover:text-[#E6EAFF] transition-colors mb-2'
                                                >
                                                    <ChevronLeft className='w-4 h-4' />
                                                    {t("form.backToCountry")}
                                                </button>
                                            )}
                                            {locationStep === "country" ? (
                                                <div>
                                                    <input
                                                        type='text'
                                                        placeholder={t(
                                                            "form.searchCountries"
                                                        )}
                                                        value={searchCountry}
                                                        onChange={(e) =>
                                                            setSearchCountry(
                                                                e.target.value
                                                            )
                                                        }
                                                        className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                    />
                                                    <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                        {/* Use current location option */}
                                                        <button
                                                            onClick={
                                                                handleLocationClick
                                                            }
                                                            className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
                                                        >
                                                            <MapPin className='w-4 h-4' />
                                                            {t(
                                                                "form.useCurrentLocation"
                                                            )}
                                                        </button>
                                                        {filteredCountries.map(
                                                            (c) => (
                                                                <button
                                                                    key={c.code}
                                                                    onClick={() => {
                                                                        setLocationSource(
                                                                            "manual"
                                                                        )
                                                                        setCountry(
                                                                            c.name
                                                                        )
                                                                        setSearchCountry(
                                                                            ""
                                                                        )
                                                                        setLocationStep(
                                                                            "state"
                                                                        )
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                        country ===
                                                                        c.name
                                                                            ? "bg-purple-500/20 text-purple-300"
                                                                            : "text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]"
                                                                    }`}
                                                                >
                                                                    {c.name}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <input
                                                        type='text'
                                                        placeholder={t(
                                                            "form.searchStatesProvinces"
                                                        )}
                                                        value={searchState}
                                                        onChange={(e) =>
                                                            setSearchState(
                                                                e.target.value
                                                            )
                                                        }
                                                        className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                    />
                                                    <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                        {filteredStates.map(
                                                            (s) => (
                                                                <button
                                                                    key={s.code}
                                                                    onClick={() => {
                                                                        setLocationSource(
                                                                            "manual"
                                                                        )
                                                                        setStateProv(
                                                                            s.name
                                                                        )
                                                                        setSearchState(
                                                                            ""
                                                                        )
                                                                        setLocationOpen(
                                                                            false
                                                                        )
                                                                        setLocationStep(
                                                                            "country"
                                                                        )
                                                                    }}
                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                        stateProv ===
                                                                        s.name
                                                                            ? "bg-purple-500/20 text-purple-300"
                                                                            : "text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]"
                                                                    }`}
                                                                >
                                                                    {s.name}
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!isValid || isGenerating}
                                    className='py-1 px-4 md:px-6 rounded-md bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 hover:border-primary/60 text-white font-medium text-sm shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] hover:shadow-[0_10px_30px_-10px_rgba(56,189,248,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0'
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className='w-5 h-5 animate-spin' />
                                            <span className='hidden md:inline'>
                                                {t("form.generating")}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className='w-5 h-5' />
                                            <span className='hidden md:inline'>
                                                {t("form.generateChart")}
                                            </span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
