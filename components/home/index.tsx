"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslations, useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { LoopingTypewriterText } from "@/components/home/looping-typewriter-text"
import { ConsultingBadge } from "@/components/consulting-badge"
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
 * Kept as the original hero, minus the question composer: a visitor who does
 * not know what to ask should not be met by an empty text box. The single
 * "get started" button hands them over to the reading instead.
 *
 * The page exists for first-time visitors, SEO, and ads only — anyone whose
 * birth date we already know is redirected into their reading before paint.
 */

/** Query params that mean "stay on the landing page" (referral / post-sign-in replays). */
const NO_AUTO_ENTER_PARAMS = ["ref", "autosend", "stay"] as const

export default function Home() {
    const tHome = useTranslations("Home")
    const locale = useLocale()
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const { profile, loading: profileLoading } = useProfile()

    const [isOpening, setIsOpening] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showLearnMore, setShowLearnMore] = useState(false)
    const [hasStoredBirth, setHasStoredBirth] = useState(false)
    const [autoEnterBlocked, setAutoEnterBlocked] = useState(false)
    const openingRef = useRef(false)

    useEffect(() => {
        const timer = window.setTimeout(() => setShowLearnMore(true), 3000)
        return () => window.clearTimeout(timer)
    }, [])

    useLayoutEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (NO_AUTO_ENTER_PARAMS.some((key) => params.has(key))) {
            setAutoEnterBlocked(true)
            return
        }
        const birth = loadBirthFromStorage()
        if (birth?.year != null && birth?.month != null && birth?.day != null) {
            setHasStoredBirth(true)
            setIsOpening(true)
        }
    }, [])

    /**
     * Opens the reading room. Returning visitors resume their latest thread;
     * pressing the button always starts a fresh one.
     */
    const enterReading = useCallback(
        async ({ resumeLatest }: { resumeLatest: boolean }) => {
            if (openingRef.current) return
            openingRef.current = true
            setIsOpening(true)
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
                        userId: user?.id ?? null,
                    })
                }
                router.replace(`/${locale}/${sessionId}`)
            } catch {
                openingRef.current = false
                setIsOpening(false)
                setError(tHome("openReadingError"))
            }
        },
        [locale, router, tHome, user?.id],
    )

    // Returning visitor: their birth date is already on file, so there is
    // nothing for this page to ask — go straight to the reading.
    const hasProfileBirth = Boolean(profile?.birth_date)
    const stillResolvingProfile = authLoading || (Boolean(user) && profileLoading)
    useEffect(() => {
        if (autoEnterBlocked || openingRef.current) return
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

    const { heroPhrases, splitAtPerPhrase } = useMemo(() => {
        const firstPhrase = `${tHome("hero.line1")} ${tHome("hero.line2")}`
        const rawWhite = tHome.raw("hero.rotatingPhrasesWhite")
        const rawGradient = tHome.raw("hero.rotatingPhrasesGradient")
        const white = Array.isArray(rawWhite)
            ? rawWhite.filter((p): p is string => typeof p === "string")
            : []
        const gradient = Array.isArray(rawGradient)
            ? rawGradient.filter((p): p is string => typeof p === "string")
            : []
        const rotating = white.map((w, i) => w + (gradient[i] ?? ""))
        const splitAt = white.map((w) => w.length)
        return {
            heroPhrases: [firstPhrase, ...rotating],
            splitAtPerPhrase: [tHome("hero.line1").length, ...splitAt],
        }
    }, [tHome])

    return (
        <div className='relative flex h-full w-full flex-col'>
            <div className='flex flex-1 items-center justify-center px-6 text-center'>
                {isOpening ? (
                    <ConsultingBadge />
                ) : (
                    <div className='space-y-4'>
                        <h1 className='font-playfair font-bold text-4xl sm:text-5xl md:text-6xl text-white'>
                            <LoopingTypewriterText
                                phrases={heroPhrases}
                                speed={50}
                                holdDuration={3000}
                                fadeDuration={500}
                                splitAtPerPhrase={splitAtPerPhrase}
                                className='font-playfair text-transparent bg-gradient-to-r from-primary via-accent to-primary bg-clip-text'
                            />
                        </h1>
                        <div className='mx-auto flex w-[300px] max-w-full flex-col items-center justify-center gap-2'>
                            <button
                                type='button'
                                onClick={() =>
                                    void enterReading({ resumeLatest: false })
                                }
                                className='w-full rounded-full bg-gradient-to-r from-primary via-accent to-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-opacity hover:opacity-90'
                            >
                                {tHome("getStarted")}
                            </button>
                            {showLearnMore && (
                                <button
                                    type='button'
                                    className='mx-auto animate-fade-swap text-xs sm:text-sm uppercase tracking-widest text-white/70 hover:text-white transition-colors'
                                    onClick={() => {
                                        window.location.href = "/about"
                                    }}
                                >
                                    <span className='flex items-center gap-4'>
                                        <span className='h-px w-10 bg-white/30' />
                                        {tHome("learnMore")}
                                        <span className='h-px w-10 bg-white/30' />
                                    </span>
                                </button>
                            )}
                            {error && (
                                <p className='animate-fade-in text-xs text-red-400'>
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>
                )}
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
