"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { TypewriterText } from "@/components/typewriter-text"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useProfile } from "@/contexts/profile-context"

import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { Country, State } from "country-state-city"
import { toast } from "sonner"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import { useAuth } from "@/hooks/use-auth"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import Section from "../ui/horoscope-section"
import { Loader2, Send } from "lucide-react"

const STORAGE_KEY = "astrology-form-v1"

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
    const { profile } = useProfile()

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
    const [birthLocationSource, setBirthLocationSource] = useState<
        "manual" | "gps"
    >("manual")

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
    const [transitLocationSource, setTransitLocationSource] = useState<
        "manual" | "gps"
    >("manual")

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
    const [saveBirthDate, setSaveBirthDate] = useState(false)
    const defaultSystem: "western_tropical" | "vedic_sidereal" =
        "vedic_sidereal"

    // Load initial values from localStorage
    const hasLoadedFromStorage = useRef(false)
    useEffect(() => {
        if (hasLoadedFromStorage.current) return
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const data = JSON.parse(saved)
                if (data.birthDate) setBirthDate(new Date(data.birthDate))
                if (data.birthTime) setBirthTime(data.birthTime)
                if (data.birthCountry) setBirthCountry(data.birthCountry)
                if (data.birthStateProv) setBirthStateProv(data.birthStateProv)
                if (data.birthLat) setBirthLat(data.birthLat)
                if (data.birthLng) setBirthLng(data.birthLng)
                if (data.birthTimezone !== undefined)
                    setBirthTimezone(data.birthTimezone)
                if (data.birthLocationSource)
                    setBirthLocationSource(data.birthLocationSource)

                if (data.transitDate) setTransitDate(new Date(data.transitDate))
                if (data.transitTime) setTransitTime(data.transitTime)
                if (data.transitCountry) setTransitCountry(data.transitCountry)
                if (data.transitStateProv)
                    setTransitStateProv(data.transitStateProv)
                if (data.transitLat) setTransitLat(data.transitLat)
                if (data.transitLng) setTransitLng(data.transitLng)
                if (data.transitTimezone !== undefined)
                    setTransitTimezone(data.transitTimezone)
                if (data.transitLocationSource)
                    setTransitLocationSource(data.transitLocationSource)

                if (data.question) setQuestion(data.question)
            } catch (e) {
                console.error("Failed to parse saved astrology form data", e)
            }
        }
        hasLoadedFromStorage.current = true
    }, [])

    // If localStorage is empty, try loading from profile
    useEffect(() => {
        if (hasLoadedFromStorage.current || !profile) return

        if (profile.birth_date) {
            setBirthDate(new Date(profile.birth_date))
        }
        if (profile.birth_time) {
            const [h, m] = profile.birth_time.split(":")
            setBirthTime({ hour: h || "", minute: m || "" })
        }
        if (profile.birth_place) {
            // birth_place is often "State, Country" or "Country"
            const parts = profile.birth_place.split(",").map((p) => p.trim())
            if (parts.length > 1) {
                setBirthStateProv(parts[0] || "")
                setBirthCountry(parts[1] || "")
            } else {
                setBirthCountry(parts[0] || "")
            }
        }
        // Mark as loaded so we don't overwrite user changes later
        hasLoadedFromStorage.current = true
    }, [profile])

    // Save values to localStorage whenever they change
    useEffect(() => {
        if (!hasLoadedFromStorage.current) return
        const data = {
            birthDate,
            birthTime,
            birthCountry,
            birthStateProv,
            birthLat,
            birthLng,
            birthTimezone,
            birthLocationSource,
            transitDate,
            transitTime,
            transitCountry,
            transitStateProv,
            transitLat,
            transitLng,
            transitTimezone,
            transitLocationSource,
            question,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, [
        birthDate,
        birthTime,
        birthCountry,
        birthStateProv,
        birthLat,
        birthLng,
        birthTimezone,
        birthLocationSource,
        transitDate,
        transitTime,
        transitCountry,
        transitStateProv,
        transitLat,
        transitLng,
        transitTimezone,
        transitLocationSource,
        question,
    ])

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
        if (birthLocationSource === "gps" && birthLat && birthLng) return
        const resolved = resolveLocationFromCountryState(
            birthCountry,
            birthStateProv || undefined
        )
        if (resolved) {
            setBirthLat(resolved.latitude.toFixed(6))
            setBirthLng(resolved.longitude.toFixed(6))
            setBirthTimezone(resolved.timezone)
        }
    }, [birthCountry, birthStateProv, birthLocationSource, birthLat, birthLng])

    useEffect(() => {
        if (!transitCountry) return
        if (transitLocationSource === "gps" && transitLat && transitLng) return
        const resolved = resolveLocationFromCountryState(
            transitCountry,
            transitStateProv || undefined
        )
        if (resolved) {
            setTransitLat(resolved.latitude.toFixed(6))
            setTransitLng(resolved.longitude.toFixed(6))
            setTransitTimezone(resolved.timezone)
        }
    }, [
        transitCountry,
        transitStateProv,
        transitLocationSource,
        transitLat,
        transitLng,
    ])

    // Transit defaults: try to use current device location on mount
    useEffect(() => {
        if (transitLat && transitLng) return
        if (!navigator?.geolocation) return
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const latNum = pos.coords.latitude
                const lngNum = pos.coords.longitude
                const resolved = await resolveLocationFromCoords(latNum, lngNum)
                setTransitLocationSource("gps")
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
                    setBirthLocationSource("gps")
                    if (resolved?.countryName)
                        setBirthCountry(resolved.countryName)
                    if (resolved?.stateName)
                        setBirthStateProv(resolved.stateName)
                    setBirthLat(latNum.toFixed(6))
                    setBirthLng(lngNum.toFixed(6))
                    if (resolved?.timezone !== undefined)
                        setBirthTimezone(resolved.timezone)
                } else {
                    setTransitLocationSource("gps")
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
        system: "western_tropical" | "vedic_sidereal"
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
                system: defaultSystem,
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
                system: defaultSystem,
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
                    systemMode: defaultSystem,
                    inputConfidence: {
                        exactBirthTime: Boolean(birthTime.hour && birthTime.minute),
                        usedBirthLocationFallback: !birthCountry,
                    },
                    swissephSnapshot: {
                        birthChartMeta: {
                            ascendant: birthChart?.ascendant ?? null,
                            mc: birthChart?.mc ?? null,
                            aspects: birthChart?.aspects ?? [],
                            ayanamsa: birthChart?.ayanamsa ?? null,
                        },
                        transitChartMeta: {
                            ascendant: transitChart?.ascendant ?? null,
                            mc: transitChart?.mc ?? null,
                            aspects: transitChart?.aspects ?? [],
                            ayanamsa: transitChart?.ayanamsa ?? null,
                        },
                    },
                    user_id: user?.id ?? null,
                }),
            })

            if (!createRes.ok) {
                const err = await createRes.json().catch(() => ({}))
                throw new Error(err?.error || "Failed to create reading")
            }
            const { id } = await createRes.json()

            // Save birth date to profile if checkbox is checked and user is logged in
            if (saveBirthDate && user) {
                try {
                    // Get fresh session to ensure we have a valid access token
                    const {
                        data: { session: currentSession },
                    } = await supabase.auth.getSession()

                    if (!currentSession?.access_token) {
                        console.error(
                            "No valid session found for saving birth date"
                        )
                        return
                    }

                    const birthDateStr = birthDate
                        ? `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, "0")}-${String(birthDate.getDate()).padStart(2, "0")}`
                        : null
                    const birthTimeStr =
                        birthTime.hour && birthTime.minute
                            ? `${birthTime.hour}:${birthTime.minute}:00`
                            : null
                    const birthPlaceStr =
                        birthCountry && birthStateProv
                            ? `${birthStateProv}, ${birthCountry}`
                            : birthCountry || null

                    const profileRes = await fetch("/api/profile", {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${currentSession.access_token}`,
                        },
                        body: JSON.stringify({
                            birthDate: birthDateStr,
                            birthTime: birthTimeStr,
                            birthPlace: birthPlaceStr,
                        }),
                    })

                    if (!profileRes.ok) {
                        const errorData = await profileRes
                            .json()
                            .catch(() => ({}))
                        console.error("Failed to save birth date to profile:", {
                            status: profileRes.status,
                            statusText: profileRes.statusText,
                            error: errorData,
                        })
                    }
                } catch (error) {
                    console.error("Error saving birth date:", error)
                    // Don't show error toast as this is optional
                }
            }

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

            <div className='w-full max-w-6xl mx-auto px-4 lg:px-8 pt-8 lg:pt-10'>
                <div className='flex flex-col gap-8 lg:flex-row lg:items-start'>
                    <div className='flex-1 flex flex-col gap-2'>
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
                            onSelectCountry={(name) => {
                                setBirthLocationSource("manual")
                                setBirthCountry(name)
                            }}
                            onSelectState={(name) => {
                                setBirthLocationSource("manual")
                                setBirthStateProv(name)
                            }}
                            onUseCurrentLocation={() =>
                                void handleLocationClick("birth")
                            }
                            type='birth'
                            containerClassName='max-w-md px-0 pt-0 items-stretch justify-start'
                        />
                        <BirthDateSaveCheckbox
                            saveBirthDate={saveBirthDate}
                            setSaveBirthDate={setSaveBirthDate}
                        />
                    </div>

                    <div className='flex-1'>
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
                            onSelectCountry={(name) => {
                                setTransitLocationSource("manual")
                                setTransitCountry(name)
                            }}
                            onSelectState={(name) => {
                                setTransitLocationSource("manual")
                                setTransitStateProv(name)
                            }}
                            onUseCurrentLocation={() =>
                                void handleLocationClick("transit")
                            }
                            type='transit'
                            containerClassName='max-w-md px-0 pt-0 items-stretch justify-start'
                        />
                    </div>
                </div>
            </div>

            <div className='flex flex-col gap-4 justify-center items-center pt-8 w-full max-w-md px-4'>
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

const BirthDateSaveCheckbox = ({
    saveBirthDate,
    setSaveBirthDate,
}: {
    saveBirthDate: boolean
    setSaveBirthDate: (value: boolean) => void
}) => {
    const { user } = useAuth()
    if (!user) return null

    return (
        <div className='w-full max-w-2xl px-8 flex items-center gap-2 pt-2 lg:max-w-none lg:px-0'>
            <Checkbox
                id='save-birth-date'
                checked={saveBirthDate}
                onCheckedChange={(checked) =>
                    setSaveBirthDate(checked === true)
                }
                className='border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary'
            />
            <label
                htmlFor='save-birth-date'
                className='text-sm text-[#E6EAFF]/70 cursor-pointer select-none hover:text-[#E6EAFF] transition-colors'
            >
                Save this birth date to my profile
            </label>
        </div>
    )
}
