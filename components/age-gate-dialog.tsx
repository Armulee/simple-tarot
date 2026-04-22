"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CustomDatePicker } from "@/components/ui/custom-date-picker"
import { CustomTimePicker } from "@/components/ui/custom-time-picker"
import {
    CelestialIcon,
    CornerAccents,
    StarsDialog,
} from "@/components/star-consent"
import { Clock3, MoonStar, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgeGateBirthData, AgeGateState } from "@/lib/age-gate-storage"

type AgeGateDialogProps = {
    open: boolean
    blockedState: AgeGateState | null
    initialBirth?: AgeGateBirthData | null
    onOpenChange?: (open: boolean) => void
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
    onOpenChange,
    onSubmit,
}: AgeGateDialogProps) {
    const t = useTranslations("StarConsent.ageGate")
    const [draft, setDraft] = useState<DraftState>(() =>
        buildInitialDraft(initialBirth),
    )
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    useEffect(() => {
        setDraft(buildInitialDraft(initialBirth))
    }, [initialBirth])

    useEffect(() => {
        if (open) return
        setAttemptedSubmit(false)
    }, [open])

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
            <Dialog open>
                <StarsDialog
                    hideCloseButton
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onPointerDownOutside={(event) => event.preventDefault()}
                    onInteractOutside={(event) => event.preventDefault()}
                    className='relative flex max-w-[480px] flex-col !overflow-hidden !rounded-[3px] !border-[0.5px] !border-[rgba(200,180,140,0.3)] !bg-[#13121f] !p-0 !shadow-none'
                >
                    <div className='relative z-10 flex w-full flex-col'>
                        <CornerAccents />

                        <div className='relative shrink-0 border-b border-[rgba(200,180,140,0.1)] px-6 pb-5 pt-6'>
                            <div className='mb-2 flex justify-center'>
                                <div className='relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(200,180,140,0.28)] bg-[rgba(200,180,140,0.06)] text-[rgba(200,180,140,0.88)] shadow-[0_0_24px_-6px_rgba(200,180,140,0.35)]'>
                                    <ShieldAlert className='h-5 w-5' />
                                </div>
                            </div>
                            <p className='text-center font-serif text-[10px] font-normal uppercase tracking-[0.28em] text-[rgba(200,180,140,0.6)]'>
                                {t("blockedTitle")}
                            </p>
                            <DialogHeader className='mt-1 text-center'>
                                <DialogTitle className='font-serif text-[22px] font-medium leading-tight text-[#e8e0d0]'>
                                    {t("blockedTitle")}
                                </DialogTitle>
                            </DialogHeader>
                        </div>

                        <div className='px-6 py-6'>
                            <DialogDescription asChild>
                                <div className='space-y-3 text-left text-[13px] leading-[1.8] font-light text-[rgba(232,224,208,0.7)]'>
                                    <p>{t("blockedBody")}</p>
                                    <p>
                                        <a
                                            href='mailto:admin@askingfate.com'
                                            className='underline decoration-dotted underline-offset-4 text-[rgba(200,180,140,0.9)] hover:text-[rgba(245,239,227,0.95)]'
                                        >
                                            {t("blockedSupportLabel")}
                                        </a>
                                    </p>
                                    {blockedState?.birth ? (
                                        <p className='border-t border-[rgba(200,180,140,0.1)] pt-3 text-[11.5px] text-[rgba(232,224,208,0.5)]'>
                                            {t("blockedBirthLabel")}:{" "}
                                            <span className='font-serif tracking-wider text-[rgba(232,224,208,0.72)]'>
                                                {formatBirthDate(
                                                    blockedState.birth,
                                                )}
                                            </span>
                                        </p>
                                    ) : null}
                                </div>
                            </DialogDescription>
                        </div>
                    </div>
                </StarsDialog>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <StarsDialog
                hideCloseButton
                className='relative flex max-h-[92dvh] max-w-[560px] flex-col !overflow-hidden !rounded-[3px] !border-[0.5px] !border-[rgba(200,180,140,0.3)] !bg-[#13121f] !p-0 !shadow-none'
            >
                <div className='relative z-10 flex min-h-0 h-full w-full flex-1 flex-col'>
                    <CornerAccents />

                    <div className='relative shrink-0 border-b border-[rgba(200,180,140,0.1)] px-6 pb-5 pt-6'>
                        <div className='mb-2 flex justify-center'>
                            <CelestialIcon />
                        </div>
                        <p className='text-center font-serif text-[10px] font-normal uppercase tracking-[0.28em] text-[rgba(200,180,140,0.6)]'>
                            {t("gateTitle")}
                        </p>
                        <DialogHeader className='mt-1 text-center'>
                            <DialogTitle className='font-serif text-[22px] font-medium leading-tight text-[#e8e0d0]'>
                                {t("gateTitle")}
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    <div className='relative min-h-0 flex-1 overflow-y-auto consent-scrollbar px-6 py-5'>
                        <DialogDescription asChild>
                            <p className='mb-5 text-center text-[13px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                {t("gateIntro")}
                            </p>
                        </DialogDescription>

                        <div className='mb-2 flex items-center gap-2 text-[rgba(200,180,140,0.72)]'>
                            <span className='h-px flex-1 bg-[rgba(200,180,140,0.12)]' />
                            <span className='text-[10px] uppercase tracking-[0.28em]'>
                                {t("gateTitle")}
                            </span>
                            <span className='h-px flex-1 bg-[rgba(200,180,140,0.12)]' />
                        </div>

                        <div className='grid grid-cols-3 gap-2 sm:gap-3'>
                            <CustomDatePicker
                                value={draft.day}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        day: value,
                                    }))
                                }
                                min={1}
                                max={31}
                                placeholder='DD'
                                label={t("dayLabel")}
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
                                label={t("monthLabel")}
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
                                label={t("yearLabel")}
                            />
                        </div>

                        <div className='mt-6 rounded-[3px] border-[0.5px] border-[rgba(200,180,140,0.14)] bg-[rgba(255,255,255,0.015)] p-4'>
                            <div className='mb-3 flex items-center gap-2 text-[rgba(200,180,140,0.72)]'>
                                <span className='h-px flex-1 bg-[rgba(200,180,140,0.12)]' />
                                <Clock3 className='h-3.5 w-3.5' />
                                <span className='text-[10px] uppercase tracking-[0.28em]'>
                                    {t("optionalTimeLabel")}
                                </span>
                                <span className='h-px flex-1 bg-[rgba(200,180,140,0.12)]' />
                            </div>

                            <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3'>
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
                                    label={t("hourLabel")}
                                />
                                <div className='select-none text-center font-serif text-2xl text-[rgba(200,180,140,0.5)]'>
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
                                    label={t("minuteLabel")}
                                />
                            </div>
                            <div className='mt-3 flex items-start gap-2 text-[11px] leading-snug text-[rgba(232,224,208,0.48)]'>
                                <MoonStar className='mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgba(200,180,140,0.6)]' />
                                <span>{t("optionalTimeHint")}</span>
                            </div>
                        </div>

                        {attemptedSubmit && !parsed.valid ? (
                            <div className='mt-4 rounded-[3px] border-[0.5px] border-red-500/30 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-200/90'>
                                {t("invalidDateMessage")}
                            </div>
                        ) : null}
                    </div>

                    <footer className='relative shrink-0 border-t border-[rgba(200,180,140,0.1)] bg-[#13121f]/95 px-6 pb-5 pt-4 backdrop-blur-sm'>
                        <button
                            type='button'
                            onClick={() => {
                                setAttemptedSubmit(true)
                                if (!parsed.valid) return
                                onSubmit(parsed.birth)
                            }}
                            className={cn(
                                "w-full rounded-[2px] border-[0.5px] bg-transparent py-3.5 text-[11px] font-normal uppercase tracking-[0.18em] transition-all duration-300",
                                "border-[rgba(200,180,140,0.55)] text-[rgba(232,224,208,0.88)]",
                                "hover:border-[rgba(200,180,140,0.8)] hover:bg-[rgba(200,180,140,0.07)]",
                                "active:scale-[0.99]",
                                "cursor-pointer",
                            )}
                        >
                            {t("continueButton")}
                        </button>
                    </footer>
                </div>
            </StarsDialog>
        </Dialog>
    )
}
