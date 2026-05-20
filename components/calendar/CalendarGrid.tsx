"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { DayData } from "@/lib/calendar-helper"
import { toLocalIsoDate } from "@/lib/calendar-helper"
import { WEEKDAY_KEYS } from "./constants"
import type { DaysMap } from "./types"
import { CalendarCell } from "./CalendarCell"

export function CalendarGrid({
    matrix,
    today,
    selectedDate,
    onSelect,
    daysMap,
    windowDays,
    loading,
    error,
    unlockedDates,
}: {
    matrix: (Date | null)[][] | null
    today: Date | null
    selectedDate: Date | null
    onSelect: (d: Date) => void
    daysMap: DaysMap | null
    windowDays: number
    loading: boolean
    error: string | null
    unlockedDates?: Set<string>
}) {
    const t = useTranslations("Calendar")

    return (
        <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl p-4 lg:p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
            <div className='pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[28rem] rounded-full bg-violet-500/10 blur-3xl' />

            <div className='relative grid grid-cols-7 gap-2 mb-2'>
                {WEEKDAY_KEYS.map((w, i) => (
                    <div
                        key={`${w}-${i}`}
                        className={cn(
                            "text-center text-[11px] font-medium uppercase tracking-[0.18em] py-2",
                            i === 0 || i === 6
                                ? "text-amber-200/75"
                                : "text-white/40",
                        )}
                    >
                        {t(`weekdays.${w}`)}
                    </div>
                ))}
            </div>

            <div className='relative grid grid-cols-7 gap-2'>
                {matrix
                    ? matrix
                          .flat()
                          .map((cell, idx) => (
                              <CalendarCell
                                  key={idx}
                                  cell={cell}
                                  today={today}
                                  selectedDate={selectedDate}
                                  onSelect={onSelect}
                                  data={
                                      cell && daysMap
                                          ? (daysMap[toLocalIsoDate(cell)] ??
                                            null)
                                          : null
                                  }
                                  windowDays={windowDays}
                                  loading={loading && Boolean(cell)}
                                  isUnlocked={
                                      cell
                                          ? Boolean(
                                                unlockedDates?.has(
                                                    toLocalIsoDate(cell),
                                                ),
                                            )
                                          : false
                                  }
                              />
                          ))
                    : Array.from({ length: 42 }).map((_, idx) => (
                          <div
                              key={idx}
                              className='aspect-square rounded-2xl bg-white/[0.02] animate-pulse'
                          />
                      ))}
            </div>

            {error && (
                <div className='relative mt-3 text-xs text-red-300/80'>
                    {t("grid.loadError", { error })}
                </div>
            )}
        </div>
    )
}
