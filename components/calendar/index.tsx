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
import { buildCalendarDayOriginContext } from "@/lib/chat/origin-context"
import PageContextComposer from "@/components/chat/page-context-composer"
import type { DaysMap, MonthFetchState, MonthKey } from "./types"
import { monthKey } from "./utils"
import {
    AuthGateCard,
    BirthGateCard,
    BottomCTA,
    CalendarGrid,
    DetailPanel,
    Header,
    MonthOverview,
} from "./ui"

export default function CalendarClient() {
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

    const inFlightRef = useRef<AbortController | null>(null)

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

            if (
                today &&
                isMonthFullyOutsideWindow(year, month, today, windowDays)
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
        [birthData, hasBirth, locale, monthsCache, today, windowDays],
    )

    useEffect(() => {
        if (!viewMonth) return
        if (!hasBirth) return
        void fetchMonth(viewMonth.year, viewMonth.month)
    }, [viewMonth, hasBirth, fetchMonth])

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
        return !isDateWithinWindow(selectedDate, today, windowDays)
    }, [selectedDate, today, windowDays])

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

    return (
        <div className='relative isolate min-h-[calc(100dvh-64px)] overflow-x-hidden pb-[220px]'>
            <div className='relative max-w-6xl mx-auto px-4 lg:px-6 py-8 lg:py-14 space-y-6 lg:space-y-8'>
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
                                onSelect={(d) => setSelectedDate(d)}
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
                                birthData={birthData}
                                locale={locale}
                                today={today}
                            />
                        </div>

                        <BottomCTA />
                    </>
                )}
            </div>
            {calendarOriginContext ? (
                <PageContextComposer
                    originContext={calendarOriginContext}
                    placeholder={tCalendar("composerPlaceholder")}
                />
            ) : null}
        </div>
    )
}
