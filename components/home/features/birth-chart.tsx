"use client"

import { useState, useEffect, useMemo } from "react"
import { TypewriterText } from "../../typewriter-text"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { Country, State } from "country-state-city"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import Section from "@/components/ui/horoscope-section"

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

    const filteredCountries = useMemo(
        () =>
            countries.filter((c) =>
                c.name.toLowerCase().includes(searchCountry.toLowerCase())
            ),
        [countries, searchCountry]
    )

    const filteredStates = useMemo(
        () =>
            states.filter((s) =>
                s.name.toLowerCase().includes(searchState.toLowerCase())
            ),
        [states, searchState]
    )

    // Format date as "Month dd, yyyy"
    const formattedDate = selectedDate
        ? selectedDate.toLocaleDateString("en-US", {
              month: "long",
              day: "2-digit",
              year: "numeric",
          })
        : t("form.selectDate")

    // Format time as "hh:mm am/pm"
    const formattedTime = useMemo(() => {
        if (!selectedTime.hour || !selectedTime.minute)
            return t("form.selectTime")
        const hour = parseInt(selectedTime.hour)
        const period = hour >= 12 ? "PM" : "AM"
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${String(displayHour).padStart(2, "0")}:${String(selectedTime.minute).padStart(2, "0")} ${period}`
    }, [selectedTime, t])

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
            <Section
                title={t("form.birthInformation")}
                tooltip={t("form.birthInformationTooltip")}
                selectedDate={selectedDate}
                onSelectDate={(d) => setSelectedDate(d)}
                dateValue={formattedDate}
                currentTime={selectedTime}
                timeValue={formattedTime}
                locationValue={locationDisplay}
                calendarOpen={calendarOpen}
                setCalendarOpen={setCalendarOpen}
                timeOpen={timeOpen}
                setTimeOpen={setTimeOpen}
                locationOpen={locationOpen}
                setLocationOpen={setLocationOpen}
                timeStep={timeStep}
                setTimeStep={setTimeStep}
                hourInput={hourInput}
                setHourInput={setHourInput}
                minuteInput={minuteInput}
                setMinuteInput={setMinuteInput}
                setTime={(v) => setSelectedTime(v)}
                locationStep={locationStep}
                setLocationStep={setLocationStep}
                searchCountry={searchCountry}
                setSearchCountry={setSearchCountry}
                searchState={searchState}
                setSearchState={setSearchState}
                filteredCountries={filteredCountries}
                filteredStates={filteredStates}
                onSelectCountry={(name) => {
                    setLocationSource("manual")
                    setCountry(name)
                }}
                onSelectState={(name) => {
                    setLocationSource("manual")
                    setStateProv(name)
                }}
                onUseCurrentLocation={handleLocationClick}
                type="birth"
                onButtonClick={handleGenerate}
                buttonDisabled={!isValid || isGenerating}
                buttonLoading={isGenerating}
                buttonLabel={t("form.generateChart")}
                buttonLoadingLabel={t("form.generating")}
            />
        </>
    )
}
