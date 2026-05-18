"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    ChevronLeft,
    Loader2,
    Sparkles,
} from "lucide-react"
import { Country, State } from "country-state-city"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface ProfileBirthFormProps {
    defaultBirthDate: string | null
    defaultBirthTime: string | null
    defaultBirthPlace: string | null
    onSubmit: (values: {
        birthDate: string
        birthTime: string | null
        birthPlace: string
    }) => Promise<void>
}

function parseIsoBirthDate(value: string | null): Date | undefined {
    if (!value) return undefined
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!match) return undefined
    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)
    const day = Number.parseInt(match[3], 10)
    if (!year || !month || !day) return undefined
    return new Date(year, month - 1, day)
}

function parseBirthTime(value: string | null): { hour: string; minute: string } {
    if (!value) return { hour: "", minute: "" }
    const match = /^(\d{1,2}):(\d{2})/.exec(value)
    if (!match) return { hour: "", minute: "" }
    return {
        hour: match[1].padStart(2, "0"),
        minute: match[2].padStart(2, "0"),
    }
}

function parseBirthPlace(value: string | null): {
    country: string
    state: string
} {
    if (!value) return { country: "", state: "" }
    const parts = value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    if (parts.length === 0) return { country: "", state: "" }
    if (parts.length === 1) return { country: parts[0], state: "" }
    return { country: parts[parts.length - 1], state: parts[parts.length - 2] }
}

export default function ProfileBirthForm({
    defaultBirthDate,
    defaultBirthTime,
    defaultBirthPlace,
    onSubmit,
}: ProfileBirthFormProps) {
    const t = useTranslations("BirthChart")

    const [date, setDate] = useState<Date | undefined>(() =>
        parseIsoBirthDate(defaultBirthDate),
    )
    const initialTime = useMemo(
        () => parseBirthTime(defaultBirthTime),
        [defaultBirthTime],
    )
    const [time, setTime] = useState(initialTime)
    const initialPlace = useMemo(
        () => parseBirthPlace(defaultBirthPlace),
        [defaultBirthPlace],
    )
    const [country, setCountry] = useState(initialPlace.country)
    const [stateProv, setStateProv] = useState(initialPlace.state)

    const [calendarOpen, setCalendarOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)
    const [timeStep, setTimeStep] = useState<"hour" | "minute">("hour")
    const [locationOpen, setLocationOpen] = useState(false)
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
        const all = Country.getAllCountries()
        setCountries(all.map((c) => ({ name: c.name, code: c.isoCode })))
    }, [])

    useEffect(() => {
        if (!country) {
            setStates([])
            return
        }
        const countryObj = Country.getAllCountries().find(
            (c) => c.name === country,
        )
        if (!countryObj) {
            setStates([])
            return
        }
        setStates(
            State.getStatesOfCountry(countryObj.isoCode).map((s) => ({
                name: s.name,
                code: s.isoCode,
            })),
        )
    }, [country])

    const [submitting, setSubmitting] = useState(false)

    const filteredCountries = countries.filter((c) =>
        c.name.toLowerCase().includes(searchCountry.toLowerCase()),
    )
    const filteredStates = states.filter((s) =>
        s.name.toLowerCase().includes(searchState.toLowerCase()),
    )

    const formattedDate = date
        ? date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : t("selectDate")
    const formattedTime =
        time.hour && time.minute
            ? `${time.hour}:${time.minute}`
            : t("selectTimeOptional")
    const formattedPlace = country
        ? stateProv
            ? `${stateProv}, ${country}`
            : country
        : t("selectPlace")

    const isValid = Boolean(date && country)

    const handleSubmit = async () => {
        if (!date || !country) return
        setSubmitting(true)
        try {
            const yyyy = date.getFullYear()
            const mm = String(date.getMonth() + 1).padStart(2, "0")
            const dd = String(date.getDate()).padStart(2, "0")
            const birthDate = `${yyyy}-${mm}-${dd}`
            const birthTime =
                time.hour && time.minute
                    ? `${time.hour}:${time.minute}:00`
                    : null
            const birthPlace = stateProv
                ? `${stateProv}, ${country}`
                : country

            // Persist to profile so the chart auto-compute can use it next time
            // and other features (chat, astrology form) see the saved info.
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) throw new Error("NO_SESSION")

            const profileRes = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    birthDate,
                    birthTime,
                    birthPlace,
                }),
            })

            if (!profileRes.ok) {
                const err = await profileRes.json().catch(() => ({}))
                throw new Error(err?.error || "PROFILE_SAVE_FAILED")
            }

            await onSubmit({
                birthDate,
                birthTime,
                birthPlace,
            })
        } catch (e) {
            console.error("Profile birth save failed:", e)
            toast.error(t("saveFailed"))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className='min-h-[calc(100dvh-64px)] flex items-center justify-center px-4 py-12'>
            <Card className='w-full max-w-lg p-8 bg-card/40 backdrop-blur-md border border-border/50 space-y-6'>
                <div className='text-center space-y-2'>
                    <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 mx-auto'>
                        <Sparkles className='w-6 h-6 text-accent' />
                    </div>
                    <h1 className='font-serif text-2xl text-white'>
                        {t("needsBirthInfoTitle")}
                    </h1>
                    <p className='text-sm text-white/70'>
                        {t("needsBirthInfoDescription")}
                    </p>
                </div>

                <div className='space-y-3'>
                    <FieldLabel>{t("birthDateLabel")}</FieldLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant='outline'
                                className='w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 text-white'
                            >
                                <CalendarIcon className='mr-2 h-4 w-4' />
                                {formattedDate}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-auto p-0 bg-[#0A0F26] border-white/10'>
                            <Calendar
                                mode='single'
                                selected={date}
                                onSelect={(d) => {
                                    setDate(d)
                                    setCalendarOpen(false)
                                }}
                                captionLayout='dropdown'
                                disabled={(d) =>
                                    d > new Date() || d < new Date("1900-01-01")
                                }
                                className='rounded-md border-0'
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className='space-y-3'>
                    <FieldLabel>
                        {t("birthTimeLabel")}{" "}
                        <span className='text-white/40 font-normal'>
                            ({t("optional")})
                        </span>
                    </FieldLabel>
                    <Popover
                        open={timeOpen}
                        onOpenChange={(open) => {
                            if (!open) setTimeStep("hour")
                            setTimeOpen(open)
                        }}
                    >
                        <PopoverTrigger asChild>
                            <Button
                                variant='outline'
                                className='w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 text-white'
                            >
                                <Clock className='mr-2 h-4 w-4' />
                                {formattedTime}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-64 p-0 bg-[#0A0F26] border-white/10'>
                            <div className='p-3'>
                                {timeStep === "minute" && (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => setTimeStep("hour")}
                                        className='mb-2 h-6 text-xs text-white/70 hover:text-white pl-0'
                                    >
                                        <ChevronLeft className='w-3 h-3 mr-1' />{" "}
                                        {t("back")}
                                    </Button>
                                )}
                                {timeStep === "hour" ? (
                                    <div className='grid grid-cols-4 gap-1 max-h-48 overflow-y-auto'>
                                        {Array.from({ length: 24 }, (_, i) => {
                                            const h = i
                                                .toString()
                                                .padStart(2, "0")
                                            return (
                                                <Button
                                                    key={i}
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={() => {
                                                        setTime((prev) => ({
                                                            ...prev,
                                                            hour: h,
                                                        }))
                                                        setTimeStep("minute")
                                                    }}
                                                    className={cn(
                                                        "text-xs",
                                                        time.hour === h
                                                            ? "bg-accent text-accent-foreground"
                                                            : "text-white/80",
                                                    )}
                                                >
                                                    {h}
                                                </Button>
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
                                                <Button
                                                    key={i}
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={() => {
                                                        setTime((prev) => ({
                                                            ...prev,
                                                            minute: m,
                                                        }))
                                                        setTimeOpen(false)
                                                        setTimeStep("hour")
                                                    }}
                                                    className={cn(
                                                        "text-xs",
                                                        time.minute === m
                                                            ? "bg-accent text-accent-foreground"
                                                            : "text-white/80",
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

                <div className='space-y-3'>
                    <FieldLabel>{t("birthPlaceLabel")}</FieldLabel>
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
                            <Button
                                variant='outline'
                                className='w-full justify-start text-left font-normal bg-white/5 border-white/10 hover:bg-white/10 text-white truncate'
                            >
                                <MapPin className='mr-2 h-4 w-4 shrink-0' />
                                <span className='truncate'>
                                    {formattedPlace}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className='w-[280px] p-0 bg-[#0A0F26] border-white/10'>
                            <div className='p-2'>
                                {locationStep === "state" && (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => {
                                            setLocationStep("country")
                                            setSearchState("")
                                        }}
                                        className='mb-2 h-6 text-xs text-white/70 hover:text-white w-full justify-start'
                                    >
                                        <ChevronLeft className='w-3 h-3 mr-1' />{" "}
                                        {t("backToCountries")}
                                    </Button>
                                )}
                                <input
                                    className='w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white mb-2 focus:outline-none focus:border-accent/50'
                                    placeholder={
                                        locationStep === "country"
                                            ? t("searchCountry")
                                            : t("searchState")
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
                                                <Button
                                                    key={c.code}
                                                    variant='ghost'
                                                    size='sm'
                                                    className={cn(
                                                        "w-full justify-start font-normal text-xs h-7",
                                                        country === c.name
                                                            ? "bg-white/10 text-white"
                                                            : "text-white/70",
                                                    )}
                                                    onClick={() => {
                                                        setCountry(c.name)
                                                        setStateProv("")
                                                        setLocationStep("state")
                                                        setSearchCountry("")
                                                    }}
                                                >
                                                    {c.name}
                                                </Button>
                                            ))
                                        ) : (
                                            <div className='text-xs text-white/40 p-2 text-center'>
                                                {t("noResults")}
                                            </div>
                                        )
                                    ) : filteredStates.length > 0 ? (
                                        filteredStates.map((s) => (
                                            <Button
                                                key={s.code}
                                                variant='ghost'
                                                size='sm'
                                                className={cn(
                                                    "w-full justify-start font-normal text-xs h-7",
                                                    stateProv === s.name
                                                        ? "bg-white/10 text-white"
                                                        : "text-white/70",
                                                )}
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
                                    ) : (
                                        <div className='text-xs text-white/40 p-2 text-center'>
                                            {t("noResults")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <Button
                    className='w-full bg-accent hover:bg-accent/90 text-white'
                    disabled={!isValid || submitting}
                    onClick={() => void handleSubmit()}
                >
                    {submitting ? (
                        <>
                            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                            {t("savingAndGenerating")}
                        </>
                    ) : (
                        t("saveAndGenerate")
                    )}
                </Button>
            </Card>
        </div>
    )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <span className='text-[10px] uppercase tracking-wider text-white/50 font-semibold block'>
            {children}
        </span>
    )
}
