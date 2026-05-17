"use client"

import { useState, useEffect, type ReactNode } from "react"
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
import { supabase } from "@/lib/supabase"

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
    mode?: "shared" | "personal"
    onChartUpdated?: () => void | Promise<void>
}

export default function BirthChartInfoCard({
    birthChart,
    mode = "shared",
    onChartUpdated,
}: BirthChartInfoCardProps) {
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

            if (mode === "personal") {
                // Personal page: also persist to profile and recompute via the
                // authed /me endpoint so the row is linked to owner_user_id.
                const { data: sessionData } =
                    await supabase.auth.getSession()
                const accessToken = sessionData.session?.access_token
                if (!accessToken) throw new Error("NO_SESSION")

                const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
                const birthTime =
                    time.hour && time.minute
                        ? `${time.hour}:${time.minute}:00`
                        : null
                const birthPlace = stateProv
                    ? `${stateProv}, ${country}`
                    : country

                await fetch("/api/profile", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        birthDate: isoDate,
                        birthTime,
                        birthPlace,
                    }),
                }).catch(() => {})

                const meRes = await fetch("/api/birth-chart/me", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        birthDate: isoDate,
                        birthTime,
                        birthPlace,
                    }),
                })
                if (!meRes.ok) throw new Error("Failed to save chart")

                if (onChartUpdated) await onChartUpdated()
                setIsEditing(false)
                setIsSaving(false)
                return
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

            // Create new chart entry (shared link mode)
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
            <div className="mt-2 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] backdrop-blur-xl p-5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-200 text-left">
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
                        <Popover
                            open={timeOpen}
                            onOpenChange={(open) => {
                                if (!open) {
                                    setTimeStep("hour")
                                }
                                setTimeOpen(open)
                            }}
                        >
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
                                                            time.hour === h ? "bg-accent text-accent-foreground" : "text-white/80"
                                                        )}
                                                    >
                                                        {h}
                                                    </Button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
                                            {Array.from({ length: 60 }, (_, i) => {
                                                const m = i.toString().padStart(2, "0")
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
                                                            time.minute === m ? "bg-accent text-accent-foreground" : "text-white/80"
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
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white mb-2 focus:outline-none focus:border-accent/50"
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
                            className="flex-1 bg-accent hover:bg-accent/90 text-white border-0"
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
        <div className="mt-2 inline-flex w-full max-w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-3 sm:px-4 py-2.5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.7)]">
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-x-3 gap-y-1.5 text-[11px] sm:text-xs font-medium text-white/85">
                <InfoChip
                    icon={<Calendar className="h-3 w-3" />}
                    text={date ? formatDateDisplay(date) : "N/A"}
                />
                <span className="h-3 w-px bg-white/15" />
                <InfoChip
                    icon={<Clock className="h-3 w-3" />}
                    text={formatTimeDisplay(time.hour, time.minute)}
                />
                <span className="h-3 w-px bg-white/15" />
                <InfoChip
                    icon={<MapPin className="h-3 w-3" />}
                    text={locationDisplay || "Unknown"}
                    truncate
                />
            </div>

            <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 rounded-full border border-white/10 bg-white/[0.04] text-white/70 hover:border-amber-300/40 hover:bg-amber-300/10 hover:text-amber-200 transition-colors"
                onClick={() => setIsEditing(true)}
                aria-label="Edit birth details"
            >
                <Pencil className="h-3 w-3" />
            </Button>
        </div>
    )
}

function InfoChip({
    icon,
    text,
    truncate,
}: {
    icon: ReactNode
    text: string
    truncate?: boolean
}) {
    return (
        <span className={cn("inline-flex items-center gap-1.5", truncate ? "min-w-0" : "shrink-0")}>
            <span className="text-amber-200/80">{icon}</span>
            <span className={cn("whitespace-nowrap", truncate && "truncate")}>{text}</span>
        </span>
    )
}
