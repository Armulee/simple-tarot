"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { supabase } from "@/lib/supabase"
import BirthChartDisplay from "@/components/birth-chart/display"
import ProfileBirthForm from "@/components/birth-chart/profile-birth-form"
import PageContextComposer from "@/components/chat/page-context-composer"
import { buildBirthChartOriginContext } from "@/lib/chat/origin-context"
import type { PersonalBirthChart as PersonalBirthChartShape } from "@/contexts/profile-context"

type Phase = "loading" | "needs-form" | "computing" | "ready" | "error"

function profileHasBirth(birthDate: string | null | undefined): boolean {
    if (!birthDate) return false
    return /^\d{4}-\d{2}-\d{2}/.test(birthDate)
}

export default function PersonalBirthChart() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const {
        profile,
        loading: profileLoading,
        birthChart,
        refreshBirthChart,
    } = useProfile()
    const t = useTranslations("BirthChart")

    const [phase, setPhase] = useState<Phase>("loading")
    const [errorMessage, setErrorMessage] = useState<string>("")
    const computeAttemptedRef = useRef(false)

    useEffect(() => {
        if (!authLoading && !user) {
            toast.error(t("authRequired"))
            router.push("/signin?callbackUrl=/birth-chart")
        }
    }, [user, authLoading, router, t])

    const computeChart = useCallback(
        async (overrides?: {
            birthDate?: string | null
            birthTime?: string | null
            birthPlace?: string | null
        }) => {
            setPhase("computing")
            setErrorMessage("")
            try {
                const { data } = await supabase.auth.getSession()
                const accessToken = data.session?.access_token
                if (!accessToken) {
                    throw new Error("NO_SESSION")
                }

                const res = await fetch("/api/birth-chart/me", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(overrides ?? {}),
                })

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err?.error || "COMPUTE_FAILED")
                }

                await refreshBirthChart()
                setPhase("ready")
            } catch (e) {
                const message =
                    e instanceof Error ? e.message : "COMPUTE_FAILED"
                if (message === "INCOMPLETE_PROFILE_BIRTH") {
                    setPhase("needs-form")
                    return
                }
                setErrorMessage(message)
                setPhase("error")
                toast.error(t("computeFailed"))
            }
        },
        [refreshBirthChart, t],
    )

    useEffect(() => {
        if (authLoading || profileLoading || !user) return
        if (phase === "computing") return

        if (birthChart) {
            setPhase("ready")
            return
        }

        if (computeAttemptedRef.current) return

        if (profileHasBirth(profile?.birth_date)) {
            computeAttemptedRef.current = true
            void computeChart()
        } else {
            setPhase("needs-form")
        }
    }, [
        authLoading,
        profileLoading,
        user,
        birthChart,
        profile?.birth_date,
        phase,
        computeChart,
    ])

    if (authLoading || !user || phase === "loading" || profileLoading) {
        return <CenteredLoader label={t("loadingChart")} />
    }

    if (phase === "computing") {
        return <CenteredLoader label={t("computingChart")} />
    }

    if (phase === "needs-form") {
        return (
            <ProfileBirthForm
                defaultBirthDate={profile?.birth_date ?? null}
                defaultBirthTime={profile?.birth_time ?? null}
                defaultBirthPlace={profile?.birth_place ?? null}
                onSubmit={async ({ birthDate, birthTime, birthPlace }) => {
                    computeAttemptedRef.current = true
                    await computeChart({
                        birthDate,
                        birthTime,
                        birthPlace,
                    })
                }}
            />
        )
    }

    if (phase === "error") {
        return (
            <div className='min-h-[calc(100dvh-64px)] flex items-center justify-center px-4 py-12'>
                <div className='relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl p-8 sm:p-10 text-center shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)]'>
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -top-24 -right-16 h-48 w-48 rounded-full bg-rose-500/20 blur-3xl'
                    />
                    <div
                        aria-hidden
                        className='pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl'
                    />
                    <div className='relative space-y-6'>
                        <div className='inline-flex items-center justify-center gap-3'>
                            <span className='h-px w-6 bg-gradient-to-r from-transparent to-rose-300/60' />
                            <p className='text-[10px] font-medium uppercase tracking-[0.32em] text-rose-200/80'>
                                {t("computeFailedTitle")}
                            </p>
                            <span className='h-px w-6 bg-gradient-to-l from-transparent to-rose-300/60' />
                        </div>
                        <span className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-300/40 shadow-[0_0_24px_-6px_rgba(244,63,94,0.55)]'>
                            <Sparkles className='h-6 w-6 text-rose-200' />
                        </span>
                        <h1 className='font-serif italic text-2xl sm:text-3xl text-white'>
                            {t("computeFailed")}
                        </h1>
                        <p className='text-sm leading-relaxed text-white/60 max-w-sm mx-auto'>
                            {errorMessage}
                        </p>
                        <button
                            type='button'
                            onClick={() => {
                                computeAttemptedRef.current = true
                                void computeChart()
                            }}
                            className='inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-medium text-black hover:bg-amber-200 transition-colors shadow-[0_8px_24px_-8px_rgba(252,211,77,0.6)]'
                        >
                            <Sparkles className='h-4 w-4' /> {t("retry")}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!birthChart) {
        return <CenteredLoader label={t("loadingChart")} />
    }

    return (
        <BirthChartReady
            birthChart={birthChart}
            onChartUpdated={async () => {
                await refreshBirthChart()
            }}
        />
    )
}

function BirthChartReady({
    birthChart,
    onChartUpdated,
}: {
    birthChart: PersonalBirthChartShape
    onChartUpdated: () => Promise<void>
}) {
    const t = useTranslations("BirthChart")
    const originContext = useMemo(
        () =>
            buildBirthChartOriginContext(
                birthChart,
                t("composerContextLabel"),
            ),
        [birthChart, t],
    )

    return (
        <div className='pb-[220px]'>
            <BirthChartDisplay
                birthChart={toDisplayShape(birthChart)}
                mode='personal'
                onChartUpdated={onChartUpdated}
            />
            <PageContextComposer
                originContext={originContext}
                placeholder={t("composerPlaceholder")}
            />
        </div>
    )
}

function CenteredLoader({ label }: { label: string }) {
    return (
        <div className='min-h-[calc(100dvh-64px)] flex flex-col items-center justify-center px-6'>
            <div className='relative h-52 w-52'>
                <div
                    aria-hidden
                    className='absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.20),transparent_60%)] blur-2xl'
                />

                <span
                    aria-hidden
                    className='absolute inset-0 rounded-full border border-white/10 animate-[spin_18s_linear_infinite]'
                >
                    <span className='absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-200 shadow-[0_0_14px_rgba(252,211,77,0.9)]' />
                </span>

                <span
                    aria-hidden
                    className='absolute inset-5 rounded-full border border-amber-300/25 animate-[spin_11s_linear_infinite_reverse]'
                >
                    <span className='absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-200 shadow-[0_0_10px_rgba(125,211,252,0.9)]' />
                </span>

                <span
                    aria-hidden
                    className='absolute inset-10 rounded-full border border-violet-400/30 animate-[spin_7s_linear_infinite]'
                >
                    <span className='absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rose-200 shadow-[0_0_10px_rgba(254,205,211,0.9)]' />
                </span>

                <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='relative h-16 w-16'>
                        <span
                            aria-hidden
                            className='absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(125,211,252,0.55),rgba(14,165,233,0.25),transparent_70%)] blur-md'
                        />
                        <span className='absolute -inset-1 rounded-full ring-1 ring-sky-300/40' />
                        <Image
                            src='/assets/planetary/earth.png'
                            alt=''
                            aria-hidden
                            width={64}
                            height={64}
                            priority
                            className='relative h-16 w-16 rounded-full object-cover animate-[spin_24s_linear_infinite] drop-shadow-[0_8px_22px_rgba(56,189,248,0.55)]'
                        />
                    </div>
                </div>
            </div>

            <div className='mt-10 inline-flex items-center justify-center gap-3'>
                <span className='h-px w-6 bg-gradient-to-r from-transparent to-amber-300/60' />
                <p className='text-[10px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                    AskingFate
                </p>
                <span className='h-px w-6 bg-gradient-to-l from-transparent to-amber-300/60' />
            </div>
            <div className='mt-3 font-serif italic text-xl text-white/90'>
                {label}
            </div>
            <div className='mt-1.5 flex items-center justify-center gap-1'>
                <span className='h-1 w-1 rounded-full bg-white/45 animate-pulse [animation-delay:0ms]' />
                <span className='h-1 w-1 rounded-full bg-white/45 animate-pulse [animation-delay:150ms]' />
                <span className='h-1 w-1 rounded-full bg-white/45 animate-pulse [animation-delay:300ms]' />
            </div>
        </div>
    )
}

function toDisplayShape(chart: PersonalBirthChartShape) {
    return {
        id: chart.id,
        day: chart.day,
        month: chart.month,
        year: chart.year,
        hour: chart.hour,
        minute: chart.minute,
        timezone: chart.timezone,
        lat: chart.lat,
        lng: chart.lng,
        country: chart.country,
        state_province: chart.state_province,
        houses: chart.houses as Record<string, unknown> | null,
        planets: chart.planets as Record<string, unknown> | null,
        created_at: chart.created_at,
    }
}
