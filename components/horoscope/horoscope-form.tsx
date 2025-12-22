"use client"

import { useEffect, useMemo, useState } from "react"
import { TypewriterText } from "@/components/typewriter-text"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Calendar,
    Clock,
    MapPin,
    Info,
    Send,
    ChevronLeft,
    Loader2,
} from "lucide-react"
import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { Country, State } from "country-state-city"
import { useStarConsent } from "@/components/star-consent"
import { toast } from "sonner"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import { useAuth } from "@/hooks/use-auth"

function getDeviceTimezone(): number {
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

/**
 * Horoscope / Astrology form (UI intentionally mirrors the Birth Chart card design).
 *
 * What it collects:
 * - Birth information (natal baseline)
 * - Transit information (defaults to "now" + current location)
 * - Optional user question
 *
 * What happens on submit:
 * - Computes BOTH snapshots via `/api/calculate-horoscope` (birth + transit)
 * - Saves a new record to Supabase via `/api/astrology/create` (includes `owner_user_id` when authenticated)
 * - Redirects to `/astrology/[id]`, where the Summary tab generates/streams the horoscope text and persists it.
 */
export default function HoroscopeForm() {
    const router = useRouter()
    const { user } = useAuth()
    const { choice, show } = useStarConsent()

    const [shouldStartTypewriter, setShouldStartTypewriter] = useState(false)
    useEffect(() => {
        const onActive = () => setShouldStartTypewriter(true)
        window.addEventListener("horoscope-slide-active", onActive)
        // Start immediately as well (safe fallback)
        setShouldStartTypewriter(true)
        return () =>
            window.removeEventListener("horoscope-slide-active", onActive)
    }, [])

    // Shared countries list
    const [countries, setCountries] = useState<
        Array<{ name: string; code: string }>
    >([])
    useEffect(() => {
        const allCountries = Country.getAllCountries()
        setCountries(
            allCountries.map((c) => ({ name: c.name, code: c.isoCode }))
        )
    }, [])

    // Birth states
    const [birthStates, setBirthStates] = useState<
        Array<{ name: string; code: string }>
    >([])
    // Transit states
    const [transitStates, setTransitStates] = useState<
        Array<{ name: string; code: string }>
    >([])

    // Birth info
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined)
    const [birthTime, setBirthTime] = useState<{
        hour: string
        minute: string
    }>({ hour: "", minute: "" })
    const [birthCountry, setBirthCountry] = useState("")
    const [birthStateProv, setBirthStateProv] = useState("")
    const [birthTimezone, setBirthTimezone] =
        useState<number>(getDeviceTimezone())
    const [birthLat, setBirthLat] = useState("")
    const [birthLng, setBirthLng] = useState("")

    // Transit info (defaults: now + current location)
    const now = useMemo(() => new Date(), [])
    const [transitDate, setTransitDate] = useState<Date | undefined>(now)
    const [transitTime, setTransitTime] = useState<{
        hour: string
        minute: string
    }>({
        hour: String(now.getHours()).padStart(2, "0"),
        minute: String(now.getMinutes()).padStart(2, "0"),
    })
    const [transitCountry, setTransitCountry] = useState("")
    const [transitStateProv, setTransitStateProv] = useState("")
    const [transitTimezone, setTransitTimezone] =
        useState<number>(getDeviceTimezone())
    const [transitLat, setTransitLat] = useState("")
    const [transitLng, setTransitLng] = useState("")

    // UI state (Birth)
    const [birthCalendarOpen, setBirthCalendarOpen] = useState(false)
    const [birthTimeOpen, setBirthTimeOpen] = useState(false)
    const [birthLocationOpen, setBirthLocationOpen] = useState(false)
    const [birthTimeStep, setBirthTimeStep] = useState<"hour" | "minute">(
        "hour"
    )
    const [birthLocationStep, setBirthLocationStep] = useState<
        "country" | "state"
    >("country")
    const [birthSearchCountry, setBirthSearchCountry] = useState("")
    const [birthSearchState, setBirthSearchState] = useState("")
    const [birthHourInput, setBirthHourInput] = useState("")
    const [birthMinuteInput, setBirthMinuteInput] = useState("")

    // UI state (Transit)
    const [transitCalendarOpen, setTransitCalendarOpen] = useState(false)
    const [transitTimeOpen, setTransitTimeOpen] = useState(false)
    const [transitLocationOpen, setTransitLocationOpen] = useState(false)
    const [transitTimeStep, setTransitTimeStep] = useState<"hour" | "minute">(
        "hour"
    )
    const [transitLocationStep, setTransitLocationStep] = useState<
        "country" | "state"
    >("country")
    const [transitSearchCountry, setTransitSearchCountry] = useState("")
    const [transitSearchState, setTransitSearchState] = useState("")
    const [transitHourInput, setTransitHourInput] = useState("")
    const [transitMinuteInput, setTransitMinuteInput] = useState("")

    const [question, setQuestion] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)

    // Load states when country changes
    useEffect(() => {
        if (!birthCountry) return
        const countryObj = Country.getAllCountries().find(
            (c) => c.name === birthCountry
        )
        if (!countryObj) return
        const allStates = State.getStatesOfCountry(countryObj.isoCode)
        setBirthStates(
            allStates.map((s) => ({ name: s.name, code: s.isoCode }))
        )
    }, [birthCountry])

    useEffect(() => {
        if (!transitCountry) return
        const countryObj = Country.getAllCountries().find(
            (c) => c.name === transitCountry
        )
        if (!countryObj) return
        const allStates = State.getStatesOfCountry(countryObj.isoCode)
        setTransitStates(
            allStates.map((s) => ({ name: s.name, code: s.isoCode }))
        )
    }, [transitCountry])

    // Resolve coords when a location is chosen
    useEffect(() => {
        if (!birthCountry) return
        const resolved = resolveLocationFromCountryState(
            birthCountry,
            birthStateProv || undefined
        )
        if (resolved) {
            setBirthLat(resolved.latitude.toFixed(6))
            setBirthLng(resolved.longitude.toFixed(6))
            setBirthTimezone(resolved.timezone)
        }
    }, [birthCountry, birthStateProv])

    useEffect(() => {
        if (!transitCountry) return
        const resolved = resolveLocationFromCountryState(
            transitCountry,
            transitStateProv || undefined
        )
        if (resolved) {
            setTransitLat(resolved.latitude.toFixed(6))
            setTransitLng(resolved.longitude.toFixed(6))
            setTransitTimezone(resolved.timezone)
        }
    }, [transitCountry, transitStateProv])

    // Transit defaults: try to use current device location on mount
    useEffect(() => {
        if (transitLat && transitLng) return
        if (!navigator?.geolocation) return
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const latNum = pos.coords.latitude
                const lngNum = pos.coords.longitude
                const resolved = await resolveLocationFromCoords(latNum, lngNum)
                setTransitLat(latNum.toFixed(6))
                setTransitLng(lngNum.toFixed(6))
                if (resolved?.timezone !== undefined)
                    setTransitTimezone(resolved.timezone)
                if (resolved?.countryName)
                    setTransitCountry(resolved.countryName)
                if (resolved?.stateName) setTransitStateProv(resolved.stateName)
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
        )
    }, [transitLat, transitLng])

    const filteredCountriesBirth = useMemo(
        () =>
            countries.filter((c) =>
                c.name.toLowerCase().includes(birthSearchCountry.toLowerCase())
            ),
        [countries, birthSearchCountry]
    )
    const filteredStatesBirth = useMemo(
        () =>
            birthStates.filter((s) =>
                s.name.toLowerCase().includes(birthSearchState.toLowerCase())
            ),
        [birthStates, birthSearchState]
    )
    const filteredCountriesTransit = useMemo(
        () =>
            countries.filter((c) =>
                c.name
                    .toLowerCase()
                    .includes(transitSearchCountry.toLowerCase())
            ),
        [countries, transitSearchCountry]
    )
    const filteredStatesTransit = useMemo(
        () =>
            transitStates.filter((s) =>
                s.name.toLowerCase().includes(transitSearchState.toLowerCase())
            ),
        [transitStates, transitSearchState]
    )

    const formattedBirthDate = birthDate
        ? birthDate.toLocaleDateString("en-US", {
              month: "long",
              day: "2-digit",
              year: "numeric",
          })
        : "Select date"
    const formattedTransitDate = transitDate
        ? transitDate.toLocaleDateString("en-US", {
              month: "long",
              day: "2-digit",
              year: "numeric",
          })
        : "Select date"

    const formattedTime = (t: { hour: string; minute: string }) => {
        if (!t.hour || !t.minute) return "Select time"
        const hour = parseInt(t.hour)
        const period = hour >= 12 ? "PM" : "AM"
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${String(displayHour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")} ${period}`
    }

    const birthLocationDisplay =
        birthCountry && birthStateProv
            ? `${birthStateProv}, ${birthCountry}`
            : birthCountry
              ? birthCountry
              : "Select location"

    const transitLocationDisplay =
        transitCountry && transitStateProv
            ? `${transitStateProv}, ${transitCountry}`
            : transitCountry
              ? transitCountry
              : "Select location"

    const isValid = useMemo(() => {
        return !!birthDate && !!transitDate
    }, [birthDate, transitDate])

    const handleLocationClick = async (target: "birth" | "transit") => {
        if (!navigator?.geolocation) return
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const latNum = pos.coords.latitude
                const lngNum = pos.coords.longitude
                const resolved = await resolveLocationFromCoords(latNum, lngNum)
                if (target === "birth") {
                    if (resolved?.countryName)
                        setBirthCountry(resolved.countryName)
                    if (resolved?.stateName)
                        setBirthStateProv(resolved.stateName)
                    setBirthLat(latNum.toFixed(6))
                    setBirthLng(lngNum.toFixed(6))
                    if (resolved?.timezone !== undefined)
                        setBirthTimezone(resolved.timezone)
                } else {
                    if (resolved?.countryName)
                        setTransitCountry(resolved.countryName)
                    if (resolved?.stateName)
                        setTransitStateProv(resolved.stateName)
                    setTransitLat(latNum.toFixed(6))
                    setTransitLng(lngNum.toFixed(6))
                    if (resolved?.timezone !== undefined)
                        setTransitTimezone(resolved.timezone)
                }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
        )
    }

    const calcChart = async (args: {
        day: string
        month: string
        year: string
        hour: string
        minute: string
        timezone: string
        lat: string
        lng: string
    }) => {
        const params = new URLSearchParams(args)
        const res = await fetch(`/api/calculate-horoscope?${params.toString()}`)
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err?.error || "Failed to calculate chart")
        }
        return res.json()
    }

    const handleGenerate = async () => {
        if (!birthDate || !transitDate) return
        setIsGenerating(true)
        try {
            const birth = {
                day: String(birthDate.getDate()),
                month: String(birthDate.getMonth() + 1),
                year: String(birthDate.getFullYear()),
                hour: birthTime.hour || "12",
                minute: birthTime.minute || "0",
                timezone: String(birthTimezone ?? 0),
                lat: birthLat || "0",
                lng: birthLng || "0",
                country: birthCountry,
                state: birthStateProv,
            }
            const transit = {
                day: String(transitDate.getDate()),
                month: String(transitDate.getMonth() + 1),
                year: String(transitDate.getFullYear()),
                hour: transitTime.hour || "12",
                minute: transitTime.minute || "0",
                timezone: String(transitTimezone ?? 0),
                lat: transitLat || "0",
                lng: transitLng || "0",
                country: transitCountry,
                state: transitStateProv,
            }

            const [birthChart, transitChart] = await Promise.all([
                calcChart(birth),
                calcChart(transit),
            ])

            const createRes = await fetch("/api/astrology/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    birth,
                    transit,
                    birthChart,
                    transitChart,
                    question: question.trim() || null,
                    user_id: user?.id ?? null,
                }),
            })

            if (!createRes.ok) {
                const err = await createRes.json().catch(() => ({}))
                throw new Error(err?.error || "Failed to create reading")
            }
            const { id } = await createRes.json()
            router.push(`/astrology/${id}`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleQuestionKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>
    ) => {
        if (e.key !== "Enter") return
        // Desktop: Enter submits; allow shift/cmd/ctrl for new line
        if (e.shiftKey || e.metaKey || e.ctrlKey) return
        e.preventDefault()
        if (!isGenerating && isValid) void handleGenerate()
    }

    const guardOpen = (open: boolean) => {
        if (open && (choice === null || choice === "declined")) {
            show()
            return false
        }
        return true
    }

    const Section = ({
        title,
        tooltip,
        selectedDate,
        onSelectDate,
        dateValue,
        currentTime,
        timeValue,
        locationValue,
        calendarOpen,
        setCalendarOpen,
        timeOpen,
        setTimeOpen,
        locationOpen,
        setLocationOpen,
        timeStep,
        setTimeStep,
        hourInput,
        setHourInput,
        minuteInput,
        setMinuteInput,
        setTime,
        locationStep,
        setLocationStep,
        searchCountry,
        setSearchCountry,
        searchState,
        setSearchState,
        filteredCountries,
        filteredStates,
        onSelectCountry,
        onSelectState,
        onUseCurrentLocation,
    }: {
        title: string
        tooltip: string
        selectedDate: Date | undefined
        onSelectDate: (d: Date | undefined) => void
        dateValue: string
        currentTime: { hour: string; minute: string }
        timeValue: string
        locationValue: string
        calendarOpen: boolean
        setCalendarOpen: (v: boolean) => void
        timeOpen: boolean
        setTimeOpen: (v: boolean) => void
        locationOpen: boolean
        setLocationOpen: (v: boolean) => void
        timeStep: "hour" | "minute"
        setTimeStep: (v: "hour" | "minute") => void
        hourInput: string
        setHourInput: (v: string) => void
        minuteInput: string
        setMinuteInput: (v: string) => void
        setTime: (v: { hour: string; minute: string }) => void
        locationStep: "country" | "state"
        setLocationStep: (v: "country" | "state") => void
        searchCountry: string
        setSearchCountry: (v: string) => void
        searchState: string
        setSearchState: (v: string) => void
        filteredCountries: Array<{ name: string; code: string }>
        filteredStates: Array<{ name: string; code: string }>
        onSelectCountry: (name: string) => void
        onSelectState: (name: string) => void
        onUseCurrentLocation: () => void
    }) => {
        return (
            <div className='flex flex-col gap-4 justify-center items-center pt-8 w-full max-w-2xl px-4'>
                <div className='w-full flex items-center gap-2'>
                    <h2 className='font-serif font-semibold text-xl text-white text-left'>
                        {title}
                    </h2>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type='button'
                                className='text-white/60 hover:text-white/80 transition-colors'
                                aria-label={`Information about ${title}`}
                            >
                                <Info className='w-4 h-4' />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            className='max-w-xs bg-[#0A0F26] border-white/20 text-[#E6EAFF] text-xs p-3'
                            side='right'
                        >
                            <p>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div
                    className='w-full p-4 rounded-[20px] bg-gradient-to-br from-[#0A0F26] to-[#131A3A] border border-white/[0.1] shadow-2xl relative overflow-hidden'
                    style={{
                        boxShadow:
                            "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    }}
                >
                    <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none' />

                    <div className='relative z-10 space-y-4'>
                        <div className='grid grid-cols-2 gap-4'>
                            <Popover
                                open={calendarOpen}
                                onOpenChange={(open) => {
                                    if (!guardOpen(open)) return
                                    setCalendarOpen(open)
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button className='w-full px-4 py-1 rounded-md bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'>
                                        <div className='flex items-center gap-3'>
                                            <Calendar className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                            <span
                                                className={`text-sm font-medium ${dateValue !== "Select date" ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                            >
                                                {dateValue}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className='w-auto p-3 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <CalendarComponent
                                        mode='single'
                                        selected={selectedDate}
                                        onSelect={(d) => {
                                            onSelectDate(d)
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

                            <Popover
                                open={timeOpen}
                                onOpenChange={(open) => {
                                    if (!guardOpen(open)) return
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
                                                className={`text-sm font-medium ${timeValue !== "Select time" ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                            >
                                                {timeValue}
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
                                                Back to hour
                                            </button>
                                        )}
                                        {timeStep === "hour" ? (
                                            <div>
                                                <input
                                                    type='text'
                                                    placeholder='Enter hour (0-23)'
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
                                                        )
                                                            setHourInput(val)
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
                                                            setTime({
                                                                hour: parseInt(
                                                                    hourInput
                                                                )
                                                                    .toString()
                                                                    .padStart(
                                                                        2,
                                                                        "0"
                                                                    ),
                                                                minute: "00",
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
                                                                        setTime(
                                                                            {
                                                                                hour: hourStr,
                                                                                minute: "00",
                                                                            }
                                                                        )
                                                                        setHourInput(
                                                                            ""
                                                                        )
                                                                        setTimeStep(
                                                                            "minute"
                                                                        )
                                                                    }}
                                                                    className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
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
                                                    placeholder='Enter minute (0-59)'
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
                                                        )
                                                            setMinuteInput(val)
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
                                                            setTime({
                                                                hour:
                                                                    currentTime.hour ||
                                                                    "00",
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
                                                            const matchesFilter =
                                                                !minuteInput ||
                                                                minuteStr.startsWith(
                                                                    minuteInput
                                                                )
                                                            if (!matchesFilter)
                                                                return null
                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => {
                                                                        setTime(
                                                                            {
                                                                                hour:
                                                                                    currentTime.hour ||
                                                                                    "00",
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
                                                                    className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
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

                        <div className='space-y-2'>
                            <div className='flex items-center gap-2'>
                                <Popover
                                    open={locationOpen}
                                    onOpenChange={(open) => {
                                        if (!guardOpen(open)) return
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
                                                    className={`text-sm font-medium ${locationValue !== "Select location" ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}
                                                >
                                                    {locationValue}
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
                                                    Back to countries
                                                </button>
                                            )}
                                            {locationStep === "country" ? (
                                                <div>
                                                    <input
                                                        type='text'
                                                        placeholder='Search countries...'
                                                        value={searchCountry}
                                                        onChange={(e) =>
                                                            setSearchCountry(
                                                                e.target.value
                                                            )
                                                        }
                                                        className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                                    />
                                                    <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                        <button
                                                            onClick={
                                                                onUseCurrentLocation
                                                            }
                                                            className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
                                                        >
                                                            <MapPin className='w-4 h-4' />
                                                            Use my location
                                                        </button>
                                                        {filteredCountries.map(
                                                            (c) => (
                                                                <button
                                                                    key={c.code}
                                                                    onClick={() => {
                                                                        onSelectCountry(
                                                                            c.name
                                                                        )
                                                                        setSearchCountry(
                                                                            ""
                                                                        )
                                                                        setLocationStep(
                                                                            "state"
                                                                        )
                                                                    }}
                                                                    className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
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
                                                        placeholder='Search states...'
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
                                                                        onSelectState(
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
                                                                    className='w-full text-left px-3 py-2 rounded-lg text-sm transition-colors text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]'
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className='space-y-4 text-center'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance'>
                    <span className='text-white'>Horoscope</span>{" "}
                    <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                        Astrology
                    </span>
                </h1>
                <div className='text-white/70 text-base sm:text-lg'>
                    {shouldStartTypewriter ? (
                        <TypewriterText
                            text='A transit reading based on your birth chart and current sky.'
                            speed={22}
                            className='text-white/70'
                        />
                    ) : (
                        "A transit reading based on your birth chart and current sky."
                    )}
                </div>
            </div>

            <Section
                title='Birth information'
                tooltip='Used as your natal baseline (your birth chart). Time and location improve accuracy.'
                selectedDate={birthDate}
                onSelectDate={setBirthDate}
                dateValue={formattedBirthDate}
                currentTime={birthTime}
                timeValue={formattedTime(birthTime)}
                locationValue={birthLocationDisplay}
                calendarOpen={birthCalendarOpen}
                setCalendarOpen={setBirthCalendarOpen}
                timeOpen={birthTimeOpen}
                setTimeOpen={setBirthTimeOpen}
                locationOpen={birthLocationOpen}
                setLocationOpen={setBirthLocationOpen}
                timeStep={birthTimeStep}
                setTimeStep={setBirthTimeStep}
                hourInput={birthHourInput}
                setHourInput={setBirthHourInput}
                minuteInput={birthMinuteInput}
                setMinuteInput={setBirthMinuteInput}
                setTime={setBirthTime}
                locationStep={birthLocationStep}
                setLocationStep={setBirthLocationStep}
                searchCountry={birthSearchCountry}
                setSearchCountry={setBirthSearchCountry}
                searchState={birthSearchState}
                setSearchState={setBirthSearchState}
                filteredCountries={filteredCountriesBirth}
                filteredStates={filteredStatesBirth}
                onSelectCountry={setBirthCountry}
                onSelectState={setBirthStateProv}
                onUseCurrentLocation={() => void handleLocationClick("birth")}
            />

            <Section
                title='Transit information'
                tooltip='Defaults to now + your current location. This is the “sky today” snapshot.'
                selectedDate={transitDate}
                onSelectDate={setTransitDate}
                dateValue={formattedTransitDate}
                currentTime={transitTime}
                timeValue={formattedTime(transitTime)}
                locationValue={transitLocationDisplay}
                calendarOpen={transitCalendarOpen}
                setCalendarOpen={setTransitCalendarOpen}
                timeOpen={transitTimeOpen}
                setTimeOpen={setTransitTimeOpen}
                locationOpen={transitLocationOpen}
                setLocationOpen={setTransitLocationOpen}
                timeStep={transitTimeStep}
                setTimeStep={setTransitTimeStep}
                hourInput={transitHourInput}
                setHourInput={setTransitHourInput}
                minuteInput={transitMinuteInput}
                setMinuteInput={setTransitMinuteInput}
                setTime={setTransitTime}
                locationStep={transitLocationStep}
                setLocationStep={setTransitLocationStep}
                searchCountry={transitSearchCountry}
                setSearchCountry={setTransitSearchCountry}
                searchState={transitSearchState}
                setSearchState={setTransitSearchState}
                filteredCountries={filteredCountriesTransit}
                filteredStates={filteredStatesTransit}
                onSelectCountry={setTransitCountry}
                onSelectState={setTransitStateProv}
                onUseCurrentLocation={() => void handleLocationClick("transit")}
            />

            <div className='flex flex-col gap-4 justify-center items-center pt-8 w-full max-w-2xl px-4'>
                <div className='w-full flex items-center justify-between gap-3'>
                    <h2 className='font-serif font-semibold text-xl text-white text-left'>
                        Question (optional)
                    </h2>
                </div>
                <div className='w-full relative group'>
                    <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90 transition-opacity' />
                    <AutoHeightTextarea
                        placeholder='Ask about love, career, money, timing…'
                        className='relative z-10 w-full pl-4 pr-4 py-3 text-white placeholder:text-white/60 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/40 rounded-2xl resize-none shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)]'
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleQuestionKeyDown}
                        disabled={isGenerating}
                    />
                </div>

                <div className='w-full flex justify-end pt-2'>
                    <Button
                        onClick={handleGenerate}
                        disabled={!isValid || isGenerating}
                        className='py-2 px-5 md:px-6 rounded-md bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 hover:border-primary/60 text-white font-medium text-sm shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] hover:shadow-[0_10px_30px_-10px_rgba(56,189,248,0.5)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0'
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className='w-5 h-5 animate-spin' />
                                <span>Creating…</span>
                            </>
                        ) : (
                            <>
                                <Send className='w-5 h-5' />
                                <span>Create reading</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </>
    )
}
