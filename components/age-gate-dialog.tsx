"use client"

import { useEffect, useMemo, useState } from "react"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import { Clock3, MoonStar, ShieldAlert, Stars } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
    AgeGateBirthData,
    AgeGateState,
} from "@/lib/age-gate-storage"
import type { NoticeTranslations } from "@/lib/notice-translations"

type AgeGateDialogProps = {
    open: boolean
    blockedState: AgeGateState | null
    initialBirth?: AgeGateBirthData | null
    translations: NoticeTranslations["ageGate"]
    onSubmit: (birth: AgeGateBirthData) => void
}

type DraftState = {
    day: string
    month: string
    year: string
    hour: string
    minute: string
}

function formatBirthDate(birth: AgeGateBirthData | null) {
    if (!birth) return null
    return `${birth.year}-${String(birth.month).padStart(2, "0")}-${String(
        birth.day,
    ).padStart(2, "0")} ${String(birth.hour).padStart(2, "0")}:${String(
        birth.minute,
    ).padStart(2, "0")}`
}

function buildInitialDraft(initialBirth?: AgeGateBirthData | null): DraftState {
    return {
        day: initialBirth?.day ? String(initialBirth.day) : "",
        month: initialBirth?.month ? String(initialBirth.month) : "",
        year: initialBirth?.year ? String(initialBirth.year) : "",
        hour:
            initialBirth && Number.isFinite(initialBirth.hour)
                ? String(initialBirth.hour)
                : "0",
        minute:
            initialBirth && Number.isFinite(initialBirth.minute)
                ? String(initialBirth.minute)
                : "0",
    }
}

export function AgeGateDialog({
    open,
    blockedState,
    initialBirth = null,
    translations,
    onSubmit,
}: AgeGateDialogProps) {
    const [draft, setDraft] = useState<DraftState>(() =>
        buildInitialDraft(initialBirth),
    )
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    useEffect(() => {
        if (!open) return
        setDraft(buildInitialDraft(initialBirth))
        setAttemptedSubmit(false)
    }, [open, initialBirth])

    const parsed = useMemo(() => {
        const day = Number.parseInt(draft.day, 10)
        const month = Number.parseInt(draft.month, 10)
        const year = Number.parseInt(draft.year, 10)
        const hour = Number.parseInt(draft.hour || "0", 10)
        const minute = Number.parseInt(draft.minute || "0", 10)

        const hasDate =
            Number.isFinite(day) &&
            Number.isFinite(month) &&
            Number.isFinite(year) &&
            year >= 1900 &&
            year <= new Date().getFullYear()
        const hasTime =
            Number.isFinite(hour) &&
            Number.isFinite(minute) &&
            hour >= 0 &&
            hour <= 23 &&
            minute >= 0 &&
            minute <= 59

        if (!hasDate || !hasTime) {
            return { valid: false as const, birth: null }
        }

        const testDate = new Date(year, month - 1, day)
        const isRealDate =
            testDate.getFullYear() === year &&
            testDate.getMonth() === month - 1 &&
            testDate.getDate() === day

        if (!isRealDate) {
            return { valid: false as const, birth: null }
        }

        return {
            valid: true as const,
            birth: {
                year,
                month,
                day,
                hour,
                minute,
            } satisfies AgeGateBirthData,
        }
    }, [draft])

    if (blockedState?.category === "blocked") {
        return (
            <AlertDialog open>
                <AlertDialogContent className='border-[rgba(200,180,140,0.22)] bg-[#13121f] text-[rgba(245,239,227,0.95)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)]'>
                    <div className='pointer-events-none absolute inset-0 opacity-30'>
                        <div className='cosmic-stars-layer-3' />
                    </div>
                    <div className='pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full bg-gradient-to-br from-yellow-300/20 via-yellow-500/10 to-transparent blur-3xl' />
                    <div className='pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-tl from-red-400/20 via-red-600/10 to-transparent blur-3xl' />

                    <AlertDialogHeader className='relative z-10 text-left'>
                        <div className='mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(200,180,140,0.24)] bg-[rgba(200,180,140,0.08)] text-[rgba(200,180,140,0.88)]'>
                            <ShieldAlert className='h-5 w-5' />
                        </div>
                        <AlertDialogTitle className='font-serif text-2xl text-[rgba(245,239,227,0.96)]'>
                            {translations.blockedTitle}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='space-y-3 text-left text-[rgba(232,224,208,0.72)]'>
                            <p>{translations.blockedBody}</p>
                            <p>
                                <a
                                    href='mailto:admin@askingfate.com'
                                    className='underline decoration-dotted underline-offset-4 text-[rgba(200,180,140,0.9)]'
                                >
                                    {translations.blockedSupportLabel}
                                </a>
                            </p>
                            {blockedState?.birth ? (
                                <p className='text-[rgba(232,224,208,0.52)]'>
                                    {translations.blockedBirthLabel}:{" "}
                                    {formatBirthDate(blockedState.birth)}
                                </p>
                            ) : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className='border-[rgba(200,180,140,0.22)] bg-[#13121f] text-[rgba(245,239,227,0.95)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.85)] sm:max-w-[680px]'>
                <div className='pointer-events-none absolute inset-0 opacity-30'>
                    <div className='cosmic-stars-layer-3' />
                </div>
                <div className='pointer-events-none absolute -top-20 -left-16 h-40 w-40 rounded-full bg-gradient-to-br from-yellow-300/20 via-yellow-500/10 to-transparent blur-3xl' />
                <div className='pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-gradient-to-tl from-indigo-400/18 via-purple-500/10 to-transparent blur-3xl' />

                <AlertDialogHeader className='relative z-10 text-left'>
                    <div className='mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(200,180,140,0.24)] bg-[rgba(200,180,140,0.08)] text-[rgba(200,180,140,0.88)]'>
                        <Stars className='h-5 w-5' />
                    </div>
                    <AlertDialogTitle className='font-serif text-2xl text-[rgba(245,239,227,0.96)]'>
                        {translations.gateTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription className='space-y-2 text-left text-[rgba(232,224,208,0.72)]'>
                        <p>{translations.gateIntro}</p>
                        <p>{translations.gateTimeNote}</p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className='relative z-10 space-y-5'>
                    <div className='grid grid-cols-3 gap-3'>
                        <CustomDatePicker
                            value={draft.day}
                            onChange={(value) =>
                                setDraft((current) => ({ ...current, day: value }))
                            }
                            min={1}
                            max={31}
                            placeholder='DD'
                            label={translations.dayLabel}
                        />
                        <CustomDatePicker
                            value={draft.month}
                            onChange={(value) =>
                                setDraft((current) => ({
                                    ...current,
                                    month: value,
                                }))
                            }
                            min={1}
                            max={12}
                            placeholder='MM'
                            label={translations.monthLabel}
                        />
                        <CustomDatePicker
                            value={draft.year}
                            onChange={(value) =>
                                setDraft((current) => ({
                                    ...current,
                                    year: value,
                                }))
                            }
                            min={1900}
                            max={new Date().getFullYear()}
                            placeholder='YYYY'
                            label={translations.yearLabel}
                        />
                    </div>

                    <div className='rounded-2xl border border-[rgba(200,180,140,0.12)] bg-[rgba(255,255,255,0.02)] p-4'>
                        <div className='mb-3 flex items-center gap-2 text-[rgba(200,180,140,0.82)]'>
                            <Clock3 className='h-4 w-4' />
                            <span className='text-xs uppercase tracking-[0.24em]'>
                                {translations.optionalTimeLabel}
                            </span>
                        </div>
                        <div className='grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
                            <CustomTimePicker
                                value={draft.hour}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        hour: value,
                                    }))
                                }
                                min={0}
                                max={23}
                                placeholder='00'
                                label={translations.hourLabel}
                            />
                            <div className='hidden text-center text-2xl text-[rgba(232,224,208,0.6)] sm:block'>
                                :
                            </div>
                            <CustomTimePicker
                                value={draft.minute}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        minute: value,
                                    }))
                                }
                                min={0}
                                max={59}
                                placeholder='00'
                                label={translations.minuteLabel}
                            />
                        </div>
                        <div className='mt-3 flex items-center gap-2 text-[11px] text-[rgba(232,224,208,0.52)]'>
                            <MoonStar className='h-4 w-4' />
                            <span>{translations.optionalTimeHint}</span>
                        </div>
                    </div>

                    <div className='rounded-2xl border border-[rgba(200,180,140,0.12)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-6 text-[rgba(232,224,208,0.68)]'>
                        {translations.statusSummary}
                    </div>

                    {attemptedSubmit && !parsed.valid ? (
                        <div className='rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200'>
                            {translations.invalidDateMessage}
                        </div>
                    ) : null}
                </div>

                <AlertDialogFooter className='relative z-10'>
                    <Button
                        type='button'
                        onClick={() => {
                            setAttemptedSubmit(true)
                            if (!parsed.valid) return
                            onSubmit(parsed.birth)
                        }}
                        className={cn(
                            "w-full border border-[rgba(200,180,140,0.38)] bg-[rgba(200,180,140,0.12)] text-[rgba(245,239,227,0.96)] hover:bg-[rgba(200,180,140,0.18)] sm:w-auto",
                        )}
                    >
                        {translations.continueButton}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
