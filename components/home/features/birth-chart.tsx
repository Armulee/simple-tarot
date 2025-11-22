"use client"

import { useState, useEffect } from "react"
import { TypewriterText } from "../../typewriter-text"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { TimePicker } from "@/components/ui/time-picker"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar, Clock, MapPin, Sparkles, Scan } from "lucide-react"
import {
    resolveLocationFromCountryState,
    resolveLocationFromCoords,
} from "@/lib/location"
import { Country, State } from "country-state-city"
import { Loader2 } from "lucide-react"

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
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(1990, 4, 25))
    const [selectedTime, setSelectedTime] = useState<{ hour: string; minute: string }>({ hour: "10", minute: "45" })
    const [country, setCountry] = useState<string>("United States")
    const [stateProv, setStateProv] = useState<string>("New York")
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [timePickerOpen, setTimePickerOpen] = useState(false)
    const [locationOpen, setLocationOpen] = useState(false)
    const [searchCountry, setSearchCountry] = useState("")
    const [searchState, setSearchState] = useState("")
    const [countries, setCountries] = useState<Array<{ name: string; code: string }>>([])
    const [states, setStates] = useState<Array<{ name: string; code: string }>>([])
    const [timezone, setTimezone] = useState<number>(getDeviceTimezone())
    const [lat, setLat] = useState<string>("")
    const [lng, setLng] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)

    // Load countries
    useEffect(() => {
        const allCountries = Country.getAllCountries()
        setCountries(allCountries.map(c => ({ name: c.name, code: c.isoCode })))
    }, [])

    // Load states when country changes
    useEffect(() => {
        if (country) {
            const countryObj = Country.getAllCountries().find(c => c.name === country)
            if (countryObj) {
                const allStates = State.getStatesOfCountry(countryObj.isoCode)
                setStates(allStates.map(s => ({ name: s.name, code: s.isoCode })))
            }
        }
    }, [country])

    // Resolve location to lat/lng/timezone
    useEffect(() => {
        if (country) {
            const resolved = resolveLocationFromCountryState(country, stateProv || undefined)
            if (resolved) {
                setLat(resolved.latitude.toFixed(6))
                setLng(resolved.longitude.toFixed(6))
                setTimezone(resolved.timezone)
            }
        }
    }, [country, stateProv])

    // Auto-detect location on mount
    useEffect(() => {
        if (navigator?.geolocation && !lat && !lng) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const latNum = pos.coords.latitude
                    const lngNum = pos.coords.longitude
                    const resolved = await resolveLocationFromCoords(latNum, lngNum)
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
    }, [lat, lng])

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchCountry.toLowerCase())
    )

    const filteredStates = states.filter(s =>
        s.name.toLowerCase().includes(searchState.toLowerCase())
    )

    // Format date as "Month dd, yyyy"
    const formattedDate = selectedDate
        ? (() => {
            const months = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            const month = months[selectedDate.getMonth()]
            const day = selectedDate.getDate()
            const year = selectedDate.getFullYear()
            return `${month} ${day.toString().padStart(2, "0")}, ${year}`
        })()
        : "Select date"

    // Format time as "hh:mm am/pm"
    const formattedTime = selectedTime.hour && selectedTime.minute
        ? (() => {
            const hour = parseInt(selectedTime.hour)
            const minute = parseInt(selectedTime.minute)
            const period = hour >= 12 ? "PM" : "AM"
            const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
            return `${displayHour.toString().padStart(2, "0")}:${selectedTime.minute.padStart(2, "0")} ${period}`
        })()
        : "Select time"

    const locationDisplay = country && stateProv
        ? `${stateProv}, ${country}`
        : country
        ? country
        : "Select location"

    const isValid = selectedDate && selectedTime.hour && selectedTime.minute && lat && lng

    const handleGenerate = async () => {
        if (!isValid || !selectedDate) return
        
        setIsGenerating(true)
        try {
            const day = selectedDate.getDate().toString()
            const month = (selectedDate.getMonth() + 1).toString()
            const year = selectedDate.getFullYear().toString()
            
            const params = new URLSearchParams({
                day,
                month,
                year,
                hour: selectedTime.hour,
                minute: selectedTime.minute,
                timezone: timezone.toString(),
                lat,
                lng,
            })
            
            router.push(`/birth-chart?${params.toString()}`)
        } catch (error) {
            console.error("Error generating chart:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <TypewriterText
                        text="Decode your cosmic blueprint"
                        speed={60}
                        className='text-white'
                    />
                </h1>
            </div>

            {/* Birth Information Section */}
            <div className='flex flex-col gap-8 justify-center items-center pt-8 w-full max-w-2xl px-4'>
                {/* Input Card */}
                <div 
                    className='w-full p-8 rounded-[20px] bg-gradient-to-br from-[#0A0F26] to-[#131A3A] border border-white/[0.1] shadow-2xl relative overflow-hidden'
                    style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}
                >
                    {/* Ambient glow effect */}
                    <div className='absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none' />
                    
                    <div className='relative z-10 space-y-6'>
                        {/* Section Title */}
                        <h2 className='text-[24px] font-semibold text-[#E6EAFF] mb-6'>
                            Your Birth Information
                        </h2>

                        {/* Date & Time Row */}
                        <div className='grid grid-cols-2 gap-4'>
                            {/* Date Input */}
                            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        className='w-full px-4 py-4 rounded-2xl bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <Calendar className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                            <span className={`text-sm font-medium ${selectedDate ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}>
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
                            <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        className='w-full px-4 py-4 rounded-2xl bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <Clock className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                            <span className={`text-sm font-medium ${selectedTime.hour && selectedTime.minute ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}>
                                                {formattedTime}
                                            </span>
                                        </div>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className='w-auto p-3 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                    <TimePicker
                                        value={selectedTime}
                                        onChange={(time) => {
                                            setSelectedTime(time)
                                            setTimePickerOpen(false)
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Location Input */}
                        <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    className='w-full px-4 py-4 rounded-2xl bg-white/[0.1] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.12] transition-all duration-300 text-left flex items-center justify-between group'
                                >
                                    <div className='flex items-center gap-3'>
                                        <MapPin className='w-4 h-4 text-[#E6EAFF]/70 group-hover:text-[#E6EAFF] transition-colors' />
                                        <span className={`text-sm font-medium ${locationDisplay !== "Select location" ? "text-[#E6EAFF]" : "text-[#E6EAFF]/50"}`}>
                                            {locationDisplay}
                                        </span>
                                    </div>
                                    <svg className='w-4 h-4 text-[#E6EAFF]/50' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                    </svg>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className='w-80 p-0 bg-[#0A0F26]/95 backdrop-blur-xl border-white/10 rounded-xl shadow-2xl'>
                                <div className='p-4 space-y-4'>
                                    {/* Country Search */}
                                    <div>
                                        <input
                                            type='text'
                                            placeholder='Search countries...'
                                            value={searchCountry}
                                            onChange={(e) => setSearchCountry(e.target.value)}
                                            className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                        />
                                        <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                            {filteredCountries.slice(0, 10).map((c) => (
                                                <button
                                                    key={c.code}
                                                    onClick={() => {
                                                        setCountry(c.name)
                                                        setSearchCountry("")
                                                        setStateProv("")
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                        country === c.name
                                                            ? "bg-purple-500/20 text-purple-300"
                                                            : "text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]"
                                                    }`}
                                                >
                                                    {c.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* State Search */}
                                    {country && (
                                        <div>
                                            <input
                                                type='text'
                                                placeholder='Search states/provinces...'
                                                value={searchState}
                                                onChange={(e) => setSearchState(e.target.value)}
                                                className='w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-[#E6EAFF] placeholder-[#E6EAFF]/50 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30'
                                            />
                                            <div className='max-h-40 overflow-y-auto mt-2 space-y-1'>
                                                {filteredStates.slice(0, 10).map((s) => (
                                                    <button
                                                        key={s.code}
                                                        onClick={() => {
                                                            setStateProv(s.name)
                                                            setSearchState("")
                                                            setLocationOpen(false)
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                            stateProv === s.name
                                                                ? "bg-purple-500/20 text-purple-300"
                                                                : "text-[#E6EAFF]/90 hover:bg-white/10 hover:text-[#E6EAFF]"
                                                        }`}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={!isValid || isGenerating}
                            className='w-full py-6 rounded-[24px] bg-gradient-to-r from-[#6C4CFF] to-[#8B63FF] hover:from-[#7A5AFF] hover:to-[#9A73FF] text-white font-medium text-base shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className='w-5 h-5 animate-spin' />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className='w-5 h-5' />
                                    GENERATE CHART
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Floating Action Button - Auto-fill */}
                <button
                    onClick={async () => {
                        if (navigator?.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                                async (pos) => {
                                    const latNum = pos.coords.latitude
                                    const lngNum = pos.coords.longitude
                                    const resolved = await resolveLocationFromCoords(latNum, lngNum)
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
                    }}
                    className='fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/20 backdrop-blur-md shadow-2xl hover:bg-white/15 hover:scale-110 transition-all duration-300 flex items-center justify-center group z-50'
                    style={{
                        boxShadow: '0 8px 32px rgba(108, 76, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}
                    aria-label='Auto-fill location'
                >
                    <Scan className='w-5 h-5 text-[#E6EAFF] group-hover:text-white transition-colors' />
                </button>
            </div>
        </>
    )
}