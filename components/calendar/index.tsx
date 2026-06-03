"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useAuth } from "@/hooks/use-auth"
import { useActiveSubscription } from "@/hooks/use-active-subscription"
import { useProfile } from "@/contexts/profile-context"
import {
    applyEphemerisLocationTimeDefaults,
    hasHoroscopeBirthDate,
    profileToHoroscopeBirthData,
} from "@/lib/horoscope-profile-birth"
import type { HoroscopeBirthData } from "@/types/horoscope"
import type { PersonalizedTransitAspectsResult } from "@/lib/astrology/transit-aspects"
import {
    type DayData,
    type DayDataWire,
    getMonthMatrix,
    getMonthOverview,
    hydrateDayData,
    toLocalIsoDate,
} from "@/lib/calendar-helper"
import {
    type CalendarPlanTier,
    getCalendarWindowDays,
    isDateWithinWindow,
    isMonthFullyOutsideWindow,
} from "@/lib/calendar/access-window"
import { fetchCalendarUnlocks } from "@/lib/calendar/unlocks-client"
import { buildCalendarDayOriginContext } from "@/lib/chat/origin-context"
import PageContextComposer from "@/components/chat/page-context-composer"
import type {
    DaysMap,
    MonthFetchState,
    MonthKey,
    TransitDayFetchState,
} from "./types"
import { monthKey } from "./utils"
import {
    AuthGateCard,
    BirthGateCard,
    CalendarGrid,
    DetailPanel,
    Header,
    LockedPaywallDialog,
    MonthOverview,
} from "./ui"

type CalendarClientProps = {
    /**
     * When true, render only the calendar surface (no full-viewport height,
     * no PageContextComposer) so the component can be embedded inside
     * another scrolling context — e.g. an inline tool block in a chat
     * session.
     */
    embedded?: boolean
}

export default function CalendarClient({
    embedded = false,
}: CalendarClientProps = {}) {
    const locale = useLocale()
    const tCalendar = useTranslations("Calendar")
    const { user, loading: authLoading } = useAuth()
    const { profile, loading: profileLoading } = useProfile()
    const { subscription } = useActiveSubscription()
    const planTier: CalendarPlanTier = subscription?.tier ?? "free"
    const windowDays = getCalendarWindowDays(planTier)

    const [viewMonth, setViewMonth] = useState<{
        year: number
        month: number
    } | null>(null)
    const [today, setToday] = useState<Date | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [monthsCache, setMonthsCache] = useState<
        Record<MonthKey, MonthFetchState>
    >({})
    const [transitCache, setTransitCache] = useState<
        Record<string, TransitDayFetchState>
    >({})
    const [lockedPaywallDate, setLockedPaywallDate] = useState<Date | null>(
        null,
    )
    const [unlockedDates, setUnlockedDates] = useState<Set<string>>(
        () => new Set(),
    )

    const refreshUnlockedDates = useCallback(
        async (signal?: AbortSignal) => {
            if (!user?.id) {
                setUnlockedDates(new Set())
                return
            }
            try {
                const list = await fetchCalendarUnlocks(user.id, signal)
                setUnlockedDates(new Set(list.map((u) => u.date)))
            } catch (err) {
                if ((err as Error).name === "AbortError") return
            }
        },
        [user?.id],
    )

    useEffect(() => {
        if (!user?.id) {
            setUnlockedDates(new Set())
            return
        }
        const controller = new AbortController()
        void refreshUnlockedDates(controller.signal)
        return () => controller.abort()
    }, [user?.id, refreshUnlockedDates])

    const isDateAccessible = useCallback(
        (cell: Date) => {
            if (!today) return false
            if (isDateWithinWindow(cell, today, windowDays)) return true
            return unlockedDates.has(toLocalIsoDate(cell))
        },
        [today, windowDays, unlockedDates],
    )

    const inFlightRef = useRef<AbortController | null>(null)
    const transitInFlightRef = useRef<Map<string, AbortController>>(new Map())

    useEffect(() => {
        const now = new Date()
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        setToday(t)
        setSelectedDate(t)
        setViewMonth({ year: t.getFullYear(), month: t.getMonth() })
    }, [])

    // Highlights/warnings text is built per-locale on the server. The month
    // cache is keyed only by year/month so we drop it when the UI locale
    // changes; the active month will refetch with the new locale text.
    // (Numeric scores no longer depend on locale.)
    useEffect(() => {
        setMonthsCache({})
        setTransitCache({})
    }, [locale])

    const birthData = useMemo<HoroscopeBirthData | null>(
        () => profileToHoroscopeBirthData(profile),
        [profile],
    )
    const hasBirth = hasHoroscopeBirthDate(birthData)

    const fetchMonth = useCallback(
        async (year: number, month: number) => {
            if (!birthData || !hasBirth) return
            const key = monthKey(year, month)
            const existing = monthsCache[key]
            if (
                existing &&
                existing.status !== "idle" &&
                existing.status !== "error"
            ) {
                return
            }

            const monthHasUnlockedDate = (() => {
                if (unlockedDates.size === 0) return false
                const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`
                for (const iso of unlockedDates) {
                    if (iso.startsWith(prefix)) return true
                }
                return false
            })()

            if (
                today &&
                isMonthFullyOutsideWindow(year, month, today, windowDays) &&
                !monthHasUnlockedDate
            ) {
                setMonthsCache((prev) => ({
                    ...prev,
                    [key]: {
                        status: "ok",
                        source: "codex",
                        days: {},
                    },
                }))
                return
            }

            inFlightRef.current?.abort()
            const controller = new AbortController()
            inFlightRef.current = controller

            setMonthsCache((prev) => ({
                ...prev,
                [key]: { status: "loading" },
            }))

            try {
                const payloadBirth =
                    applyEphemerisLocationTimeDefaults(birthData)
                const res = await fetch("/api/calendar/month", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        year,
                        month,
                        locale,
                        birth: {
                            day: payloadBirth.day,
                            month: payloadBirth.month,
                            year: payloadBirth.year,
                            hour: payloadBirth.hour,
                            minute: payloadBirth.minute,
                            timeHint: payloadBirth.timeHint,
                            timezone: payloadBirth.timezone,
                            lat: payloadBirth.lat,
                            lng: payloadBirth.lng,
                            country: payloadBirth.country,
                            state: payloadBirth.state,
                        },
                    }),
                })
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`)
                }
                const json = (await res.json()) as {
                    source: "codex" | "swisseph_fallback"
                    days: Record<string, DayDataWire | null>
                }
                const hydrated: DaysMap = {}
                for (const [iso, wire] of Object.entries(json.days)) {
                    hydrated[iso] = wire ? hydrateDayData(wire) : null
                }
                setMonthsCache((prev) => ({
                    ...prev,
                    [key]: {
                        status: "ok",
                        source: json.source,
                        days: hydrated,
                    },
                }))
            } catch (err) {
                if ((err as Error).name === "AbortError") return
                setMonthsCache((prev) => ({
                    ...prev,
                    [key]: {
                        status: "error",
                        message: (err as Error).message ?? "FETCH_FAILED",
                    },
                }))
            }
        },
        [
            birthData,
            hasBirth,
            locale,
            monthsCache,
            today,
            windowDays,
            unlockedDates,
        ],
    )

    useEffect(() => {
        if (!viewMonth) return
        if (!hasBirth) return
        void fetchMonth(viewMonth.year, viewMonth.month)
    }, [viewMonth, hasBirth, fetchMonth])

    // Per-date transit chart fetch. Mirrors the chart-data shape the
    // technical-tab transit UI consumes so we can drop OrbitVisual +
    // TransitFeed straight into the calendar's detail panel for the
    // selected day.
    const fetchTransitForDate = useCallback(
        async (iso: string) => {
            if (!birthData || !hasBirth) return
            if (transitCache[iso]?.status === "loading") return
            if (transitCache[iso]?.status === "ok") return

            transitInFlightRef.current.get(iso)?.abort()
            const controller = new AbortController()
            transitInFlightRef.current.set(iso, controller)

            setTransitCache((prev) => ({
                ...prev,
                [iso]: { status: "loading" },
            }))

            try {
                const payloadBirth =
                    applyEphemerisLocationTimeDefaults(birthData)
                const [yyyy, mm, dd] = iso.split("-").map(Number)
                const res = await fetch("/api/horoscope/chart-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        // Placeholder question — chart-data ignores the
                        // wording for daily-window requests and only uses
                        // it for natal-mode detection (which we skip by
                        // passing a single-day questionRange explicitly).
                        question: iso,
                        locale,
                        birth: {
                            day: payloadBirth.day,
                            month: payloadBirth.month,
                            year: payloadBirth.year,
                            hour: payloadBirth.hour,
                            minute: payloadBirth.minute,
                            timeHint: payloadBirth.timeHint,
                            timezone: payloadBirth.timezone,
                            lat: payloadBirth.lat,
                            lng: payloadBirth.lng,
                            country: payloadBirth.country,
                            state: payloadBirth.state,
                        },
                        questionRange: {
                            startDateIso: iso,
                            endDateIso: iso,
                            durationDays: 1,
                            source: "explicit",
                            granularity: "daily",
                        },
                        transit: {
                            day: dd,
                            month: mm,
                            year: yyyy,
                            hour: 12,
                            minute: 0,
                            timezone: payloadBirth.timezone,
                            lat: payloadBirth.lat,
                            lng: payloadBirth.lng,
                            country: payloadBirth.country,
                            state: payloadBirth.state,
                        },
                    }),
                })
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`)
                }
                const json = (await res.json()) as Record<string, unknown>
                const aspects =
                    (json.personalizedTransitAspects as
                        | PersonalizedTransitAspectsResult
                        | null
                        | undefined) ?? null
                setTransitCache((prev) => ({
                    ...prev,
                    [iso]: {
                        status: "ok",
                        chartData: json,
                        personalizedTransitAspects: aspects,
                    },
                }))
            } catch (err) {
                if ((err as Error).name === "AbortError") return
                setTransitCache((prev) => ({
                    ...prev,
                    [iso]: {
                        status: "error",
                        message: (err as Error).message ?? "FETCH_FAILED",
                    },
                }))
            } finally {
                transitInFlightRef.current.delete(iso)
            }
        },
        [birthData, hasBirth, locale, transitCache],
    )

    useEffect(() => {
        if (!selectedDate || !hasBirth) return
        const iso = toLocalIsoDate(selectedDate)
        void fetchTransitForDate(iso)
    }, [selectedDate, hasBirth, fetchTransitForDate])

    const monthMatrix = useMemo(() => {
        if (!viewMonth) return null
        return getMonthMatrix(viewMonth.year, viewMonth.month)
    }, [viewMonth])

    const currentMonthState: MonthFetchState | null = viewMonth
        ? (monthsCache[monthKey(viewMonth.year, viewMonth.month)] ?? null)
        : null

    const daysMap: DaysMap | null =
        currentMonthState && currentMonthState.status === "ok"
            ? currentMonthState.days
            : null

    const monthOverview = useMemo(() => {
        if (!monthMatrix || !daysMap) return null
        return getMonthOverview(monthMatrix, daysMap)
    }, [monthMatrix, daysMap])

    const selectedDayData: DayData | null = useMemo(() => {
        if (!selectedDate || !daysMap) return null
        return daysMap[toLocalIsoDate(selectedDate)] ?? null
    }, [selectedDate, daysMap])

    const todayData: DayData | null = useMemo(() => {
        if (!today || !daysMap) return null
        return daysMap[toLocalIsoDate(today)] ?? null
    }, [today, daysMap])

    const selectedDayIsLocked = useMemo(() => {
        if (!selectedDate || !today) return false
        return !isDateAccessible(selectedDate)
    }, [selectedDate, today, isDateAccessible])

    const goPrevMonth = () => {
        setViewMonth((prev) => {
            if (!prev) return prev
            const d = new Date(prev.year, prev.month - 1, 1)
            return { year: d.getFullYear(), month: d.getMonth() }
        })
    }

    const goNextMonth = () => {
        setViewMonth((prev) => {
            if (!prev) return prev
            const d = new Date(prev.year, prev.month + 1, 1)
            return { year: d.getFullYear(), month: d.getMonth() }
        })
    }

    const showAuthGate = !authLoading && !user
    const showBirthGate =
        !showAuthGate && !profileLoading && !!user && !hasBirth

    const calendarOriginContext = useMemo(() => {
        if (showAuthGate || showBirthGate) return null
        if (!selectedDate) return null
        return buildCalendarDayOriginContext(
            selectedDate,
            selectedDayData,
            locale,
        )
    }, [showAuthGate, showBirthGate, selectedDate, selectedDayData, locale])

    const calendarSuggestions = useMemo(
        () => [
            tCalendar("suggestions.focusToday"),
            tCalendar("suggestions.goodDecisionDay"),
            tCalendar("suggestions.activitiesForToday"),
            tCalendar("suggestions.warnings"),
        ],
        [tCalendar],
    )

    const outerClass = embedded
        ? "relative isolate overflow-x-hidden"
        : "relative isolate min-h-[calc(100dvh-64px)] overflow-x-hidden pb-[220px]"
    const innerClass = embedded
        ? "relative w-full space-y-5"
        : "relative max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-14 space-y-6 lg:space-y-8"

    return (
        <div className={outerClass}>
            <div className={innerClass}>
                <Header
                    viewMonth={viewMonth}
                    onPrev={goPrevMonth}
                    onNext={goNextMonth}
                    todayData={todayData}
                />

                {showAuthGate ? (
                    <AuthGateCard />
                ) : showBirthGate ? (
                    <BirthGateCard />
                ) : (
                    <>
                        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px] lg:gap-8'>
                            <CalendarGrid
                                matrix={monthMatrix}
                                today={today}
                                selectedDate={selectedDate}
                                onSelect={(d) => {
                                    if (today && !isDateAccessible(d)) {
                                        setLockedPaywallDate(d)
                                        return
                                    }
                                    setSelectedDate(d)
                                }}
                                unlockedDates={unlockedDates}
                                daysMap={daysMap}
                                windowDays={windowDays}
                                loading={
                                    currentMonthState?.status === "loading"
                                }
                                error={
                                    currentMonthState?.status === "error"
                                        ? currentMonthState.message
                                        : null
                                }
                            />
                            <MonthOverview overview={monthOverview} />
                            <DetailPanel
                                data={selectedDayData}
                                isSelectedDateLoaded={Boolean(
                                    selectedDate && daysMap,
                                )}
                                isMissingCodex={Boolean(
                                    selectedDate &&
                                        daysMap &&
                                        daysMap[
                                            toLocalIsoDate(selectedDate)
                                        ] === null,
                                )}
                                isPlanLocked={selectedDayIsLocked}
                                planTier={planTier}
                                selectedIso={
                                    selectedDate
                                        ? toLocalIsoDate(selectedDate)
                                        : null
                                }
                                transitState={
                                    selectedDate
                                        ? (transitCache[
                                              toLocalIsoDate(selectedDate)
                                          ] ?? null)
                                        : null
                                }
                            />
                        </div>
                    </>
                )}
            </div>
            {!embedded && calendarOriginContext ? (
                <PageContextComposer
                    originContext={calendarOriginContext}
                    placeholder={tCalendar("composerPlaceholder")}
                    suggestions={calendarSuggestions}
                />
            ) : null}
            <LockedPaywallDialog
                open={lockedPaywallDate !== null}
                onOpenChange={(open) => {
                    if (!open) setLockedPaywallDate(null)
                }}
                planTier={planTier}
                lockedDate={lockedPaywallDate}
                userId={user?.id ?? null}
                onUnlocked={(unlocked) => {
                    const iso = toLocalIsoDate(unlocked)
                    setUnlockedDates((prev) => {
                        if (prev.has(iso)) return prev
                        const next = new Set(prev)
                        next.add(iso)
                        return next
                    })
                    // Drop the cached month so it refetches with the newly
                    // accessible day included.
                    setMonthsCache((prev) => {
                        const key = monthKey(
                            unlocked.getFullYear(),
                            unlocked.getMonth(),
                        )
                        if (!prev[key]) return prev
                        const next = { ...prev }
                        delete next[key]
                        return next
                    })
                    setSelectedDate(unlocked)
                    setLockedPaywallDate(null)
                }}
            />
        </div>
    )
}
