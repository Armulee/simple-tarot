"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { useAstraIdentity } from "@/lib/astra/use-astra-identity"
import { CelestialIcon } from "@/components/star-consent"
import { CookiesBanner } from "@/components/cookies-banner"
import NormalFooter from "@/components/footer/normal-footer"
import { loadBirthFromStorage } from "@/lib/birth-storage"
import { supabase } from "@/lib/supabase"
import {
    findLatestAstraSession,
    startAstraSession,
} from "@/lib/chat/start-session"

/**
 * Landing page.
 *
 * This page exists for first-time visitors, SEO, and ads only. It says who the
 * visitor is about to talk to and offers exactly one way in — no composer, no
 * feature chips, no question for the visitor to invent. Anyone whose birth date
 * we already know is redirected into the reading room before first paint.
 */

/** Query params that mean "stay on the landing page" (referral / post-sign-in replays). */
const NO_AUTO_ENTER_PARAMS = ["ref", "autosend", "stay"] as const

export default function Home() {
    const tHome = useTranslations("Home")
    const locale = useLocale()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { profile, loading: profileLoading } = useProfile()
    const astra = useAstraIdentity()

    // "landing" is the SSR default so crawlers always receive the real page;
    // returning visitors flip to "opening" in a layout effect, before paint.
    const [phase, setPhase] = useState<"landing" | "opening">("landing")
    const [error, setError] = useState<string | null>(null)
    const [hasStoredBirth, setHasStoredBirth] = useState(false)
    const [autoEnterBlocked, setAutoEnterBlocked] = useState(false)
    const enteringRef = useRef(false)

    useLayoutEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (NO_AUTO_ENTER_PARAMS.some((key) => params.has(key))) {
            setAutoEnterBlocked(true)
            return
        }
        const birth = loadBirthFromStorage()
        const known =
            birth?.year != null && birth?.month != null && birth?.day != null
        if (known) {
            setHasStoredBirth(true)
            setPhase("opening")
        }
    }, [])

    /**
     * Opens the reading room. Returning visitors resume their latest thread;
     * a first reading always starts a fresh one.
     */
    const enterReading = useCallback(
        async ({ resumeLatest }: { resumeLatest: boolean }) => {
            if (enteringRef.current) return
            enteringRef.current = true
            setPhase("opening")
            setError(null)
            try {
                let sessionId: string | null = null
                if (resumeLatest) {
                    const {
                        data: { session },
                    } = await supabase.auth.getSession()
                    sessionId = await findLatestAstraSession(
                        session?.access_token ?? null,
                    )
                }
                if (!sessionId) {
                    sessionId = await startAstraSession({
                        openingQuestion: tHome("getStartedPrompt"),
                        userId: user?.id ?? null,
                    })
                }
                router.replace(`/${locale}/${sessionId}`)
            } catch {
                enteringRef.current = false
                setPhase("landing")
                setError(tHome("openReadingError"))
            }
        },
        [locale, router, tHome, user?.id],
    )

    // Returning visitor: we already know their birth date, so there is nothing
    // to ask on the landing page — go straight to the reading.
    const hasProfileBirth = Boolean(profile?.birth_date)
    const stillResolvingProfile = authLoading || (Boolean(user) && profileLoading)
    useEffect(() => {
        if (autoEnterBlocked || enteringRef.current) return
        if (!hasStoredBirth && !hasProfileBirth) return
        if (!hasStoredBirth && stillResolvingProfile) return
        void enterReading({ resumeLatest: true })
    }, [
        autoEnterBlocked,
        enterReading,
        hasProfileBirth,
        hasStoredBirth,
        stillResolvingProfile,
    ])

    if (phase === "opening") {
        return (
            <div className='flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center'>
                <Loader2 className='h-5 w-5 animate-spin text-primary' />
                <p className='text-sm text-white/70'>
                    {tHome("openingReading", {
                        honorific: astra.honorific,
                        name: astra.name,
                        fullName: astra.fullName,
                    })}
                </p>
            </div>
        )
    }

    return (
        <div className='relative flex h-full w-full flex-col'>
            <div className='flex flex-1 flex-col items-center justify-center px-6 text-center'>
                <div className='flex flex-col items-center gap-5'>
                    <span
                        className='flex h-20 w-20 items-center justify-center rounded-full border border-[rgba(200,180,140,0.35)] bg-white/5 shadow-[0_0_45px_-12px_rgba(200,180,140,0.55)]'
                        aria-hidden
                    >
                        <CelestialIcon />
                    </span>

                    <div className='space-y-1'>
                        <p className='font-playfair text-2xl text-[#e8e0d0] sm:text-3xl'>
                            {astra.fullName}
                        </p>
                        <p className='text-[11px] uppercase tracking-[0.28em] text-white/50'>
                            {astra.role}
                        </p>
                    </div>

                    <h1 className='max-w-[18ch] font-playfair text-3xl font-bold leading-snug text-white sm:text-4xl md:text-5xl'>
                        {tHome("hero.headline")}
                    </h1>

                    <button
                        type='button'
                        onClick={() => void enterReading({ resumeLatest: false })}
                        className='mt-2 w-[300px] max-w-full rounded-full bg-gradient-to-r from-primary via-accent to-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90'
                    >
                        {tHome("openReading", {
                            honorific: astra.honorific,
                            name: astra.name,
                            fullName: astra.fullName,
                        })}
                    </button>

                    {error && (
                        <p className='animate-fade-in text-xs text-red-400'>
                            {error}
                        </p>
                    )}
                </div>
            </div>

            <div className='shrink-0'>
                <p className='px-6 text-center text-[11px] tracking-wide text-white/40'>
                    {tHome("craftLine")}
                </p>
                <CookiesBanner inline />
                <NormalFooter />
            </div>
        </div>
    )
}
