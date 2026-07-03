"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import {
    Activity,
    Briefcase,
    Coins,
    Heart,
    Loader2,
    Minus,
    RefreshCw,
    Sparkles,
    Sprout,
    TrendingDown,
    TrendingUp,
    UserRound,
    Users,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { useCharacters } from "@/hooks/use-characters"
import type {
    LifeArea,
    LifeMonitorPayload,
} from "@/lib/chat/life-monitor-schema"

type BirthBody = {
    name: string | null
    day: number
    month: number
    year: number
    hour: number | null
    minute: number | null
    country: string | null
    state: string | null
    lat: number | null
    lng: number | null
    timezone: number | null
}

const AREA_ICON: Record<LifeArea, typeof Sparkles> = {
    mood: Sparkles,
    love: Heart,
    career: Briefcase,
    money: Coins,
    health: Activity,
    growth: Sprout,
    social: Users,
}

const MOOD_ACCENT: Record<string, { text: string; ring: string; bar: string }> = {
    bright: {
        text: "text-emerald-300",
        ring: "ring-emerald-400/30",
        bar: "from-emerald-500 via-teal-400 to-emerald-400",
    },
    mixed: {
        text: "text-amber-300",
        ring: "ring-amber-400/30",
        bar: "from-amber-500 via-yellow-400 to-amber-400",
    },
    tough: {
        text: "text-rose-300",
        ring: "ring-rose-400/30",
        bar: "from-rose-500 via-pink-400 to-rose-400",
    },
}

const TREND_ICON = {
    rising: TrendingUp,
    steady: Minus,
    dipping: TrendingDown,
} as const

export default function LifeMonitor() {
    const t = useTranslations("LifeMonitor")
    const locale = useLocale()
    const { user, loading: authLoading } = useAuth()
    const { profile, birthChart } = useProfile()
    const { characters } = useCharacters()

    const [subjectId, setSubjectId] = useState("self")
    const [payload, setPayload] = useState<LifeMonitorPayload | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const lastKeyRef = useRef<string | null>(null)

    const selfBirth = useMemo<BirthBody | null>(() => {
        if (!birthChart) return null
        return {
            name: profile?.name ?? null,
            day: birthChart.day,
            month: birthChart.month,
            year: birthChart.year,
            hour: birthChart.hour,
            minute: birthChart.minute,
            country: birthChart.country,
            state: birthChart.state_province,
            lat: birthChart.lat,
            lng: birthChart.lng,
            timezone: birthChart.timezone,
        }
    }, [birthChart, profile])

    const activeCharacter = useMemo(
        () => characters.find((c) => c.id === subjectId) ?? null,
        [characters, subjectId],
    )

    const currentBirth = useMemo<BirthBody | null>(() => {
        if (subjectId === "self") return selfBirth
        if (!activeCharacter) return null
        return {
            name: activeCharacter.name,
            day: activeCharacter.birthDay,
            month: activeCharacter.birthMonth,
            year: activeCharacter.birthYear,
            hour: activeCharacter.birthHour,
            minute: activeCharacter.birthMinute,
            country: activeCharacter.birthCountry,
            state: activeCharacter.birthState,
            lat: activeCharacter.lat,
            lng: activeCharacter.lng,
            timezone: activeCharacter.timezone,
        }
    }, [subjectId, selfBirth, activeCharacter])

    const runMonitor = useCallback(
        async (subject: "self" | "character", birth: BirthBody) => {
            setLoading(true)
            setError(false)
            try {
                const res = await fetch("/api/life-monitor", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subject, locale, birth }),
                })
                if (!res.ok) throw new Error("failed")
                const data = (await res.json()) as LifeMonitorPayload
                setPayload(data)
            } catch {
                setError(true)
                setPayload(null)
            } finally {
                setLoading(false)
            }
        },
        [locale],
    )

    // Load (once) whenever the selected subject's birth data is available.
    useEffect(() => {
        if (!currentBirth) return
        const key = `${subjectId}:${currentBirth.day}-${currentBirth.month}-${currentBirth.year}`
        if (lastKeyRef.current === key) return
        lastKeyRef.current = key
        void runMonitor(subjectId === "self" ? "self" : "character", currentBirth)
    }, [subjectId, currentBirth, runMonitor])

    const refresh = () => {
        if (!currentBirth) return
        lastKeyRef.current = null
        void runMonitor(subjectId === "self" ? "self" : "character", currentBirth)
    }

    const mood = payload?.result.mood ?? "mixed"
    const accent = MOOD_ACCENT[mood] ?? MOOD_ACCENT.mixed
    const isCharacter = subjectId !== "self"

    return (
        <div className='relative mx-auto w-full max-w-3xl px-5 py-10 sm:py-14'>
            <header className='space-y-2 text-center'>
                <p className='text-[13px] font-medium text-white/55'>
                    {t("subtitle")}
                </p>
                <h1 className='text-3xl font-semibold tracking-tight text-white sm:text-4xl'>
                    {t("title")}
                </h1>
            </header>

            {/* Subject selector */}
            <div className='mt-6 flex flex-wrap items-center justify-center gap-2'>
                <button
                    type='button'
                    onClick={() => setSubjectId("self")}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                        subjectId === "self"
                            ? "border-indigo-400/50 bg-indigo-500/20 text-white"
                            : "border-white/15 bg-white/5 text-white/75 hover:text-white"
                    }`}
                >
                    <Sparkles className='size-3.5' />
                    {t("you")}
                </button>
                {characters.map((c) => (
                    <button
                        key={c.id}
                        type='button'
                        onClick={() => setSubjectId(c.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                            subjectId === c.id
                                ? "border-pink-400/50 bg-pink-500/20 text-white"
                                : "border-white/15 bg-white/5 text-white/75 hover:text-white"
                        }`}
                    >
                        <UserRound className='size-3.5 text-pink-300' />
                        {c.name}
                    </button>
                ))}
            </div>

            <div className='mt-8'>
                {!user && !authLoading ? (
                    <EmptyState
                        title={t("signInTitle")}
                        body={t("signInBody")}
                        ctaHref='/signin'
                        ctaLabel={t("signInCta")}
                    />
                ) : subjectId === "self" && !selfBirth && !authLoading ? (
                    <EmptyState
                        title={t("noBirthTitle")}
                        body={t("noBirthBody")}
                        ctaHref='/birth-chart'
                        ctaLabel={t("noBirthCta")}
                    />
                ) : loading || (!payload && !error) ? (
                    <div className='flex flex-col items-center gap-3 py-16 text-white/60'>
                        <Loader2 className='size-6 animate-spin text-indigo-300' />
                        <p className='text-sm'>{t("loading")}</p>
                    </div>
                ) : error ? (
                    <div className='flex flex-col items-center gap-3 py-16'>
                        <p className='text-sm text-white/60'>{t("error")}</p>
                        <button
                            type='button'
                            onClick={refresh}
                            className='inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:text-white'
                        >
                            <RefreshCw className='size-3.5' />
                            {t("retry")}
                        </button>
                    </div>
                ) : payload ? (
                    <div className='space-y-5'>
                        {/* Overall hero */}
                        <section className='rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.55)] backdrop-blur-2xl ring-1 ring-white/[0.06] sm:p-6'>
                            <div className='flex items-center gap-5'>
                                <div
                                    className={`flex size-20 shrink-0 flex-col items-center justify-center rounded-full bg-white/[0.04] ring-2 sm:size-24 ${accent.ring}`}
                                >
                                    <span
                                        className={`text-2xl font-bold tabular-nums sm:text-3xl ${accent.text}`}
                                    >
                                        {payload.result.overallScore}
                                    </span>
                                    <span className='text-[10px] uppercase tracking-wider text-white/45'>
                                        {t("score")}
                                    </span>
                                </div>
                                <div className='min-w-0 space-y-1'>
                                    <p
                                        className={`text-xs font-semibold uppercase tracking-[0.16em] ${accent.text}`}
                                    >
                                        {t(`mood.${mood}`)}
                                    </p>
                                    <h2 className='text-lg font-semibold text-white'>
                                        {payload.result.headline}
                                    </h2>
                                </div>
                            </div>
                            <p className='mt-4 text-sm leading-relaxed text-white/80'>
                                {payload.result.summary}
                            </p>
                            {payload.approximate ? (
                                <p className='mt-3 text-[11px] text-white/45'>
                                    {t("approxNote")}
                                </p>
                            ) : null}
                        </section>

                        {/* Panels */}
                        <div className='grid gap-3 sm:grid-cols-2'>
                            {payload.result.panels.map((panel, i) => {
                                const Icon = AREA_ICON[panel.area] ?? Sparkles
                                const Trend = TREND_ICON[panel.trend]
                                return (
                                    <div
                                        key={`${panel.area}-${i}`}
                                        className='rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl'
                                    >
                                        <div className='flex items-center justify-between gap-2'>
                                            <p className='flex items-center gap-2 text-sm font-medium text-white'>
                                                <Icon className='size-4 shrink-0 text-indigo-300' />
                                                {t(`areas.${panel.area}`)}
                                            </p>
                                            <span className='flex items-center gap-1 text-xs tabular-nums text-white/60'>
                                                <Trend className='size-3.5' />
                                                {panel.score}
                                            </span>
                                        </div>
                                        <div className='mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10'>
                                            <div
                                                className='h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-400 to-cyan-400'
                                                style={{
                                                    width: `${Math.max(0, Math.min(100, panel.score))}%`,
                                                }}
                                            />
                                        </div>
                                        <p className='mt-2 text-sm leading-relaxed text-white/75'>
                                            {panel.text}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Support tip for someone else */}
                        {isCharacter && payload.result.supportTip ? (
                            <section className='rounded-2xl border border-pink-400/20 bg-pink-500/10 p-4'>
                                <h3 className='flex items-center gap-1.5 text-sm font-semibold text-pink-100'>
                                    <Heart className='size-4 text-pink-300' />
                                    {t("supportTitle")}
                                </h3>
                                <p className='mt-1.5 text-sm leading-relaxed text-white/85'>
                                    {payload.result.supportTip}
                                </p>
                            </section>
                        ) : null}

                        <div className='flex items-center justify-between gap-3'>
                            {isCharacter ? (
                                <p className='text-[11px] leading-relaxed text-white/40'>
                                    {t("characterDisclaimer")}
                                </p>
                            ) : (
                                <span />
                            )}
                            <button
                                type='button'
                                onClick={refresh}
                                className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:text-white'
                            >
                                <RefreshCw className='size-3.5' />
                                {t("refresh")}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function EmptyState({
    title,
    body,
    ctaHref,
    ctaLabel,
}: {
    title: string
    body: string
    ctaHref: string
    ctaLabel: string
}) {
    return (
        <div className='mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center backdrop-blur-xl'>
            <h2 className='text-base font-semibold text-white'>{title}</h2>
            <p className='mt-1.5 text-sm text-white/65'>{body}</p>
            <Link
                href={ctaHref}
                className='mt-4 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90'
            >
                {ctaLabel}
            </Link>
        </div>
    )
}
