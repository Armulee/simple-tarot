"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar, Clock, MapPin, Pencil, X, Check, Loader2, ChevronLeft } from "lucide-react"
import { Country, State } from "country-state-city"
import { resolveLocationFromCountryState } from "@/lib/location"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface BirthChartInfoCardProps {
    birthChart: {
        id: string
        day: number
        month: number
        year: number
        hour: number
        minute: number
        timezone: number
        lat: number
        lng: number
        country?: string | null
        state_province?: string | null
    }
}

export default function BirthChartInfoCard({ birthChart }: BirthChartInfoCardProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Form State
    const [date, setDate] = useState<Date | undefined>(
        new Date(birthChart.year, birthChart.month - 1, birthChart.day)
    )
    const [time, setTime] = useState({ 
        hour: birthChart.hour.toString().padStart(2, "0"), 
        minute: birthChart.minute.toString().padStart(2, "0") 
    })
    const [country, setCountry] = useState(birthChart.country || "")
    const [stateProv, setStateProv] = useState(birthChart.state_province || "")
    
    // UI State
    const [calendarOpen, setCalendarOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)
    const [locationOpen, setLocationOpen] = useState(false)
    const [timeStep, setTimeStep] = useState<"hour" | "minute">("hour")
    const [locationStep, setLocationStep] = useState<"country" | "state">("country")
    const [searchCountry, setSearchCountry] = useState("")
    const [searchState, setSearchState] = useState("")
    const [hourInput, setHourInput] = useState("")
    const [minuteInput, setMinuteInput] = useState("")

    // Data
    const [countries, setCountries] = useState<Array<{ name: string; code: string }>>([])
    const [states, setStates] = useState<Array<{ name: string; code: string }>>([])

    useEffect(() => {
        const allCountries = Country.getAllCountries()
        setCountries(allCountries.map(c => ({ name: c.name, code: c.isoCode })))
    }, [])

    useEffect(() => {
        if (country) {
            const countryObj = Country.getAllCountries().find(c => c.name === country)
            if (countryObj) {
                const allStates = State.getStatesOfCountry(countryObj.isoCode)
                setStates(allStates.map(s => ({ name: s.name, code: s.isoCode })))
            }
        }
    }, [country])

    const handleSave = async () => {
        if (!date) return
        setIsSaving(true)

        try {
            const day = date.getDate().toString()
            const month = (date.getMonth() + 1).toString()
            const year = date.getFullYear().toString()
            
            // Resolve new location data
            let lat = birthChart.lat.toString()
            let lng = birthChart.lng.toString()
            let timezone = birthChart.timezone.toString()

            if (country !== birthChart.country || stateProv !== birthChart.state_province) {
                const resolved = resolveLocationFromCountryState(country, stateProv || undefined)
                if (resolved) {
                    lat = resolved.latitude.toFixed(6)
                    lng = resolved.longitude.toFixed(6)
                    timezone = resolved.timezone.toString()
                }
            }

            // Calculate new horoscope
            const params = new URLSearchParams({
                day,
                month,
                year,
                hour: time.hour,
                minute: time.minute,
                timezone,
                lat,
                lng,
            })

            const calcRes = await fetch(`/api/calculate-horoscope?${params.toString()}`)
            if (!calcRes.ok) throw new Error("Failed to calculate chart")
            const chartData = await calcRes.json()

            // Create new chart entry
            const createRes = await fetch("/api/birth-chart/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    day,
                    month,
                    year,
                    hour: time.hour,
                    minute: time.minute,
                    timezone,
                    lat,
                    lng,
                    country,
                    state: stateProv,
                    chartData,
                }),
            })

            if (!createRes.ok) throw new Error("Failed to save chart")
            
            const { id } = await createRes.json()
            
            // Redirect to new chart
            router.push(`/birth-chart/${id}`)
            
        } catch (error) {
            toast.error("Failed to update chart")
            console.error(error)
            setIsSaving(false)
        }
    }

    const formatDateDisplay = (d: Date) => {
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    const formatTimeDisplay = (h: string, m: string) => {
        const hour = parseInt(h)
        const ampm = hour >= 12 ? "PM" : "AM"
        const displayHour = hour % 12 || 12
        return `${displayHour}:${m} ${ampm}`
    }

    const locationDisplay = [stateProv, country].filter(Boolean).join(", ")

    const filteredCountries = countries.filter(c =>
        c.name.toLowerCase().includes(searchCountry.toLowerCase())
    )

    const filteredStates = states.filter(s =>
        s.name.toLowerCase().includes(searchState.toLowerCase())
    )

    if (isEditing) {
        return (
            <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                <div className="grid gap-4">
                    {/* Date Picker */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Date</span>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 text-white">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {date ? formatDateDisplay(date) : "Select date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#0A0F26] border-white/10">
                                <CalendarComponent
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => {
                                        setDate(d)
                                        setCalendarOpen(false)
                                    }}
                                    captionLayout="dropdown"
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                    className="rounded-md border-0"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Time Picker */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Time</span>
                        <Popover open={timeOpen} onOpenChange={(open) => {
                            if (!open) {
                                setTimeStep("hour")
                                setHourInput("")
                                setMinuteInput("")
                            }
                            setTimeOpen(open)
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 text-white">
                                    <Clock className="mr-2 h-4 w-4" />
                                    {formatTimeDisplay(time.hour, time.minute)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-0 bg-[#0A0F26] border-white/10">
                                <div className="p-3">
                                    {timeStep === "minute" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setTimeStep("hour")}
                                            className="mb-2 h-6 text-xs text-white/70 hover:text-white pl-0"
                                        >
                                            <ChevronLeft className="w-3 h-3 mr-1" /> Back
                                        </Button>
                                    )}
                                    {timeStep === "hour" ? (
                                        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
                                            {Array.from({ length: 24 }, (_, i) => {
                                                const h = i.toString().padStart(2, "0")
                                                return (
                                                    <Button
                                                        key={i}
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setTime(prev => ({ ...prev, hour: h }))
                                                            setTimeStep("minute")
                                                        }}
                                                        className={cn(
                                                            "text-xs",
                                                            time.hour === h ? "bg-primary text-primary-foreground" : "text-white/80"
                                                        )}
                                                    >
                                                        {h}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
                                            {Array.from({ length: 12 }, (_, i) => {
                                                const m = (i * 5).toString().padStart(2, "0")
                                                return (
                                                    <Button
                                                        key={i}
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setTime(prev => ({ ...prev, minute: m }))
                                                            setTimeOpen(false)
                                                            setTimeStep("hour")
                                                        }}
                                                        className={cn(
                                                            "text-xs",
                                                            time.minute === m ? "bg-primary text-primary-foreground" : "text-white/80"
                                                        )}
                                                    >
                                                        {m}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Location Picker */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Location</span>
                        <Popover open={locationOpen} onOpenChange={(open) => {
                            if (!open) {
                                setLocationStep("country")
                                setSearchCountry("")
                                setSearchState("")
                            }
                            setLocationOpen(open)
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 text-white truncate">
                                    <MapPin className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="truncate">{locationDisplay || "Select Location"}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0 bg-[#0A0F26] border-white/10">
                                <div className="p-2">
                                    {locationStep === "state" && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setLocationStep("country")
                                                setSearchState("")
                                            }}
                                            className="mb-2 h-6 text-xs text-white/70 hover:text-white w-full justify-start"
                                        >
                                            <ChevronLeft className="w-3 h-3 mr-1" /> Back to Countries
                                        </Button>
                                    )}
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white mb-2 focus:outline-none focus:border-primary/50"
                                        placeholder={locationStep === "country" ? "Search country..." : "Search state..."}
                                        value={locationStep === "country" ? searchCountry : searchState}
                                        onChange={e => locationStep === "country" ? setSearchCountry(e.target.value) : setSearchState(e.target.value)}
                                    />
                                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                                        {locationStep === "country" ? (
                                            filteredCountries.length > 0 ? (
                                                filteredCountries.map(c => (
                                                    <Button
                                                        key={c.code}
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn("w-full justify-start font-normal text-xs h-7", country === c.name ? "bg-white/10 text-white" : "text-white/70")}
                                                        onClick={() => {
                                                            setCountry(c.name)
                                                            setLocationStep("state")
                                                            setSearchCountry("")
                                                        }}
                                                    >
                                                        {c.name}
                                                    </Button>
                                                ))
                                            ) : <div className="text-xs text-white/40 p-2 text-center">No countries found</div>
                                        ) : (
                                            filteredStates.length > 0 ? (
                                                filteredStates.map(s => (
                                                    <Button
                                                        key={s.code}
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn("w-full justify-start font-normal text-xs h-7", stateProv === s.name ? "bg-white/10 text-white" : "text-white/70")}
                                                        onClick={() => {
                                                            setStateProv(s.name)
                                                            setLocationOpen(false)
                                                            setLocationStep("country")
                                                            setSearchState("")
                                                        }}
                                                    >
                                                        {s.name}
                                                    </Button>
                                                ))
                                            ) : <div className="text-xs text-white/40 p-2 text-center">No states found</div>
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-2">
                        <Button 
                            variant="secondary" 
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                        >
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button 
                            className="flex-1 bg-primary hover:bg-primary/90 text-white border-0"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            {isSaving ? "Saving..." : "Update"}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between gap-4">
            <div className="flex flex-row items-center justify-between gap-2 w-full text-[10px] sm:text-xs text-white/90 font-medium">
                <div className="flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-3 h-3 text-primary/80" />
                    <span className="whitespace-nowrap">{date ? formatDateDisplay(date) : "N/A"}</span>
                </div>
                <div className="w-px h-3 bg-white/20 shrink-0" />
                <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3 text-primary/80" />
                    <span className="whitespace-nowrap">{formatTimeDisplay(time.hour, time.minute)}</span>
                </div>
                <div className="w-px h-3 bg-white/20 shrink-0" />
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <MapPin className="w-3 h-3 text-primary/80 shrink-0" />
                    <span className="truncate">{locationDisplay || "Unknown"}</span>
                </div>
            </div>
            
            <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                onClick={() => setIsEditing(true)}
            >
                <Pencil className="w-3 h-3" />
            </Button>
        </div>
    )
}
