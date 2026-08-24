"use client"

import { useState } from "react"
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
 * itself stays open, so anyone who would rather type "12/5/2542" can.
 */

const EARLIEST_BIRTH_YEAR = 1930
/** Opened on a year people are actually born in, not on this month. */
const DEFAULT_VIEW_YEAR = 1995

const popoverSurface =
    "w-auto border-white/10 bg-[#13121f]/95 p-0 text-white backdrop-blur-xl"

export function BirthDatePickerButton({
    label,
    onPick,
}: {
    label: string
    onPick: (date: { year: number; month: number; day: number }) => void
}) {
    const [open, setOpen] = useState(false)
    const today = new Date()

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={cn(followUpChipClass, "gap-1.5")}>
                <CalendarDays className='size-3.5 shrink-0' aria-hidden />
                {label}
            </PopoverTrigger>
            <PopoverContent side='top' align='start' className={popoverSurface}>
                <Calendar
                    mode='single'
                    captionLayout='dropdown'
                    startMonth={new Date(EARLIEST_BIRTH_YEAR, 0)}
                    endMonth={today}
                    defaultMonth={new Date(DEFAULT_VIEW_YEAR, 0)}
                    disabled={(date) => date > today}
                    onSelect={(date) => {
                        if (!date) return
                        setOpen(false)
                        onPick({
                            year: date.getFullYear(),
                            month: date.getMonth() + 1,
                            day: date.getDate(),
                        })
                    }}
                    className='bg-transparent'
                />
            </PopoverContent>
        </Popover>
    )
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)

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

    const column = "max-h-44 w-16 overflow-y-auto rounded-lg bg-white/[0.03] p-1"
    const cell = (selected: boolean) =>
        cn(
            "w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors",
            selected
                ? "bg-[#6C5CE7] text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white",
        )

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className={cn(followUpChipClass, "gap-1.5")}>
                <Clock className='size-3.5 shrink-0' aria-hidden />
                {label}
            </PopoverTrigger>
            <PopoverContent
                side='top'
                align='start'
                className={cn(popoverSurface, "p-3")}
            >
                <div className='flex gap-3'>
                    <div>
                        <p className='mb-1 text-[10px] uppercase tracking-[0.18em] text-white/45'>
                            {hourLabel}
                        </p>
                        <div className={column}>
                            {HOURS.map((value) => (
                                <button
                                    key={value}
                                    type='button'
                                    onClick={() => setHour(value)}
                                    className={cell(value === hour)}
                                >
                                    {String(value).padStart(2, "0")}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className='mb-1 text-[10px] uppercase tracking-[0.18em] text-white/45'>
                            {minuteLabel}
                        </p>
                        <div className={column}>
                            {MINUTES.map((value) => (
                                <button
                                    key={value}
                                    type='button'
                                    onClick={() => setMinute(value)}
                                    className={cell(value === minute)}
                                >
                                    {String(value).padStart(2, "0")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button
                    type='button'
                    onClick={() => {
                        setOpen(false)
                        onPick({ hour, minute })
                    }}
                    className='mt-3 w-full rounded-lg bg-[#6C5CE7] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90'
                >
                    {confirmLabel}
                </button>
            </PopoverContent>
        </Popover>
    )
}
