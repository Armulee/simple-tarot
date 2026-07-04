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
import {
    Calendar,
    Clock,
    MapPin,
    Pencil,
    X,
    Check,
    Loader2,
    ChevronLeft,
} from "lucide-react"
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

    const [date, setDate] = useState<Date | undefined>(
        new Date(birthChart.year, birthChart.month - 1, birthChart.day),
    )
    const [time, setTime] = useState({
        hour: birthChart.hour.toString().padStart(2, "0"),
        minute: birthChart.minute.toString().padStart(2, "0"),
    })
    const [country, setCountry] = useState(birthChart.country || "")
    const [stateProv, setStateProv] = useState(birthChart.state_province || "")

    const [calendarOpen, setCalendarOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)
    const [locationOpen, setLocationOpen] = useState(false)
    const [timeStep, setTimeStep] = useState<"hour" | "minute">("hour")
    const [locationStep, setLocationStep] = useState<"country" | "state">(
        "country",
    )
    const [searchCountry, setSearchCountry] = useState("")
    const [searchState, setSearchState] = useState("")

    const [countries, setCountries] = useState<
        Array<{ name: string; code: string }>
    >([])
    const [states, setStates] = useState<Array<{ name: string; code: string }>>(
        [],
    )

    useEffect(() => {
        const allCountries = Country.getAllCountries()
        setCountries(allCountries.map((c) => ({ name: c.name, code: c.isoCode })))
    }, [])

    useEffect(() => {
        if (country) {
            const countryObj = Country.getAllCountries().find(
                (c) => c.name === country,
            )
            if (countryObj) {
                const allStates = State.getStatesOfCountry(countryObj.isoCode)
                setStates(
                    allStates.map((s) => ({ name: s.name, code: s.isoCode })),
                )
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

            let lat = birthChart.lat.toString()
            let lng = birthChart.lng.toString()
            let timezone = birthChart.timezone.toString()

            if (
                country !== birthChart.country ||
                stateProv !== birthChart.state_province
            ) {
                const resolved = resolveLocationFromCountryState(
                    country,
                    stateProv || undefined,
                )
                if (resolved) {
                    lat = resolved.latitude.toFixed(6)
                    lng = resolved.longitude.toFixed(6)
                    timezone = resolved.timezone.toString()
                }
            }

            if (mode === "personal") {
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

            const calcRes = await fetch(
                `/api/calculate-horoscope?${params.toString()}`,
            )
            if (!calcRes.ok) throw new Error("Failed to calculate chart")
            const chartData = await calcRes.json()

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
            router.push(`/birth-chart/${id}`)
        } catch (error) {
            toast.error("Failed to update chart")
            console.error(error)
            setIsSaving(false)
        }
    }

    const formatDateDisplay = (d: Date) =>
        d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })

    const formatTimeDisplay = (h: string, m: string) => {
        const hour = parseInt(h)
        const ampm = hour >= 12 ? "PM" : "AM"
        const displayHour = hour % 12 || 12
        return `${displayHour}:${m} ${ampm}`
    }

    const locationDisplay = [stateProv, country].filter(Boolean).join(", ")
    const filteredCountries = countries.filter((c) =>
        c.name.toLowerCase().includes(searchCountry.toLowerCase()),
    )
    const filteredStates = states.filter((s) =>
        s.name.toLowerCase().includes(searchState.toLowerCase()),
    )

    const popoverSurface =
        "bg-white/[0.06] backdrop-blur-2xl border-white/[0.08] text-white shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)]"

    if (isEditing) {
        return (
            <div className='rounded-2xl bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/[0.08] shadow-[0_20px_60px_-24px_rgba(0,0,0,0.55)] p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200 text-left'>
                <div className='grid gap-4 sm:grid-cols-3'>
                    <Field label='Date'>
                        <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                        >
                            <PopoverTrigger asChild>
                                <FieldButton
                                    icon={<Calendar className='h-3.5 w-3.5' />}
                                >
                                    {date
                                        ? formatDateDisplay(date)
                                        : "Select date"}
                                </FieldButton>
                            </PopoverTrigger>
                            <PopoverContent
                                className={cn("w-auto p-0", popoverSurface)}
                            >
                                <CalendarComponent
                                    mode='single'
                                    selected={date}
                                    onSelect={(d) => {
                                        setDate(d)
                                        setCalendarOpen(false)
                                    }}
                                    captionLayout='dropdown'
                                    fromYear={1900}
                                    toYear={new Date().getFullYear()}
                                    className='rounded-md border-0'
                                />
                            </PopoverContent>
                        </Popover>
                    </Field>

                    <Field label='Time'>
                        <Popover
                            open={timeOpen}
                            onOpenChange={(open) => {
                                if (!open) setTimeStep("hour")
                                setTimeOpen(open)
                            }}
                        >
                            <PopoverTrigger asChild>
                                <FieldButton
                                    icon={<Clock className='h-3.5 w-3.5' />}
                                >
                                    {formatTimeDisplay(time.hour, time.minute)}
                                </FieldButton>
                            </PopoverTrigger>
                            <PopoverContent
                                className={cn("w-64 p-0", popoverSurface)}
                            >
                                <div className='p-3'>
                                    {timeStep === "minute" && (
                                        <button
                                            type='button'
                                            onClick={() => setTimeStep("hour")}
                                            className='mb-2 inline-flex h-6 items-center text-xs text-white/60 hover:text-white'
                                        >
                                            <ChevronLeft className='w-3 h-3 mr-1' />
                                            Back
                                        </button>
                                    )}
                                    {timeStep === "hour" ? (
                                        <div className='grid grid-cols-4 gap-1 max-h-48 overflow-y-auto'>
                                            {Array.from({ length: 24 }, (_, i) => {
                                                const h = i
                                                    .toString()
                                                    .padStart(2, "0")
                                                return (
                                                    <button
                                                        type='button'
                                                        key={i}
                                                        onClick={() => {
                                                            setTime((prev) => ({
                                                                ...prev,
                                                                hour: h,
                                                            }))
                                                            setTimeStep("minute")
                                                        }}
                                                        className={cn(
                                                            "rounded-lg px-2 py-1.5 text-xs tabular-nums transition-colors",
                                                            time.hour === h
                                                                ? "bg-white/15 text-white"
                                                                : "text-white/75 hover:bg-white/10",
                                                        )}
                                                    >
                                                        {h}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className='grid grid-cols-4 gap-1 max-h-48 overflow-y-auto'>
                                            {Array.from({ length: 60 }, (_, i) => {
                                                const m = i
                                                    .toString()
                                                    .padStart(2, "0")
                                                return (
                                                    <button
                                                        type='button'
                                                        key={i}
                                                        onClick={() => {
                                                            setTime((prev) => ({
                                                                ...prev,
                                                                minute: m,
                                                            }))
                                                            setTimeOpen(false)
                                                            setTimeStep("hour")
                                                        }}
                                                        className={cn(
                                                            "rounded-lg px-2 py-1.5 text-xs tabular-nums transition-colors",
                                                            time.minute === m
                                                                ? "bg-white/15 text-white"
                                                                : "text-white/75 hover:bg-white/10",
                                                        )}
                                                    >
                                                        {m}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </Field>

                    <Field label='Location'>
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
                                <FieldButton
                                    icon={<MapPin className='h-3.5 w-3.5' />}
                                >
                                    <span className='truncate'>
                                        {locationDisplay || "Select Location"}
                                    </span>
                                </FieldButton>
                            </PopoverTrigger>
                            <PopoverContent
                                className={cn("w-[280px] p-0", popoverSurface)}
                            >
                                <div className='p-2'>
                                    {locationStep === "state" && (
                                        <button
                                            type='button'
                                            onClick={() => {
                                                setLocationStep("country")
                                                setSearchState("")
                                            }}
                                            className='mb-2 inline-flex h-6 w-full items-center text-xs text-white/60 hover:text-white'
                                        >
                                            <ChevronLeft className='w-3 h-3 mr-1' />
                                            Back to Countries
                                        </button>
                                    )}
                                    <input
                                        className='w-full bg-white/10 border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white mb-2 placeholder:text-white/40 focus:outline-none focus:border-white/30'
                                        placeholder={
                                            locationStep === "country"
                                                ? "Search country..."
                                                : "Search state..."
                                        }
                                        value={
                                            locationStep === "country"
                                                ? searchCountry
                                                : searchState
                                        }
                                        onChange={(e) =>
                                            locationStep === "country"
                                                ? setSearchCountry(e.target.value)
                                                : setSearchState(e.target.value)
                                        }
                                    />
                                    <div className='max-h-48 overflow-y-auto space-y-0.5'>
                                        {locationStep === "country" ? (
                                            filteredCountries.length > 0 ? (
                                                filteredCountries.map((c) => (
                                                    <button
                                                        type='button'
                                                        key={c.code}
                                                        onClick={() => {
                                                            setCountry(c.name)
                                                            setLocationStep("state")
                                                            setSearchCountry("")
                                                        }}
                                                        className={cn(
                                                            "w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                                                            country === c.name
                                                                ? "bg-white/15 text-white"
                                                                : "text-white/75 hover:bg-white/10",
                                                        )}
                                                    >
                                                        {c.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className='text-xs text-white/45 p-2 text-center'>
                                                    No countries found
                                                </div>
                                            )
                                        ) : filteredStates.length > 0 ? (
                                            filteredStates.map((s) => (
                                                <button
                                                    type='button'
                                                    key={s.code}
                                                    onClick={() => {
                                                        setStateProv(s.name)
                                                        setLocationOpen(false)
                                                        setLocationStep("country")
                                                        setSearchState("")
                                                    }}
                                                    className={cn(
                                                        "w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                                                        stateProv === s.name
                                                            ? "bg-white/15 text-white"
                                                            : "text-white/75 hover:bg-white/10",
                                                    )}
                                                >
                                                    {s.name}
                                                </button>
                                            ))
                                        ) : (
                                            <div className='text-xs text-white/45 p-2 text-center'>
                                                No states found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </Field>
                </div>

                <div className='mt-5 flex justify-end gap-2'>
                    <Button
                        variant='ghost'
                        className='rounded-full text-white/80 hover:text-white hover:bg-white/10'
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                    >
                        <X className='w-4 h-4 mr-1.5' /> Cancel
                    </Button>
                    <Button
                        className='rounded-full bg-white text-black hover:bg-white/90 border-0'
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
                        ) : (
                            <Check className='w-4 h-4 mr-1.5' />
                        )}
                        {isSaving ? "Saving..." : "Update"}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className='inline-flex w-full items-center justify-between gap-2 rounded-full bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/[0.08] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)] pl-4 pr-1.5 py-1.5'>
            <div className='flex min-w-0 flex-1 items-center gap-x-4 gap-y-1 text-sm text-white/85 overflow-hidden'>
                <InfoChip
                    icon={<Calendar className='h-3.5 w-3.5' />}
                    text={date ? formatDateDisplay(date) : "N/A"}
                />
                <Separator />
                <InfoChip
                    icon={<Clock className='h-3.5 w-3.5' />}
                    text={formatTimeDisplay(time.hour, time.minute)}
                />
                <Separator />
                <InfoChip
                    icon={<MapPin className='h-3.5 w-3.5' />}
                    text={locationDisplay || "Unknown"}
                    truncate
                />
            </div>
            <button
                type='button'
                onClick={() => setIsEditing(true)}
                aria-label='Edit birth details'
                className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/85 hover:bg-white/20 hover:text-white transition-colors'
            >
                <Pencil className='h-3.5 w-3.5' />
            </button>
        </div>
    )
}

function Separator() {
    return (
        <span
            aria-hidden
            className='hidden sm:inline-block h-3.5 w-px bg-white/15'
        />
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className='flex flex-col gap-1.5'>
            <span className='text-xs font-medium text-white/55'>{label}</span>
            {children}
        </div>
    )
}

function FieldButton({
    icon,
    children,
}: {
    icon: ReactNode
    children: ReactNode
}) {
    return (
        <Button
            variant='outline'
            className='w-full justify-start text-left font-normal rounded-xl bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.10] hover:border-white/[0.18] text-white'
        >
            <span className='mr-2 text-white/65'>{icon}</span>
            <span className='truncate'>{children}</span>
        </Button>
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
        <span
            className={cn(
                "inline-flex items-center gap-1.5 text-[13px] text-white/90",
                truncate ? "min-w-0" : "shrink-0",
            )}
        >
            <span className='text-white/55'>{icon}</span>
            <span
                className={cn(
                    "whitespace-nowrap",
                    truncate && "truncate",
                )}
            >
                {text}
            </span>
        </span>
    )
}
