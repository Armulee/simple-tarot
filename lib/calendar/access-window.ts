import { differenceInCalendarDays } from "date-fns"

export type CalendarPlanTier = "free" | "basic" | "pro"

const WINDOW_DAYS_BY_TIER: Record<CalendarPlanTier, number> = {
    free: 30,
    basic: 365,
    pro: Number.POSITIVE_INFINITY,
}

export function getCalendarWindowDays(tier: CalendarPlanTier): number {
    return WINDOW_DAYS_BY_TIER[tier]
}

export function isDateWithinWindow(
    cell: Date,
    today: Date,
    windowDays: number,
): boolean {
    if (!Number.isFinite(windowDays)) return true
    return Math.abs(differenceInCalendarDays(cell, today)) <= windowDays
}

export function isMonthFullyOutsideWindow(
    year: number,
    month: number,
    today: Date,
    windowDays: number,
): boolean {
    if (!Number.isFinite(windowDays)) return false
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    return (
        !isDateWithinWindow(firstDay, today, windowDays) &&
        !isDateWithinWindow(lastDay, today, windowDays)
    )
}
