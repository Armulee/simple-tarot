"use client"

import { Lock, Star } from "lucide-react"
import { useLocale } from "next-intl"
import { cn } from "@/lib/utils"
import type { DayData } from "@/lib/calendar-helper"
import { qualityBg, qualityDot, qualityNumber } from "@/lib/calendar-styles"
import { isDateWithinWindow } from "@/lib/calendar/access-window"
import { formatDayAriaLabel, sameYMD } from "./utils"

export function CalendarCell({
    cell,
    today,
    selectedDate,
    onSelect,
    data,
    windowDays,
    loading,
}: {
    cell: Date | null
    today: Date | null
    selectedDate: Date | null
    onSelect: (d: Date) => void
    data: DayData | null
    windowDays: number
    loading: boolean
}) {
    const locale = useLocale()

    if (!cell) {
        return <div className='aspect-square' />
    }

    const isToday = today != null && sameYMD(cell, today)
    const isSelected = selectedDate != null && sameYMD(cell, selectedDate)
    const isPlanLocked =
        today != null && !isDateWithinWindow(cell, today, windowDays)
    const isLocked = isPlanLocked
    const isMissingData = !loading && !data && !isPlanLocked

    const peakSignal = data
        ? Math.max(
              data.eventSignals.job_change,
              data.eventSignals.resignation,
              data.eventSignals.marriage,
              data.eventSignals.contract_sign,
              data.eventSignals.travel_long,
              data.eventSignals.major_purchase,
          )
        : 0
    const hasPeak = !isPlanLocked && peakSignal > 8
    const hasWarning = !isPlanLocked && (data?.warnings.length ?? 0) > 0

    /** Plan-locked days stay tappable so the side panel can show upgrade / Stripe CTA. */
    const disabled = isMissingData
    const bgClass = isPlanLocked
        ? "bg-white/[0.03] ring-1 ring-white/10"
        : data
        ? qualityBg[data.quality]
        : "bg-white/[0.03] ring-1 ring-white/10"

    return (
        <button
            type='button'
            disabled={disabled}
            onClick={() => {
                if (!disabled) onSelect(cell)
            }}
            className={cn(
                "group/cell relative aspect-square rounded-2xl p-2 flex flex-col items-start justify-between text-left transition-all duration-200 ease-out",
                bgClass,
                loading && "animate-pulse",
                isSelected
                    ? "ring-2 ring-white shadow-[0_0_0_4px_rgba(255,255,255,0.08),0_12px_28px_-12px_rgba(255,255,255,0.35)]"
                    : "hover:ring-1 hover:ring-white/40 hover:shadow-[0_8px_20px_-12px_rgba(0,0,0,0.6)]",
                disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:-translate-y-0.5",
                isPlanLocked && !disabled
                    ? "opacity-90 hover:opacity-100"
                    : null,
            )}
            aria-label={formatDayAriaLabel(locale, cell)}
        >
            <div className='absolute top-1 right-1 flex items-center gap-1'>
                {hasPeak && (
                    <Star className='h-3 w-3 text-amber-200 fill-amber-200 drop-shadow-[0_0_4px_rgba(252,211,77,0.7)]' />
                )}
                {isToday && (
                    <span className='relative flex h-1.5 w-1.5'>
                        <span className='absolute inset-0 rounded-full bg-amber-300/60 animate-ping' />
                        <span className='relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300' />
                    </span>
                )}
            </div>

            {data?.quality === "excellent" && !disabled && !isPlanLocked && (
                <span
                    aria-hidden
                    className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(252,211,77,0.18),transparent_60%)]'
                />
            )}

            <span
                className={cn(
                    "relative font-serif text-lg leading-none tabular-nums",
                    isPlanLocked
                        ? "text-white/55"
                        : data
                          ? qualityNumber[data.quality]
                          : "text-white/70",
                )}
            >
                {cell.getDate()}
            </span>

            <div className='relative flex w-full items-center justify-between gap-1'>
                <div className='flex items-center gap-1'>
                    {data && !isPlanLocked && (
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                qualityDot[data.quality],
                            )}
                        />
                    )}
                    {hasWarning && (
                        <span className='h-1.5 w-1.5 rounded-full bg-red-400/80' />
                    )}
                </div>
                {data && !isPlanLocked && (
                    <span
                        className={cn(
                            "text-[10px] tabular-nums font-medium opacity-70 group-hover/cell:opacity-100 transition-opacity",
                            qualityNumber[data.quality],
                        )}
                    >
                        {data.overall.toFixed(1)}
                    </span>
                )}
            </div>

            {(isLocked || isMissingData) && (
                <span className='pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-[1px]'>
                    <Lock
                        className={cn(
                            "h-3.5 w-3.5",
                            isPlanLocked
                                ? "text-amber-300/80"
                                : "text-white/55",
                        )}
                    />
                </span>
            )}
        </button>
    )
}
