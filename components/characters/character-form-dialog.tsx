"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Loader2, UserRound } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import { LocationSelector } from "@/components/ui/location-selector"
import { resolveLocationFromCountryState } from "@/lib/location"
import type { Character, CreateCharacterInput } from "@/types/character"

type CharacterFormDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Persists the character. Should throw on failure. */
    onCreate: (input: CreateCharacterInput) => Promise<Character>
}

/**
 * Add-character form, presented in a dialog. Mirrors the birth-chart intake
 * form (CustomDatePicker / CustomTimePicker / LocationSelector). Birth time and
 * location are optional; name + date are required. The caller owns the paywall
 * gate (this dialog is only opened for paid users), and `onCreate` performs the
 * actual persistence.
 */
export function CharacterFormDialog({
    open,
    onOpenChange,
    onCreate,
}: CharacterFormDialogProps) {
    const t = useTranslations("Character")

    const [name, setName] = useState("")
    const [day, setDay] = useState("")
    const [month, setMonth] = useState("")
    const [year, setYear] = useState("")
    const [hour, setHour] = useState("")
    const [minute, setMinute] = useState("")
    const [country, setCountry] = useState("")
    const [stateProv, setStateProv] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")

    // Reset the form whenever the dialog is (re)opened.
    useEffect(() => {
        if (open) {
            setName("")
            setDay("")
            setMonth("")
            setYear("")
            setHour("")
            setMinute("")
            setCountry("")
            setStateProv("")
            setError("")
            setSubmitting(false)
        }
    }, [open])

    const isValid = useMemo(() => {
        const d = parseInt(day, 10)
        const m = parseInt(month, 10)
        const y = parseInt(year, 10)
        const validDate =
            !Number.isNaN(d) &&
            !Number.isNaN(m) &&
            !Number.isNaN(y) &&
            d > 0 &&
            d <= 31 &&
            m > 0 &&
            m <= 12 &&
            y >= 1900
        return name.trim().length > 0 && validDate
    }, [name, day, month, year])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!isValid || submitting) return
        setSubmitting(true)
        setError("")

        const h = parseInt(hour, 10)
        const min = parseInt(minute, 10)
        const hasTime = !Number.isNaN(h) && !Number.isNaN(min)

        // Resolve coordinates + timezone from the selected country/state so the
        // saved character can be used for astrology calculations later.
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

        const input: CreateCharacterInput = {
            name: name.trim(),
            birthDay: parseInt(day, 10),
            birthMonth: parseInt(month, 10),
            birthYear: parseInt(year, 10),
            birthHour: hasTime ? h : null,
            birthMinute: hasTime ? min : null,
            birthCountry: country || null,
            birthState: stateProv || null,
            lat,
            lng,
            timezone,
        }

        try {
            const created = await onCreate(input)
            toast.success(t("created", { name: created.name }))
            onOpenChange(false)
        } catch {
            setError(t("errorGeneric"))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <UserRound className='size-5 text-pink-300' aria-hidden />
                        {t("addTitle")}
                    </DialogTitle>
                    <DialogDescription>{t("addDescription")}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className='space-y-5'>
                    <div className='space-y-2'>
                        <Label htmlFor='character-name'>{t("nameLabel")}</Label>
                        <Input
                            id='character-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("namePlaceholder")}
                            maxLength={80}
                            autoComplete='off'
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label>{t("birthDateLabel")}</Label>
                        <div className='grid grid-cols-3 gap-3'>
                            <CustomDatePicker
                                value={day}
                                onChange={setDay}
                                min={1}
                                max={31}
                                placeholder='DD'
                                label={t("dayLabel")}
                            />
                            <CustomDatePicker
                                value={month}
                                onChange={setMonth}
                                min={1}
                                max={12}
                                placeholder='MM'
                                label={t("monthLabel")}
                            />
                            <CustomDatePicker
                                value={year}
                                onChange={setYear}
                                min={1900}
                                max={new Date().getFullYear()}
                                placeholder='YYYY'
                                label={t("yearLabel")}
                            />
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <Label>{t("birthTimeLabel")}</Label>
                        <div className='grid grid-cols-2 gap-3'>
                            <CustomTimePicker
                                value={hour}
                                onChange={setHour}
                                min={0}
                                max={23}
                                placeholder='HH'
                                label={t("hourLabel")}
                            />
                            <CustomTimePicker
                                value={minute}
                                onChange={setMinute}
                                min={0}
                                max={59}
                                placeholder='MM'
                                label={t("minuteLabel")}
                            />
                        </div>
                        <p className='text-[11px] text-white/50'>
                            {t("birthTimeHint")}
                        </p>
                    </div>

                    <Separator className='bg-white/10' />

                    <div className='space-y-2'>
                        <Label>{t("birthLocationLabel")}</Label>
                        <LocationSelector
                            selectedCountry={country}
                            selectedState={stateProv}
                            onCountryChange={setCountry}
                            onStateChange={setStateProv}
                        />
                    </div>

                    {!!error && (
                        <p className='text-sm text-destructive'>{error}</p>
                    )}

                    <DialogFooter className='gap-2 sm:gap-0'>
                        <Button
                            type='button'
                            variant='ghost'
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type='submit' disabled={!isValid || submitting}>
                            {submitting ? (
                                <span className='inline-flex items-center gap-2'>
                                    <Loader2 className='size-4 animate-spin' />
                                    {t("saving")}
                                </span>
                            ) : (
                                t("save")
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default CharacterFormDialog
