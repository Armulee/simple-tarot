"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Sparkles } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { supabase } from "@/lib/supabase"
import BirthChartDisplay from "@/components/birth-chart/display"
import ProfileBirthForm from "@/components/birth-chart/profile-birth-form"
import PageContextComposer from "@/components/chat/page-context-composer"
import CosmicCenteredLoader from "@/components/cosmic-centered-loader"
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
        return <CosmicCenteredLoader label={t("loadingChart")} />
    }

    if (phase === "computing") {
        return <CosmicCenteredLoader label={t("computingChart")} />
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
            <div className='min-h-[calc(100dvh-64px)] flex items-center justify-center px-5 py-12'>
                <div className='w-full max-w-md rounded-3xl bg-white/[0.05] backdrop-blur-2xl ring-1 ring-white/[0.08] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)] p-8 sm:p-10 text-center space-y-6'>
                    <p className='text-xs font-medium text-rose-200/85'>
                        {t("computeFailedTitle")}
                    </p>
                    <h1 className='text-2xl sm:text-3xl font-semibold tracking-tight text-white'>
                        {t("computeFailed")}
                    </h1>
                    <p className='text-[14px] leading-relaxed text-white/65 max-w-sm mx-auto'>
                        {errorMessage}
                    </p>
                    <button
                        type='button'
                        onClick={() => {
                            computeAttemptedRef.current = true
                            void computeChart()
                        }}
                        className='inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90 transition-colors'
                    >
                        <Sparkles className='h-4 w-4' /> {t("retry")}
                    </button>
                </div>
            </div>
        )
    }

    if (!birthChart) {
        return <CosmicCenteredLoader label={t("loadingChart")} />
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
