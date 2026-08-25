"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { CalendarDays, Clock } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
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
 * They are buttons in the strip directly above the composer — the composer
 * itself stays open, so anyone who would rather type "12/5/2542" can. The
 * time picker runs to the minute: an ascendant moves a degree every four
 * minutes, so "about seven" is not good enough.
 */

const EARLIEST_BIRTH_YEAR = 1930
/** Opened on a year people are actually born in, not on this month. */
const DEFAULT_VIEW_YEAR = 1995
const PANEL_BG = "#13121f"

const panelClass =
    "w-auto border-white/10 bg-[#13121f]/95 p-0 text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl"

const confirmButtonClass =
    "w-full rounded-xl bg-[#6C5CE7] px-3 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"

function PanelFooter({ children }: { children: React.ReactNode }) {
    return (
        <div className='border-t border-white/10 p-3'>{children}</div>
    )
}

export function BirthDatePickerButton({
    label,
    confirmLabel,
    onPick,
}: {
    label: string
    confirmLabel: string
    onPick: (date: { year: number; month: number; day: number }) => void
}) {
    const locale = useLocale()
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<Date | undefined>()
    const today = new Date()

    const readout = draft
        ? new Intl.DateTimeFormat(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
          }).format(draft)
        : null

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                setOpen(next)
                if (!next) setDraft(undefined)
            }}
        >
            <PopoverTrigger className={cn(followUpChipClass, "gap-1.5")}>
                <CalendarDays className='size-3.5 shrink-0' aria-hidden />
                {label}
            </PopoverTrigger>
            <PopoverContent side='top' align='start' className={panelClass}>
                <Calendar
                    mode='single'
                    selected={draft}
                    onSelect={setDraft}
                    captionLayout='dropdown'
                    startMonth={new Date(EARLIEST_BIRTH_YEAR, 0)}
                    endMonth={today}
                    defaultMonth={draft ?? new Date(DEFAULT_VIEW_YEAR, 0)}
                    disabled={(date) => date > today}
                    className='bg-transparent p-3 [--cell-size:2.15rem]'
                    // Thai reads years in the Buddhist era, so the dropdowns
                    // must agree with the readout below and with the bubble
                    // she echoes back — all three go through Intl.
                    formatters={{
                        formatMonthDropdown: (date) =>
                            new Intl.DateTimeFormat(locale, {
                                month: "short",
                            }).format(date),
                        formatYearDropdown: (date) =>
                            new Intl.DateTimeFormat(locale, {
                                year: "numeric",
                            }).format(date),
                        formatWeekdayName: (date) =>
                            new Intl.DateTimeFormat(locale, {
                                weekday: "narrow",
                            }).format(date),
                        formatCaption: (date) =>
                            new Intl.DateTimeFormat(locale, {
                                month: "long",
                                year: "numeric",
                            }).format(date),
                    }}
                    classNames={{
                        month_caption:
                            "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
                        dropdown_root:
                            "relative rounded-lg border border-white/10 bg-white/[0.04] px-1 shadow-none",
                        caption_label:
                            "flex h-8 select-none items-center gap-1 rounded-md pl-2 pr-1 text-sm font-medium text-white [&>svg]:size-3.5 [&>svg]:text-white/50",
                        button_previous:
                            "size-(--cell-size) rounded-lg p-0 text-white/70 hover:bg-white/10 hover:text-white aria-disabled:opacity-40",
                        button_next:
                            "size-(--cell-size) rounded-lg p-0 text-white/70 hover:bg-white/10 hover:text-white aria-disabled:opacity-40",
                        weekday:
                            "flex-1 select-none text-[0.7rem] font-normal uppercase tracking-[0.12em] text-white/35",
                        today: "rounded-lg ring-1 ring-inset ring-white/20 data-[selected=true]:ring-0",
                        outside: "text-white/20",
                        disabled: "text-white/15 opacity-100",
                    }}
                    components={{
                        DayButton: ({ className, day, modifiers, ...props }) => (
                            <button
                                {...props}
                                data-day={day.date.toLocaleDateString()}
                                className={cn(
                                    "flex aspect-square w-full items-center justify-center rounded-lg text-sm tabular-nums text-white/80 transition-colors",
                                    "hover:bg-white/10 hover:text-white",
                                    modifiers.selected &&
                                        "bg-[#6C5CE7] font-semibold text-white hover:bg-[#6C5CE7]",
                                    modifiers.disabled &&
                                        "text-white/15 hover:bg-transparent",
                                    className,
                                )}
                            />
                        ),
                    }}
                />
                <PanelFooter>
                    <p className='mb-2 text-center text-[13px] text-white/70'>
                        {readout ?? "—"}
                    </p>
                    <button
                        type='button'
                        disabled={!draft}
                        onClick={() => {
                            if (!draft) return
                            setOpen(false)
                            onPick({
                                year: draft.getFullYear(),
                                month: draft.getMonth() + 1,
                                day: draft.getDate(),
                            })
                            setDraft(undefined)
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

const ITEM_HEIGHT = 36
const VISIBLE_ITEMS = 5
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute)

/**
 * One scroll wheel. The value follows whatever settles in the centre band,
 * and tapping a number scrolls it there.
 */
function Wheel({
    label,
    values,
    value,
    onChange,
}: {
    label: string
    values: number[]
    value: number
    onChange: (value: number) => void
}) {
    const scrollerRef = useRef<HTMLDivElement>(null)
    const settleRef = useRef<number | undefined>(undefined)

    const scrollToIndex = useCallback(
        (index: number, smooth: boolean) => {
            const el = scrollerRef.current
            if (!el) return
            el.scrollTo({
                top: index * ITEM_HEIGHT,
                behavior: smooth ? "smooth" : "auto",
            })
        },
        [],
    )

    // Follow the value when it changes from outside (opening, typing, reset).
    useEffect(() => {
        const el = scrollerRef.current
        if (!el) return
        const index = values.indexOf(value)
        if (index < 0) return
        if (Math.abs(el.scrollTop - index * ITEM_HEIGHT) > 2) {
            scrollToIndex(index, false)
        }
    }, [scrollToIndex, value, values])

    const handleScroll = () => {
        const el = scrollerRef.current
        if (!el) return
        window.clearTimeout(settleRef.current)
        settleRef.current = window.setTimeout(() => {
            const index = Math.round(el.scrollTop / ITEM_HEIGHT)
            const next = values[Math.min(values.length - 1, Math.max(0, index))]
            if (next !== undefined && next !== value) onChange(next)
        }, 80)
    }

    useEffect(() => () => window.clearTimeout(settleRef.current), [])

    return (
        <div className='flex flex-col items-center gap-1.5'>
            <p className='text-[10px] uppercase tracking-[0.18em] text-white/40'>
                {label}
            </p>
            <div
                className='relative w-[68px]'
                style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
            >
                <div
                    ref={scrollerRef}
                    onScroll={handleScroll}
                    className='scrollbar-hide h-full snap-y snap-mandatory overflow-y-auto overscroll-contain'
                >
                    <div style={{ height: ITEM_HEIGHT * 2 }} />
                    {values.map((option) => (
                        <button
                            key={option}
                            type='button'
                            style={{ height: ITEM_HEIGHT }}
                            onClick={() =>
                                scrollToIndex(values.indexOf(option), true)
                            }
                            className={cn(
                                "flex w-full snap-center items-center justify-center text-[17px] tabular-nums transition-colors",
                                option === value
                                    ? "font-semibold text-white"
                                    : "text-white/35",
                            )}
                        >
                            {String(option).padStart(2, "0")}
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
            <PopoverContent side='top' align='start' className={panelClass}>
                <p className='pt-4 text-center font-playfair text-3xl tabular-nums tracking-wide text-white'>
                    {String(hour).padStart(2, "0")}
                    <span className='mx-0.5 text-white/40'>:</span>
                    {String(minute).padStart(2, "0")}
                </p>
                <div className='flex items-start justify-center gap-4 px-4 pb-3 pt-2'>
                    <Wheel
                        label={hourLabel}
                        values={HOURS}
                        value={hour}
                        onChange={setHour}
                    />
                    <Wheel
                        label={minuteLabel}
                        values={MINUTES}
                        value={minute}
                        onChange={setMinute}
                    />
                </div>
                {/* Round minutes are one tap; the wheel still holds all 60. */}
                <div className='flex justify-center gap-1.5 px-4 pb-3'>
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
