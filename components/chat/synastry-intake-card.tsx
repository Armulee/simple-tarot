"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import { LocationSelector } from "@/components/ui/location-selector"
import { resolveLocationFromCountryState } from "@/lib/location"
import type { SynastryPersonBirth } from "@/lib/chat/synastry-schema"

type SynastryIntakeCardProps = {
    /** Prefill the name when it was mentioned in the question. */
    initialName?: string | null
    submitting?: boolean
    onSubmit: (birth: SynastryPersonBirth) => void
}

/**
 * Inline card shown in the chat when synastry needs the other person's birth
 * details (the question named someone with no stored birth data). Collects the
 * info and hands it back so the reading can run. Mirrors the character form
 * inputs, in the pink synastry theme.
 */
export default function SynastryIntakeCard({
    initialName,
    submitting = false,
    onSubmit,
}: SynastryIntakeCardProps) {
    const t = useTranslations("Synastry")
    const tc = useTranslations("Character")
    const [name, setName] = useState(initialName?.trim() ?? "")
    const [day, setDay] = useState("")
    const [month, setMonth] = useState("")
    const [year, setYear] = useState("")
    const [hour, setHour] = useState("")
    const [minute, setMinute] = useState("")
    const [country, setCountry] = useState("")
    const [stateProv, setStateProv] = useState("")

    const isValid = useMemo(() => {
        const d = parseInt(day, 10)
        const m = parseInt(month, 10)
        const y = parseInt(year, 10)
        return (
            name.trim().length > 0 &&
            !Number.isNaN(d) &&
            d > 0 &&
            d <= 31 &&
            !Number.isNaN(m) &&
            m > 0 &&
            m <= 12 &&
            !Number.isNaN(y) &&
            y >= 1900
        )
    }, [name, day, month, year])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!isValid || submitting) return

        const h = parseInt(hour, 10)
        const min = parseInt(minute, 10)
        const hasTime = !Number.isNaN(h) && !Number.isNaN(min)

        let lat: number | null = null
        let lng: number | null = null
        let timezone: number | null = null
        if (country) {
            const resolved = resolveLocationFromCountryState(
                country,
                stateProv || undefined,
            )
            if (resolved) {
                lat = resolved.latitude
                lng = resolved.longitude
                timezone = resolved.timezone
            }
        }

        onSubmit({
            name: name.trim() || null,
            day: parseInt(day, 10),
            month: parseInt(month, 10),
            year: parseInt(year, 10),
            hour: hasTime ? h : null,
            minute: hasTime ? min : null,
            country: country || null,
            state: stateProv || null,
            lat,
            lng,
            timezone,
        })
    }

    return (
        <form
            onSubmit={handleSubmit}
            className='w-full space-y-4 rounded-[28px] border border-pink-400/20 bg-white/[0.04] p-4 backdrop-blur-2xl ring-1 ring-pink-400/10 sm:p-6'
        >
            <div className='space-y-1'>
                <p className='flex items-center gap-2 text-sm font-semibold text-white'>
                    <Heart className='size-4 shrink-0 text-pink-300' />
                    {t("intakeTitle")}
                </p>
                <p className='text-xs text-white/60'>{t("intakeDescription")}</p>
            </div>

            <div className='space-y-2'>
                <Label htmlFor='synastry-name'>{tc("nameLabel")}</Label>
                <Input
                    id='synastry-name'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={tc("namePlaceholder")}
                    maxLength={80}
                    autoComplete='off'
                />
            </div>

            <div className='space-y-2'>
                <Label>{tc("birthDateLabel")}</Label>
                <div className='grid grid-cols-3 gap-3'>
                    <CustomDatePicker
                        value={day}
                        onChange={setDay}
                        min={1}
                        max={31}
                        placeholder='DD'
                        label={tc("dayLabel")}
                    />
                    <CustomDatePicker
                        value={month}
                        onChange={setMonth}
                        min={1}
                        max={12}
                        placeholder='MM'
                        label={tc("monthLabel")}
                    />
                    <CustomDatePicker
                        value={year}
                        onChange={setYear}
                        min={1900}
                        max={new Date().getFullYear()}
                        placeholder='YYYY'
                        label={tc("yearLabel")}
                    />
                </div>
            </div>

            <div className='space-y-2'>
                <Label>{tc("birthTimeLabel")}</Label>
                <div className='grid grid-cols-2 gap-3'>
                    <CustomTimePicker
                        value={hour}
                        onChange={setHour}
                        min={0}
                        max={23}
                        placeholder='HH'
                        label={tc("hourLabel")}
                    />
                    <CustomTimePicker
                        value={minute}
                        onChange={setMinute}
                        min={0}
                        max={59}
                        placeholder='MM'
                        label={tc("minuteLabel")}
                    />
                </div>
                <p className='text-[11px] text-white/50'>
                    {tc("birthTimeHint")}
                </p>
            </div>

            <div className='space-y-2'>
                <Label>{tc("birthLocationLabel")}</Label>
                <LocationSelector
                    selectedCountry={country}
                    selectedState={stateProv}
                    onCountryChange={setCountry}
                    onStateChange={setStateProv}
                />
            </div>

            <Button
                type='submit'
                disabled={!isValid || submitting}
                className='w-full'
            >
                {submitting ? (
                    <span className='inline-flex items-center gap-2'>
                        <Loader2 className='size-4 animate-spin' />
                        {t("analyzing")}
                    </span>
                ) : (
                    t("analyze")
                )}
            </Button>
        </form>
    )
}
