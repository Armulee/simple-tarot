"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { CalendarDays, Clock } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { followUpChipClass } from "@/components/question-input"
import { cn } from "@/lib/utils"

/**
 * The two pickers she offers while collecting birth details.
 *
 * Both are wheels, because both answers are far from today: a calendar grid
 * makes you page through three hundred months to reach a birth year, and a
 * five-minute time step is useless for an ascendant that moves a degree every
 * four minutes. Day / month / year and hour / minute all spin the same way,
 * and the composer stays open for anyone who would rather type "12/5/2542".
 */

const EARLIEST_BIRTH_YEAR = 1930
/** Where the year wheel opens when nothing is chosen yet. */
const DEFAULT_YEAR = 1995

const PANEL_BG = "#13121f"
const ITEM_HEIGHT = 38
const VISIBLE_ITEMS = 5

const panelClass =
    "w-auto rounded-2xl border-white/10 bg-[#13121f]/95 p-0 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"

const confirmButtonClass =
    "w-full rounded-xl bg-[#6C5CE7] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"

type WheelOption = { value: number; label: string }

/**
 * One column. The value follows whatever settles in the centre band, and
 * tapping a row scrolls it there.
 */
function Wheel({
    label,
    options,
    value,
    onChange,
    width,
}: {
    label: string
    options: WheelOption[]
    value: number
    onChange: (value: number) => void
    width: string
}) {
    const scrollerRef = useRef<HTMLDivElement>(null)
    const settleRef = useRef<number | undefined>(undefined)

    const scrollToIndex = useCallback((index: number, smooth: boolean) => {
        scrollerRef.current?.scrollTo({
            top: index * ITEM_HEIGHT,
            behavior: smooth ? "smooth" : "auto",
        })
    }, [])

    // Follow the value when it changes from outside: opening, or a day being
    // clamped because the month it sat in is shorter.
    useEffect(() => {
        const el = scrollerRef.current
        if (!el) return
        const index = options.findIndex((option) => option.value === value)
        if (index < 0) return
        if (Math.abs(el.scrollTop - index * ITEM_HEIGHT) > 2) {
            scrollToIndex(index, false)
        }
    }, [options, scrollToIndex, value])

    useEffect(() => () => window.clearTimeout(settleRef.current), [])

    const handleScroll = () => {
        const el = scrollerRef.current
        if (!el) return
        window.clearTimeout(settleRef.current)
        settleRef.current = window.setTimeout(() => {
            const index = Math.round(el.scrollTop / ITEM_HEIGHT)
            const next = options[Math.min(options.length - 1, Math.max(0, index))]
            if (next && next.value !== value) onChange(next.value)
        }, 80)
    }

    return (
        <div className={cn("flex flex-col items-center gap-2", width)}>
            <p className='text-[10px] uppercase tracking-[0.18em] text-white/40'>
                {label}
            </p>
            <div
                className='relative w-full'
                style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
            >
                <div
                    ref={scrollerRef}
                    onScroll={handleScroll}
                    className='scrollbar-hide h-full snap-y snap-mandatory overflow-y-auto overscroll-contain'
                >
                <div style={{ height: ITEM_HEIGHT * 2 }} />
                {options.map((option) => (
                    <button
                        key={option.value}
                        type='button'
                        style={{ height: ITEM_HEIGHT }}
                        onClick={() =>
                            scrollToIndex(
                                options.findIndex(
                                    (item) => item.value === option.value,
                                ),
                                true,
                            )
                        }
                        className={cn(
                            "flex w-full snap-center items-center justify-center px-1 text-center text-[16px] tabular-nums transition-colors",
                            option.value === value
                                ? "font-semibold text-white"
                                : "text-white/35",
                        )}
                    >
                        {option.label}
                    </button>
                ))}
                <div style={{ height: ITEM_HEIGHT * 2 }} />
                </div>

                {/* Centre band and edge fades: the wheel's whole legibility. */}
                <div
                    aria-hidden
                    className='pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/10'
                    style={{ height: ITEM_HEIGHT }}
                />
                <div
                    aria-hidden
                    className='pointer-events-none absolute inset-x-0 top-0'
                    style={{
                        height: ITEM_HEIGHT * 1.6,
                        background: `linear-gradient(to bottom, ${PANEL_BG}, transparent)`,
                    }}
                />
                <div
                    aria-hidden
                    className='pointer-events-none absolute inset-x-0 bottom-0'
                    style={{
                        height: ITEM_HEIGHT * 1.6,
                        background: `linear-gradient(to top, ${PANEL_BG}, transparent)`,
                    }}
                />
            </div>
        </div>
    )
}

/** The row the wheels sit in. */
function WheelRow({ children }: { children: React.ReactNode }) {
    return (
        <div className='flex justify-center gap-2 px-4 pb-1 pt-3'>
            {children}
        </div>
    )
}

function PanelReadout({ children }: { children: React.ReactNode }) {
    return (
        <p className='px-4 pt-4 text-center font-playfair text-[22px] leading-tight tracking-wide text-white'>
            {children}
        </p>
    )
}

function PanelFooter({ children }: { children: React.ReactNode }) {
    return <div className='border-t border-white/10 p-3'>{children}</div>
}

function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function BirthDatePickerButton({
    label,
    confirmLabel,
    dayLabel,
    monthLabel,
    yearLabel,
    onPick,
}: {
    label: string
    confirmLabel: string
    dayLabel: string
    monthLabel: string
    yearLabel: string
    onPick: (date: { year: number; month: number; day: number }) => void
}) {
    const locale = useLocale()
    const [open, setOpen] = useState(false)
    const [year, setYear] = useState(DEFAULT_YEAR)
    const [month, setMonth] = useState(1)
    const [day, setDay] = useState(1)

    const thisYear = new Date().getFullYear()

    const yearOptions = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { year: "numeric" })
        const years: WheelOption[] = []
        for (let value = thisYear; value >= EARLIEST_BIRTH_YEAR; value -= 1) {
            years.push({
                value,
                label: format.format(new Date(value, 0, 1)),
            })
        }
        return years
    }, [locale, thisYear])

    const monthOptions = useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { month: "short" })
        return Array.from({ length: 12 }, (_, index) => ({
            value: index + 1,
            label: format.format(new Date(2024, index, 1)),
        }))
    }, [locale])

    const dayOptions = useMemo(
        () =>
            Array.from({ length: daysInMonth(year, month) }, (_, index) => ({
                value: index + 1,
                label: String(index + 1),
            })),
        [month, year],
    )

    // February loses days when the year or month moves under a late day.
    useEffect(() => {
        const max = daysInMonth(year, month)
        if (day > max) setDay(max)
    }, [day, month, year])

    const readout = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(year, month - 1, day))

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={cn(followUpChipClass, "gap-1.5")}>
                <CalendarDays className='size-3.5 shrink-0' aria-hidden />
                {label}
            </PopoverTrigger>
            <PopoverContent
                side='top'
                align='start'
                collisionPadding={12}
                className={panelClass}
            >
                <PanelReadout>{readout}</PanelReadout>
                <WheelRow>
                    <Wheel
                        label={dayLabel}
                        options={dayOptions}
                        value={day}
                        onChange={setDay}
                        width='w-14'
                    />
                    <Wheel
                        label={monthLabel}
                        options={monthOptions}
                        value={month}
                        onChange={setMonth}
                        width='w-20'
                    />
                    <Wheel
                        label={yearLabel}
                        options={yearOptions}
                        value={year}
                        onChange={setYear}
                        width='w-20'
                    />
                </WheelRow>
                <PanelFooter>
                    <button
                        type='button'
                        onClick={() => {
                            setOpen(false)
                            onPick({ year, month, day })
                        }}
                        className={confirmButtonClass}
                    >
                        {confirmLabel}
                    </button>
                </PanelFooter>
            </PopoverContent>
        </Popover>
    )
}

const HOUR_OPTIONS: WheelOption[] = Array.from({ length: 24 }, (_, hour) => ({
    value: hour,
    label: String(hour).padStart(2, "0"),
}))
const MINUTE_OPTIONS: WheelOption[] = Array.from(
    { length: 60 },
    (_, minute) => ({
        value: minute,
        label: String(minute).padStart(2, "0"),
    }),
)

export function BirthTimePickerButton({
    label,
    hourLabel,
    minuteLabel,
    confirmLabel,
    onPick,
}: {
    label: string
    hourLabel: string
    minuteLabel: string
    confirmLabel: string
    onPick: (time: { hour: number; minute: number }) => void
}) {
    const [open, setOpen] = useState(false)
    const [hour, setHour] = useState(7)
    const [minute, setMinute] = useState(0)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={cn(followUpChipClass, "gap-1.5")}>
                <Clock className='size-3.5 shrink-0' aria-hidden />
                {label}
            </PopoverTrigger>
            <PopoverContent
                side='top'
                align='start'
                collisionPadding={12}
                className={panelClass}
            >
                <PanelReadout>
                    {String(hour).padStart(2, "0")}
                    <span className='mx-0.5 text-white/40'>:</span>
                    {String(minute).padStart(2, "0")}
                </PanelReadout>
                <WheelRow>
                    <Wheel
                        label={hourLabel}
                        options={HOUR_OPTIONS}
                        value={hour}
                        onChange={setHour}
                        width='w-16'
                    />
                    <Wheel
                        label={minuteLabel}
                        options={MINUTE_OPTIONS}
                        value={minute}
                        onChange={setMinute}
                        width='w-16'
                    />
                </WheelRow>
                {/* Round minutes are one tap; the wheel still holds all sixty. */}
                <div className='flex justify-center gap-1.5 px-4 pb-3 pt-1'>
                    {[0, 15, 30, 45].map((option) => (
                        <button
                            key={option}
                            type='button'
                            onClick={() => setMinute(option)}
                            className={cn(
                                "rounded-lg px-2.5 py-1 text-xs tabular-nums transition-colors",
                                option === minute
                                    ? "bg-white/15 text-white"
                                    : "text-white/45 hover:bg-white/10 hover:text-white",
                            )}
                        >
                            :{String(option).padStart(2, "0")}
                        </button>
                    ))}
                </div>
                <PanelFooter>
                    <button
                        type='button'
                        onClick={() => {
                            setOpen(false)
                            onPick({ hour, minute })
                        }}
                        className={confirmButtonClass}
                    >
                        {confirmLabel}
                    </button>
                </PanelFooter>
            </PopoverContent>
        </Popover>
    )
}
