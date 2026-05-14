"use client"

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { Sparkle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import {
    COOKIE_PREFERENCES_EVENT,
    DEFAULT_COOKIE_CONSENT_STATE,
    type CookieConsentState,
    type CookiePreferences,
    hasAnalyticsConsent,
    hasNoticeAcknowledgement,
    readCookieConsentState,
    readLegacyCombinedConsent,
    writeCookieConsentState,
} from "@/lib/consent-storage"
import { AgeGateDialog } from "@/components/age-gate-dialog"
import {
    AGE_GATE_EVENT,
    DEFAULT_AGE_GATE_STATE,
    buildAgeGateState,
    calculateAgeFromBirthDate,
    type AgeGateBirthData,
    type AgeGateState,
    type UserAgeCategory,
    hasAgeGateAccess as readHasAgeGateAccess,
    writeAgeGateState,
} from "@/lib/age-gate-storage"
import {
    BlockedBirthdate,
    clearBlockedBirthdate,
    isStillUnderThirteen,
    readBlockedBirthdate,
    writeBlockedBirthdate,
} from "@/lib/blocked-birthdate-storage"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { supabase } from "@/lib/supabase"

type OnboardingPhase = "idle" | "age" | "consent" | "saving" | "blocked"

type StarConsentContextType = {
    open: boolean
    cookieConsent: CookieConsentState
    ageGateState: AgeGateState
    hasAgeGateAccess: boolean
    userAgeCategory: UserAgeCategory
    isMinorUser: boolean
    cookieBannerVisible: boolean
    analyticsEnabled: boolean
    acceptAllCookies: () => void
    rejectAllCookies: () => void
    saveCookiePreferences: (preferences: CookiePreferences) => void
}

const StarConsentContext = createContext<StarConsentContextType | undefined>(
    undefined,
)

export function useStarConsent() {
    const ctx = useContext(StarConsentContext)
    if (!ctx)
        throw new Error(
            "useStarConsent must be used within StarConsentProvider",
        )
    return ctx
}

export function CelestialIcon() {
    return (
        <svg width='40' height='40' viewBox='0 0 40 40' fill='none' aria-hidden>
            <circle
                cx='20'
                cy='20'
                r='14'
                stroke='rgba(200,180,140,.3)'
                strokeWidth='.65'
                strokeDasharray='2 2.8'
            />
            <circle
                cx='20'
                cy='20'
                r='9'
                stroke='rgba(200,180,140,.18)'
                strokeWidth='.5'
            />
            <path
                d='M20 8.5L21.6 13.5H27L22.7 16.5L24.4 21.5L20 18.5L15.6 21.5L17.3 16.5L13 13.5L18.4 13.5Z'
                fill='rgba(200,180,140,.48)'
            />
            <circle cx='20' cy='30.5' r='1.3' fill='rgba(200,180,140,.28)' />
            <circle cx='9.5' cy='20' r='1.3' fill='rgba(200,180,140,.28)' />
            <circle cx='30.5' cy='20' r='1.3' fill='rgba(200,180,140,.28)' />
        </svg>
    )
}

export function CornerAccents() {
    const base =
        "pointer-events-none absolute h-[15px] w-[15px] border-[rgba(200,180,140,0.45)]"
    return (
        <>
            <div className={cn(base, "-top-px -left-px border-t border-l")} />
            <div className={cn(base, "-top-px -right-px border-t border-r")} />
            <div
                className={cn(base, "-bottom-px -left-px border-b border-l")}
            />
            <div
                className={cn(base, "-bottom-px -right-px border-b border-r")}
            />
        </>
    )
}

function buildCookieState(preferences: CookiePreferences): CookieConsentState {
    return {
        decisionMade: true,
        preferences: {
            essential: true,
            analytics: preferences.analytics,
            marketing: preferences.marketing,
        },
        updatedAt: Date.now(),
    }
}

function profileToAgeGateBirth(profile: {
    birth_date: string | null
    birth_time: string | null
    birth_place: string | null
} | null): AgeGateBirthData | null {
    if (!profile?.birth_date) return null
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(profile.birth_date)
    if (!dateMatch) return null
    const year = Number.parseInt(dateMatch[1], 10)
    const month = Number.parseInt(dateMatch[2], 10)
    const day = Number.parseInt(dateMatch[3], 10)
    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
    ) {
        return null
    }
    let hour = 0
    let minute = 0
    if (profile.birth_time) {
        const timeMatch = /^(\d{2}):(\d{2})/.exec(profile.birth_time)
        if (timeMatch) {
            hour = Number.parseInt(timeMatch[1], 10)
            minute = Number.parseInt(timeMatch[2], 10)
        }
    }
    return {
        year,
        month,
        day,
        hour: Number.isFinite(hour) ? hour : 0,
        minute: Number.isFinite(minute) ? minute : 0,
        country: null,
        state: null,
        lat: null,
        lng: null,
        timezone: null,
    }
}

function blockedRecordToAgeGateState(
    record: BlockedBirthdate | null,
): AgeGateState | null {
    if (!record) return null
    const birth: AgeGateBirthData = {
        year: record.year,
        month: record.month,
        day: record.day,
        hour: 0,
        minute: 0,
        country: null,
        state: null,
        lat: null,
        lng: null,
        timezone: null,
    }
    return {
        category: "blocked",
        age: calculateAgeFromBirthDate(birth),
        birth,
        checkedAt: record.storedAt,
    }
}

function birthDataToBirthDateIso(birth: AgeGateBirthData): string {
    const mm = String(birth.month).padStart(2, "0")
    const dd = String(birth.day).padStart(2, "0")
    return `${birth.year}-${mm}-${dd}`
}

function birthDataToBirthTimeIso(birth: AgeGateBirthData): string | null {
    if (!Number.isFinite(birth.hour) && !Number.isFinite(birth.minute)) {
        return null
    }
    if ((birth.hour ?? 0) === 0 && (birth.minute ?? 0) === 0) {
        return null
    }
    const hh = String(birth.hour).padStart(2, "0")
    const mn = String(birth.minute).padStart(2, "0")
    return `${hh}:${mn}:00`
}

function birthDataToBirthPlace(birth: AgeGateBirthData): string | null {
    const parts = [birth.country, birth.state]
        .map((v) => (v && v.trim()) || null)
        .filter(Boolean) as string[]
    return parts.length ? parts.join(", ") : null
}

export function StarConsentProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const tModal = useTranslations("StarConsent.modal")
    const tAgeGate = useTranslations("StarConsent.ageGate")
    const tProfile = useTranslations("Profile")
    const tLanguages = useTranslations("Languages")
    const locale = useLocale()
    const pathname = usePathname()
    const router = useRouter()

    const { user } = useAuth()
    const { profile, refreshProfile } = useProfile()

    const [phase, setPhase] = useState<OnboardingPhase>("idle")
    const [pendingBirth, setPendingBirth] = useState<AgeGateBirthData | null>(
        null,
    )
    const [blockedRecord, setBlockedRecord] = useState<BlockedBirthdate | null>(
        null,
    )
    const [cookieConsent, setCookieConsent] = useState<CookieConsentState>(
        DEFAULT_COOKIE_CONSENT_STATE,
    )
    const [ageGateState, setAgeGateState] = useState<AgeGateState>(
        DEFAULT_AGE_GATE_STATE,
    )
    const [understood, setUnderstood] = useState(false)
    const [scrolledToEnd, setScrolledToEnd] = useState(false)
    const [scrollHintVisible, setScrollHintVisible] = useState(false)
    const [isSwitchingLocale, setIsSwitchingLocale] = useState(false)
    const scrollHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const handledUnderThirteenForRef = useRef<string | null>(null)
    const onboardingStartedForRef = useRef<string | null>(null)

    const consentOpen = phase === "consent" || phase === "saving"
    const ageOpen = phase === "age"
    const blockedOpen = phase === "blocked"

    const checkScrollEnd = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const { scrollTop, scrollHeight, clientHeight } = el
        const threshold = 12
        const atEnd =
            scrollHeight <= clientHeight + threshold ||
            scrollTop + clientHeight >= scrollHeight - threshold
        setScrolledToEnd(atEnd)
        if (atEnd) setScrollHintVisible(false)
    }, [])

    // Cookies banner state (independent of auth).
    useEffect(() => {
        if (typeof window === "undefined") return
        let nextCookieConsent = readCookieConsentState()
        const legacyConsent = readLegacyCombinedConsent()
        if (legacyConsent === "accepted" && !nextCookieConsent.decisionMade) {
            nextCookieConsent = buildCookieState({
                essential: true,
                analytics: true,
                marketing: false,
            })
            writeCookieConsentState(nextCookieConsent)
        }
        setCookieConsent(nextCookieConsent)
    }, [])

    // Mirror profile.birth_date into the legacy ageGateState exposed via the
    // context so prefill consumers (e.g. home page) keep working unchanged.
    useEffect(() => {
        const birth = profileToAgeGateBirth(profile)
        if (birth) {
            const next = buildAgeGateState(birth)
            setAgeGateState(next)
            try {
                writeAgeGateState(next)
            } catch {
                // best-effort
            }
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent(AGE_GATE_EVENT, { detail: next }),
                )
            }
        } else {
            setAgeGateState(DEFAULT_AGE_GATE_STATE)
        }
    }, [profile])

    const handleUnderThirteen = useCallback(
        async (birth: { year: number; month: number; day: number }) => {
            const userId = user?.id ?? "anon"
            if (handledUnderThirteenForRef.current === userId) return
            handledUnderThirteenForRef.current = userId

            writeBlockedBirthdate(birth)
            const record = readBlockedBirthdate()
            if (record) setBlockedRecord(record)

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                if (session) {
                    const res = await fetch("/api/account/delete", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                        },
                    })
                    if (!res.ok) {
                        toast.error(
                            tAgeGate("accountDeletionFailedToast"),
                        )
                    }
                }
            } catch (err) {
                console.error("Account deletion failed:", err)
                toast.error(tAgeGate("accountDeletionFailedToast"))
            }

            try {
                await supabase.auth.signOut()
            } catch {
                // ignore
            }

            toast.error(tAgeGate("accountDeletedToast"))
            setPhase("blocked")
        },
        [tAgeGate, user?.id],
    )

    // Drive the onboarding phase from auth + profile + localStorage ban.
    useEffect(() => {
        const record = readBlockedBirthdate()

        if (record && isStillUnderThirteen(record)) {
            setBlockedRecord(record)
            if (user) {
                void handleUnderThirteen(record)
            } else {
                setPhase("blocked")
            }
            return
        }

        if (record) {
            clearBlockedBirthdate()
            setBlockedRecord(null)
        }

        if (!user) {
            handledUnderThirteenForRef.current = null
            onboardingStartedForRef.current = null
            setPhase((prev) => (prev === "blocked" ? "idle" : prev))
            return
        }

        if (!profile) return

        if (profile.consented_at) {
            onboardingStartedForRef.current = null
            setPhase("idle")
            return
        }

        if (onboardingStartedForRef.current === user.id) return

        if (profile.birth_date) {
            const legacyBirth = profileToAgeGateBirth(profile)
            if (legacyBirth) {
                const age = calculateAgeFromBirthDate(legacyBirth)
                if (age < 13) {
                    onboardingStartedForRef.current = user.id
                    void handleUnderThirteen(legacyBirth)
                    return
                }
                onboardingStartedForRef.current = user.id
                setPendingBirth(null)
                setPhase("consent")
                return
            }
        }

        onboardingStartedForRef.current = user.id
        setPendingBirth(null)
        setPhase("age")
    }, [user, profile, handleUnderThirteen])

    // Refresh-controls when consent dialog opens.
    useEffect(() => {
        if (consentOpen) {
            setUnderstood(false)
            setScrolledToEnd(false)
            setScrollHintVisible(false)
        }
        return () => {
            if (scrollHintTimer.current) clearTimeout(scrollHintTimer.current)
        }
    }, [consentOpen])

    useEffect(() => {
        if (!consentOpen) return
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => checkScrollEnd())
        })
        return () => cancelAnimationFrame(id)
    }, [consentOpen, checkScrollEnd])

    useEffect(() => {
        if (!consentOpen) return
        const el = scrollRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(() => checkScrollEnd())
        ro.observe(el)
        return () => ro.disconnect()
    }, [consentOpen, checkScrollEnd])

    useEffect(() => {
        if (typeof window === "undefined") return
        const timer = window.setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent("toaster-position-change", {
                    detail: {
                        position: consentOpen
                            ? "top-center"
                            : "bottom-center",
                    },
                }),
            )
        }, 100)

        return () => window.clearTimeout(timer)
    }, [consentOpen])

    const flashScrollHint = useCallback(() => {
        if (scrolledToEnd) return
        setScrollHintVisible(true)
        if (scrollHintTimer.current) clearTimeout(scrollHintTimer.current)
        scrollHintTimer.current = setTimeout(
            () => setScrollHintVisible(false),
            2500,
        )
    }, [scrolledToEnd])

    const persistCookieConsent = useCallback(
        (nextState: CookieConsentState) => {
            setCookieConsent(nextState)
            writeCookieConsentState(nextState)
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent(COOKIE_PREFERENCES_EVENT, {
                        detail: nextState,
                    }),
                )
            }
        },
        [],
    )

    const handleAgeGateSubmit = useCallback(
        (birth: AgeGateBirthData) => {
            const nextState = buildAgeGateState(birth)
            if (nextState.category === "blocked") {
                void handleUnderThirteen(birth)
                return
            }
            setPendingBirth(birth)
            setAgeGateState(nextState)
            setPhase("consent")
        },
        [handleUnderThirteen],
    )

    const accept = useCallback(async () => {
        setPhase("saving")
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) {
                setPhase("idle")
                return
            }

            const body: Record<string, unknown> = { consentedAt: true }

            // Preserve existing profile fields so the upsert doesn't null them out.
            if (profile?.name) body.name = profile.name
            if (profile?.bio) body.bio = profile.bio
            if (profile?.job) body.job = profile.job
            if (profile?.gender) body.gender = profile.gender

            if (pendingBirth) {
                body.birthDate = birthDataToBirthDateIso(pendingBirth)
                const time = birthDataToBirthTimeIso(pendingBirth)
                if (time) body.birthTime = time
                const place = birthDataToBirthPlace(pendingBirth)
                if (place) body.birthPlace = place
            } else {
                if (profile?.birth_date) body.birthDate = profile.birth_date
                if (profile?.birth_time) body.birthTime = profile.birth_time
                if (profile?.birth_place) body.birthPlace = profile.birth_place
            }

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                if (data?.error === "under_13" && pendingBirth) {
                    await handleUnderThirteen(pendingBirth)
                    return
                }
                toast.error(tProfile("updateFailed"))
                setPhase("consent")
                return
            }

            await refreshProfile()
            setPendingBirth(null)
            setPhase("idle")
        } catch (err) {
            console.error("Onboarding save error:", err)
            toast.error(tProfile("updateFailed"))
            setPhase("consent")
        }
    }, [pendingBirth, profile, refreshProfile, handleUnderThirteen, tProfile])

    const acceptAllCookies = useCallback(() => {
        persistCookieConsent(
            buildCookieState({
                essential: true,
                analytics: true,
                marketing: true,
            }),
        )
    }, [persistCookieConsent])

    const rejectAllCookies = useCallback(() => {
        persistCookieConsent(
            buildCookieState({
                essential: true,
                analytics: false,
                marketing: false,
            }),
        )
    }, [persistCookieConsent])

    const saveCookiePreferences = useCallback(
        (preferences: CookiePreferences) => {
            persistCookieConsent(buildCookieState(preferences))
        },
        [persistCookieConsent],
    )

    const value = useMemo<StarConsentContextType>(
        () => ({
            open: consentOpen,
            cookieConsent,
            ageGateState,
            hasAgeGateAccess:
                ageGateState.category === "minor" ||
                ageGateState.category === "adult",
            userAgeCategory: ageGateState.category,
            isMinorUser: ageGateState.category === "minor",
            cookieBannerVisible: !cookieConsent.decisionMade,
            analyticsEnabled:
                cookieConsent.decisionMade &&
                cookieConsent.preferences.analytics,
            acceptAllCookies,
            rejectAllCookies,
            saveCookiePreferences,
        }),
        [
            consentOpen,
            cookieConsent,
            ageGateState,
            acceptAllCookies,
            rejectAllCookies,
            saveCookiePreferences,
        ],
    )

    const richB = {
        b: (chunks: React.ReactNode) => (
            <strong className='font-normal text-[rgba(232,224,208,0.9)]'>
                {chunks}
            </strong>
        ),
    }

    const handleLocaleChange = (nextLocale: string) => {
        if (nextLocale === locale) return
        if (
            !routing.locales.includes(
                nextLocale as (typeof routing.locales)[number],
            )
        )
            return

        setIsSwitchingLocale(true)
        router.replace(pathname, {
            locale: nextLocale as (typeof routing.locales)[number],
        })
    }

    const blockedAgeState = blockedRecordToAgeGateState(blockedRecord)
    const isSaving = phase === "saving"

    return (
        <StarConsentContext.Provider value={value}>
            {children}

            <Dialog open={consentOpen}>
                <StarsDialog
                    hideCloseButton
                    onEscapeKeyDown={(event) => event.preventDefault()}
                    onPointerDownOutside={(event) => event.preventDefault()}
                    onInteractOutside={(event) => event.preventDefault()}
                    className='relative flex !h-[90dvh] !max-w-[540px] flex-col !overflow-hidden !rounded-[3px] !border-[0.5px] !border-[rgba(200,180,140,0.3)] !bg-[#13121f] !p-0 !shadow-none'
                >
                    <div className='relative z-10 flex min-h-0 h-full w-full flex-1 flex-col'>
                        <CornerAccents />

                        <div className='relative shrink-0 border-b border-[rgba(200,180,140,0.1)] px-6 pb-4 pt-4'>
                            <div className='mb-2 flex justify-center'>
                                <CelestialIcon />
                            </div>
                            <p className='text-center font-serif text-[10px] font-normal uppercase tracking-[0.28em] text-[rgba(200,180,140,0.6)]'>
                                {tModal("eyebrow")}
                            </p>
                            <DialogHeader className='mt-1 mb-3 text-center'>
                                <DialogTitle className='font-serif text-[26px] font-medium leading-tight text-[#e8e0d0]'>
                                    {tModal("noticeHeading")}
                                </DialogTitle>
                            </DialogHeader>
                        </div>

                        <div className='relative min-h-0 flex-1'>
                            <div
                                ref={scrollRef}
                                role='region'
                                aria-label={tModal("consentScrollRegionLabel")}
                                tabIndex={0}
                                onScroll={checkScrollEnd}
                                className='consent-scrollbar absolute inset-0 overscroll-y-contain px-6 py-5 pb-14'
                            >
                                <div className='mb-6'>
                                    <div className='w-full max-w-[168px] sm:max-w-[190px]'>
                                        <label className='mb-1 block text-left text-[10px] uppercase tracking-[0.24em] text-[rgba(200,180,140,0.58)]'>
                                            {tModal("languageLabel")}
                                        </label>
                                        <Select
                                            value={locale}
                                            onValueChange={handleLocaleChange}
                                            disabled={isSwitchingLocale}
                                        >
                                            <SelectTrigger className='h-9 w-full border-[rgba(200,180,140,0.18)] bg-[rgba(255,255,255,0.02)] text-[rgba(232,224,208,0.88)] [&_svg]:text-[rgba(232,224,208,0.62)]'>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className='border-[rgba(200,180,140,0.18)] bg-[#171522] text-[rgba(232,224,208,0.88)]'>
                                                {routing.locales.map((availableLocale) => (
                                                    <SelectItem
                                                        key={availableLocale}
                                                        value={availableLocale}
                                                        className='focus:bg-[rgba(200,180,140,0.1)] focus:text-white'
                                                    >
                                                        {tLanguages(
                                                            availableLocale,
                                                        )}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className='mt-1 min-h-[14px] text-left text-[10px] text-[rgba(232,224,208,0.4)]'>
                                            {isSwitchingLocale
                                                ? tModal("languageLoadingLabel")
                                                : null}
                                        </div>
                                    </div>
                                </div>

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {tModal("experienceSectionLabel")}
                                </p>
                                <DialogDescription asChild>
                                    <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                        {tModal.rich("experienceBody", richB)}
                                    </p>
                                </DialogDescription>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {tModal("liabilitySectionLabel")}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {tModal.rich("liabilityBody", richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {tModal("religiousSectionLabel")}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {tModal.rich("religiousBody", richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {tModal("ageSectionLabel")}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {tModal.rich("ageBody", richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {tModal("safetySectionLabel")}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {tModal.rich("safetyBody", richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {tModal("legalLinksLabel")}
                                </p>
                                <div className='flex flex-wrap gap-3 pb-2 text-[13px] text-[rgba(232,224,208,0.72)]'>
                                    <Link
                                        href='/privacy-policy'
                                        className='underline decoration-dotted text-[rgba(200,180,140,0.72)] underline-offset-4'
                                    >
                                        {tModal("privacyLink")}
                                    </Link>
                                    <Link
                                        href='/terms-of-service'
                                        className='underline decoration-dotted text-[rgba(200,180,140,0.72)] underline-offset-4'
                                    >
                                        {tModal("termsLink")}
                                    </Link>
                                </div>
                            </div>

                            <div
                                className={cn(
                                    "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13121f] via-[#13121f]/70 to-transparent transition-opacity duration-300",
                                    scrolledToEnd ? "opacity-0" : "opacity-100",
                                )}
                            />
                        </div>

                        <footer className='relative shrink-0 border-t border-[rgba(200,180,140,0.1)] bg-[#13121f]/95 px-6 pb-4 pt-3 backdrop-blur-sm'>
                            <div
                                role='alert'
                                className={cn(
                                    "absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-[0.5px] border-[rgba(200,180,140,0.25)] bg-[#1a1826] px-4 py-1.5 text-[10.5px] text-[rgba(200,180,140,0.7)] shadow-lg transition-all duration-300",
                                    scrollHintVisible
                                        ? "translate-y-0 opacity-100"
                                        : "pointer-events-none translate-y-2 opacity-0",
                                )}
                            >
                                {tModal("scrollToEndHint")}
                            </div>

                            <div
                                className='mb-4'
                                onClick={
                                    !scrolledToEnd && !understood
                                        ? flashScrollHint
                                        : undefined
                                }
                            >
                                <label
                                    className={cn(
                                        "flex select-none items-start gap-3 rounded-[2px] border-[0.5px] px-4 py-3 transition-colors duration-200",
                                        !scrolledToEnd &&
                                            !understood &&
                                            "cursor-not-allowed opacity-60",
                                        (scrolledToEnd || understood) &&
                                            "cursor-pointer hover:border-[rgba(200,180,140,0.38)]",
                                        understood
                                            ? "border-[rgba(200,180,140,0.44)] bg-[rgba(200,180,140,0.04)]"
                                            : "border-[rgba(200,180,140,0.17)]",
                                    )}
                                >
                                    <Checkbox
                                        checked={understood}
                                        disabled={!scrolledToEnd && !understood}
                                        onCheckedChange={(checkedValue) =>
                                            setUnderstood(checkedValue === true)
                                        }
                                        className='mt-0.5 h-[15px] w-[15px] shrink-0 rounded-[2px] border-[0.5px] border-[rgba(200,180,140,0.38)] data-[state=checked]:border-[rgba(200,180,140,0.68)] data-[state=checked]:bg-[rgba(200,180,140,0.2)] data-[state=checked]:text-[rgba(200,180,140,0.9)]'
                                        aria-label={tModal("checkboxMain")}
                                    />
                                    <div>
                                        <div className='mb-0.5 text-[13px] leading-normal font-normal text-[rgba(232,224,208,0.82)]'>
                                            {tModal("checkboxMain")}
                                        </div>
                                        <div className='text-[11.5px] leading-snug font-light text-[rgba(232,224,208,0.36)]'>
                                            {tModal("checkboxSub")}
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <button
                                type='button'
                                disabled={!understood || isSaving}
                                onClick={() => void accept()}
                                className='w-full rounded-[2px] border-[0.5px] bg-transparent py-3.5 text-[11px] font-normal uppercase tracking-[0.18em] transition-all duration-300 disabled:cursor-not-allowed disabled:border-[rgba(200,180,140,0.2)] disabled:text-[rgba(232,224,208,0.32)] enabled:cursor-pointer enabled:border-[rgba(200,180,140,0.55)] enabled:text-[rgba(232,224,208,0.88)] enabled:hover:border-[rgba(200,180,140,0.8)] enabled:hover:bg-[rgba(200,180,140,0.07)] enabled:active:scale-[0.99]'
                            >
                                {isSaving
                                    ? tProfile("saving")
                                    : tModal("enterButton")}
                            </button>
                        </footer>
                    </div>
                </StarsDialog>
            </Dialog>

            <AgeGateDialog
                open={ageOpen || blockedOpen}
                blockedState={blockedOpen ? blockedAgeState : null}
                initialBirth={pendingBirth}
                onSubmit={handleAgeGateSubmit}
            />
        </StarConsentContext.Provider>
    )
}

export function StarsDialog({
    children,
    className,
    hideCloseButton,
    ...contentProps
}: React.ComponentProps<typeof DialogContent>) {
    return (
        <DialogContent
            hideCloseButton={hideCloseButton}
            className={cn(
                "max-w-lg w-[92vw] border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]",
                className,
            )}
            {...contentProps}
        >
            <div className='pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden'>
                <Sparkle
                    className='absolute top-12 left-16 h-3 w-3 rounded-full fill-yellow-400 opacity-45 animate-ping'
                    style={{ animationDelay: "0.5s" }}
                />
                <Sparkle
                    className='absolute top-20 right-20 h-2 w-2 rounded-full fill-yellow-400 opacity-40 animate-ping'
                    style={{ animationDelay: "1.2s" }}
                />
                <Sparkle
                    className='absolute top-10 left-1/3 h-2.5 w-2.5 rounded-full fill-yellow-400 opacity-35 animate-ping'
                    style={{ animationDelay: "2.8s" }}
                />
                <Sparkle
                    className='absolute top-24 right-1/4 h-1.5 w-1.5 rounded-full fill-yellow-400 opacity-40 animate-ping'
                    style={{ animationDelay: "3.5s" }}
                />
            </div>
            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden'>
                <Sparkle
                    className='absolute bottom-12 left-20 h-3.5 w-3.5 rounded-full fill-yellow-400 opacity-40 animate-ping'
                    style={{ animationDelay: "1.8s" }}
                />
                <Sparkle
                    className='absolute bottom-20 right-16 h-2 w-2 rounded-full fill-yellow-400 opacity-35 animate-ping'
                    style={{ animationDelay: "4.2s" }}
                />
                <Sparkle
                    className='absolute bottom-10 right-1/3 h-2.5 w-2.5 rounded-full fill-yellow-400 opacity-40 animate-ping'
                    style={{ animationDelay: "2.1s" }}
                />
                <Sparkle
                    className='absolute bottom-24 left-1/4 h-2 w-2 rounded-full fill-yellow-400 opacity-35 animate-ping'
                    style={{ animationDelay: "4.7s" }}
                />
            </div>

            <div className='pointer-events-none absolute inset-0 opacity-40'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
            </div>
            <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl animate-pulse' />
            <div
                className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px] animate-pulse'
                style={{ animationDelay: "0.8s" }}
            />

            {children}
        </DialogContent>
    )
}

export function hasNoticeConsent(): boolean {
    return hasNoticeAcknowledgement()
}

export function hasFullConsentAccess(): boolean {
    return hasNoticeAcknowledgement() && readHasAgeGateAccess()
}

export function hasCookieConsent(): boolean {
    return hasAnalyticsConsent()
}
