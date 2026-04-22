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
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Sparkle } from "lucide-react"
import { useLocale } from "next-intl"
import {
    COOKIE_PREFERENCES_EVENT,
    NOTICE_CONSENT_EVENT,
    DEFAULT_COOKIE_CONSENT_STATE,
    type CookieConsentState,
    type CookiePreferences,
    hasAnalyticsConsent,
    hasNoticeAcknowledgement,
    readCookieConsentState,
    readLegacyCombinedConsent,
    readNoticeAcknowledgement,
    writeCookieConsentState,
    writeNoticeAcknowledgement,
} from "@/lib/consent-storage"
import {
    getNoticeTranslations,
    isSupportedNoticeLanguage,
    loadNoticeTranslations,
    NOTICE_LANGUAGE_OPTIONS,
    type NoticeLanguage,
    type NoticeTranslations,
} from "@/lib/notice-translations"
import { AgeGateDialog } from "@/components/age-gate-dialog"
import {
    AGE_GATE_EVENT,
    buildAgeGateState,
    DEFAULT_AGE_GATE_STATE,
    type AgeGateBirthData,
    type AgeGateState,
    type UserAgeCategory,
    hasAgeGateAccess as readHasAgeGateAccess,
    readAgeGateState,
    writeAgeGateState,
} from "@/lib/age-gate-storage"

type NoticeTrigger = "question-input" | "star-balance" | "manual"

type StarConsentContextType = {
    noticeAcknowledged: boolean
    open: boolean
    cookieConsent: CookieConsentState
    ageGateState: AgeGateState
    hasAgeGateAccess: boolean
    userAgeCategory: UserAgeCategory
    isMinorUser: boolean
    cookieBannerVisible: boolean
    cookieTranslations: NoticeTranslations["cookies"]
    analyticsEnabled: boolean
    language: NoticeLanguage
    activeTrigger: NoticeTrigger | null
    show: (trigger?: NoticeTrigger) => void
    accept: () => Promise<void>
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

function CelestialIcon() {
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

function CornerAccents() {
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

export function StarConsentProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const locale = useLocale()
    const initialLanguage = isSupportedNoticeLanguage(locale) ? locale : "en"
    const [open, setOpen] = useState(false)
    const [ageGateOpen, setAgeGateOpen] = useState(false)
    const [noticeAcknowledged, setNoticeAcknowledged] = useState(false)
    const [cookieConsent, setCookieConsent] = useState<CookieConsentState>(
        DEFAULT_COOKIE_CONSENT_STATE,
    )
    const [ageGateState, setAgeGateState] = useState<AgeGateState>(
        DEFAULT_AGE_GATE_STATE,
    )
    const [understood, setUnderstood] = useState(false)
    const [scrolledToEnd, setScrolledToEnd] = useState(false)
    const [scrollHintVisible, setScrollHintVisible] = useState(false)
    const [language, setLanguage] = useState<NoticeLanguage>(initialLanguage)
    const [content, setContent] = useState<NoticeTranslations>(() =>
        getNoticeTranslations(initialLanguage),
    )
    const [isTranslating, setIsTranslating] = useState(false)
    const [activeTrigger, setActiveTrigger] = useState<NoticeTrigger | null>(
        null,
    )
    const scrollHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

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

    useEffect(() => {
        if (typeof window === "undefined") return

        let nextNoticeAcknowledged = readNoticeAcknowledgement()
        let nextCookieConsent = readCookieConsentState()
        const nextAgeGateState = readAgeGateState()
        const legacyConsent = readLegacyCombinedConsent()

        if (legacyConsent === "accepted") {
            if (!nextNoticeAcknowledged) {
                writeNoticeAcknowledgement(true)
                nextNoticeAcknowledged = true
            }
            if (!nextCookieConsent.decisionMade) {
                nextCookieConsent = buildCookieState({
                    essential: true,
                    analytics: true,
                    marketing: false,
                })
                writeCookieConsentState(nextCookieConsent)
            }
        }

        setNoticeAcknowledged(nextNoticeAcknowledged)
        setCookieConsent(nextCookieConsent)
        setAgeGateState(nextAgeGateState)
        if (
            nextNoticeAcknowledged &&
            nextAgeGateState.category !== "adult" &&
            nextAgeGateState.category !== "minor"
        ) {
            setAgeGateOpen(true)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        setIsTranslating(true)
        void loadNoticeTranslations(language)
            .then((translations) => {
                if (!cancelled) {
                    setContent(translations)
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsTranslating(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [language])

    useEffect(() => {
        if (open) {
            setUnderstood(false)
            setScrolledToEnd(false)
            setScrollHintVisible(false)
        }
        return () => {
            if (scrollHintTimer.current) clearTimeout(scrollHintTimer.current)
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const id = requestAnimationFrame(() => {
            requestAnimationFrame(() => checkScrollEnd())
        })
        return () => cancelAnimationFrame(id)
    }, [open, checkScrollEnd])

    useEffect(() => {
        if (!open) return
        const el = scrollRef.current
        if (!el || typeof ResizeObserver === "undefined") return
        const ro = new ResizeObserver(() => checkScrollEnd())
        ro.observe(el)
        return () => ro.disconnect()
    }, [open, checkScrollEnd])

    useEffect(() => {
        if (typeof window === "undefined") return
        const timer = window.setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent("toaster-position-change", {
                    detail: {
                        position: open ? "top-center" : "bottom-center",
                    },
                }),
            )
        }, 100)

        return () => window.clearTimeout(timer)
    }, [open])

    const flashScrollHint = useCallback(() => {
        if (scrolledToEnd) return
        setScrollHintVisible(true)
        if (scrollHintTimer.current) clearTimeout(scrollHintTimer.current)
        scrollHintTimer.current = setTimeout(
            () => setScrollHintVisible(false),
            2500,
        )
    }, [scrolledToEnd])

    const persistCookieConsent = useCallback((nextState: CookieConsentState) => {
        setCookieConsent(nextState)
        writeCookieConsentState(nextState)
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent(COOKIE_PREFERENCES_EVENT, {
                    detail: nextState,
                }),
            )
        }
    }, [])

    const persistAgeGateState = useCallback((nextState: AgeGateState) => {
        setAgeGateState(nextState)
        writeAgeGateState(nextState)
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent(AGE_GATE_EVENT, {
                    detail: nextState,
                }),
            )
        }
    }, [])

    const show = useCallback(
        (trigger: NoticeTrigger = "manual") => {
            if (ageGateState.category === "blocked") {
                setAgeGateOpen(true)
                return
            }
            if (!noticeAcknowledged) {
                setActiveTrigger(trigger)
                setOpen(true)
                return
            }
            if (!readHasAgeGateAccess()) {
                setAgeGateOpen(true)
            }
        },
        [ageGateState.category, noticeAcknowledged],
    )

    const accept = useCallback(async () => {
        writeNoticeAcknowledgement(true)
        setNoticeAcknowledged(true)
        setOpen(false)
        setActiveTrigger(null)
        setUnderstood(false)
        try {
            await fetch("/api/device/init", { method: "POST" })
        } catch {
            // Best-effort only.
        }
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent(NOTICE_CONSENT_EVENT, {
                    detail: { acknowledged: true },
                }),
            )
        }
        if (!readHasAgeGateAccess()) {
            setAgeGateOpen(true)
        }
    }, [])

    const handleAgeGateSubmit = useCallback(
        (birth: AgeGateBirthData) => {
            const nextState = buildAgeGateState(birth)
            persistAgeGateState(nextState)
            setAgeGateOpen(nextState.category === "blocked")
        },
        [persistAgeGateState],
    )

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
            noticeAcknowledged,
            open,
            cookieConsent,
            ageGateState,
            hasAgeGateAccess:
                ageGateState.category === "minor" ||
                ageGateState.category === "adult",
            userAgeCategory: ageGateState.category,
            isMinorUser: ageGateState.category === "minor",
            cookieBannerVisible: !cookieConsent.decisionMade,
            cookieTranslations: content.cookies,
            analyticsEnabled:
                cookieConsent.decisionMade && cookieConsent.preferences.analytics,
            language,
            activeTrigger,
            show,
            accept,
            acceptAllCookies,
            rejectAllCookies,
            saveCookiePreferences,
        }),
        [
            noticeAcknowledged,
            open,
            cookieConsent,
            ageGateState,
            content.cookies,
            language,
            activeTrigger,
            show,
            accept,
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

    const handleDialogOpenChange = (next: boolean) => {
        setOpen(next)
        if (!next) {
            setActiveTrigger(null)
        }
    }

    return (
        <StarConsentContext.Provider value={value}>
            {children}

            <Dialog open={open} onOpenChange={handleDialogOpenChange}>
                <StarsDialog
                    hideCloseButton
                    className='relative flex !h-[90dvh] !max-w-[540px] flex-col !overflow-hidden !rounded-[3px] !border-[0.5px] !border-[rgba(200,180,140,0.3)] !bg-[#13121f] !p-0 !shadow-none'
                >
                    <div className='relative z-10 flex min-h-0 h-full w-full flex-1 flex-col'>
                        <CornerAccents />

                        <div className='relative shrink-0 border-b border-[rgba(200,180,140,0.1)] px-6 pb-4 pt-4'>
                            <div className='mb-2 flex justify-center'>
                                <CelestialIcon />
                            </div>
                            <p className='text-center font-serif text-[10px] font-normal uppercase tracking-[0.28em] text-[rgba(200,180,140,0.6)]'>
                                {content.modal.eyebrow}
                            </p>
                            <DialogHeader className='mt-1 mb-3 text-center'>
                                <DialogTitle className='font-serif text-[26px] font-medium leading-tight text-[#e8e0d0]'>
                                    {content.modal.noticeHeading}
                                </DialogTitle>
                            </DialogHeader>
                        </div>

                        <div className='relative min-h-0 flex-1'>
                            <div
                                ref={scrollRef}
                                role='region'
                                aria-label={content.modal.consentScrollRegionLabel}
                                tabIndex={0}
                                onScroll={checkScrollEnd}
                                className='consent-scrollbar absolute inset-0 overscroll-y-contain px-6 py-5 pb-14'
                            >
                                <div className='mb-5 flex items-center gap-2.5'>
                                    <div className='h-px flex-1 bg-[rgba(200,180,140,0.16)]' />
                                    <div className='h-1 w-1 rounded-full bg-[rgba(200,180,140,0.32)]' />
                                    <div className='h-px flex-1 bg-[rgba(200,180,140,0.16)]' />
                                </div>

                                <div className='mb-6'>
                                    <div className='w-full max-w-[168px] sm:max-w-[190px]'>
                                        <label className='mb-1 block text-left text-[10px] uppercase tracking-[0.24em] text-[rgba(200,180,140,0.58)]'>
                                            {content.modal.languageLabel}
                                        </label>
                                        <Select
                                            value={language}
                                            onValueChange={(value) => {
                                                if (isSupportedNoticeLanguage(value)) {
                                                    setLanguage(value)
                                                }
                                            }}
                                        >
                                            <SelectTrigger className='h-9 w-full border-[rgba(200,180,140,0.18)] bg-[rgba(255,255,255,0.02)] text-[rgba(232,224,208,0.88)] [&_svg]:text-[rgba(232,224,208,0.62)]'>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className='border-[rgba(200,180,140,0.18)] bg-[#171522] text-[rgba(232,224,208,0.88)]'>
                                                {NOTICE_LANGUAGE_OPTIONS.map((option) => (
                                                    <SelectItem
                                                        key={option.value}
                                                        value={option.value}
                                                        className='focus:bg-[rgba(200,180,140,0.1)] focus:text-white'
                                                    >
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className='mt-1 min-h-[14px] text-left text-[10px] text-[rgba(232,224,208,0.4)]'>
                                            {isTranslating
                                                ? content.modal.languageLoadingLabel
                                                : null}
                                        </div>
                                    </div>
                                </div>

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {content.modal.experienceSectionLabel}
                                </p>
                                <DialogDescription asChild>
                                    <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                        {richText(content.modal.experienceBody, richB)}
                                    </p>
                                </DialogDescription>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {content.modal.liabilitySectionLabel}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {richText(content.modal.liabilityBody, richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {content.modal.religiousSectionLabel}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {richText(content.modal.religiousBody, richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {content.modal.ageSectionLabel}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {richText(content.modal.ageBody, richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {content.modal.safetySectionLabel}
                                </p>
                                <p className='mb-4 text-[13.5px] leading-[1.78] font-light text-[rgba(232,224,208,0.62)]'>
                                    {richText(content.modal.safetyBody, richB)}
                                </p>

                                <div className='my-5 h-px bg-[rgba(200,180,140,0.1)]' />

                                <p className='mb-2 text-md font-medium uppercase text-[rgba(200,180,140,0.48)]'>
                                    {content.modal.legalLinksLabel}
                                </p>
                                <div className='flex flex-wrap gap-3 pb-2 text-[13px] text-[rgba(232,224,208,0.72)]'>
                                    <Link
                                        href='/privacy-policy'
                                        className='underline decoration-dotted text-[rgba(200,180,140,0.72)] underline-offset-4'
                                    >
                                        {content.modal.privacyLink}
                                    </Link>
                                    <Link
                                        href='/terms-of-service'
                                        className='underline decoration-dotted text-[rgba(200,180,140,0.72)] underline-offset-4'
                                    >
                                        {content.modal.termsLink}
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
                                {content.modal.scrollToEndHint}
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
                                        onCheckedChange={(value) =>
                                            setUnderstood(value === true)
                                        }
                                        className='mt-0.5 h-[15px] w-[15px] shrink-0 rounded-[2px] border-[0.5px] border-[rgba(200,180,140,0.38)] data-[state=checked]:border-[rgba(200,180,140,0.68)] data-[state=checked]:bg-[rgba(200,180,140,0.2)] data-[state=checked]:text-[rgba(200,180,140,0.9)]'
                                        aria-label={content.modal.checkboxMain}
                                    />
                                    <div>
                                        <div className='mb-0.5 text-[13px] leading-normal font-normal text-[rgba(232,224,208,0.82)]'>
                                            {content.modal.checkboxMain}
                                        </div>
                                        <div className='text-[11.5px] leading-snug font-light text-[rgba(232,224,208,0.36)]'>
                                            {content.modal.checkboxSub}
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <button
                                type='button'
                                disabled={!understood}
                                onClick={() => void accept()}
                                className='w-full rounded-[2px] border-[0.5px] bg-transparent py-3.5 text-[11px] font-normal uppercase tracking-[0.18em] transition-all duration-300 disabled:cursor-not-allowed disabled:border-[rgba(200,180,140,0.2)] disabled:text-[rgba(232,224,208,0.32)] enabled:cursor-pointer enabled:border-[rgba(200,180,140,0.55)] enabled:text-[rgba(232,224,208,0.88)] enabled:hover:border-[rgba(200,180,140,0.8)] enabled:hover:bg-[rgba(200,180,140,0.07)] enabled:active:scale-[0.99]'
                            >
                                {content.modal.enterButton}
                            </button>
                        </footer>
                    </div>
                </StarsDialog>
            </Dialog>

            <AgeGateDialog
                open={ageGateOpen || ageGateState.category === "blocked"}
                blockedState={
                    ageGateState.category === "blocked" ? ageGateState : null
                }
                initialBirth={ageGateState.birth}
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
            {/* Beautiful ping orbs */}
            <Sparkle
                className='absolute top-16 left-16 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "0.5s" }}
            />
            <Sparkle
                className='absolute top-24 right-20 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "1.2s" }}
            />
            <Sparkle
                className='absolute top-40 left-1/3 w-2.5 h-2.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "2.8s" }}
            />
            <Sparkle
                className='absolute top-32 right-1/4 w-1.5 h-1.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "3.5s" }}
            />
            <Sparkle
                className='absolute bottom-20 left-20 w-3.5 h-3.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "1.8s" }}
            />
            <Sparkle
                className='absolute bottom-32 right-16 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "4.2s" }}
            />
            <Sparkle
                className='absolute bottom-16 right-1/3 w-2.5 h-2.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "2.1s" }}
            />
            <Sparkle
                className='absolute top-1/2 left-12 w-1.5 h-1.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "3.8s" }}
            />
            <Sparkle
                className='absolute top-1/3 right-12 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "0.9s" }}
            />
            <Sparkle
                className='absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                style={{ animationDelay: "4.7s" }}
            />

            {/* Deep-space stars background */}
            <div className='pointer-events-none absolute inset-0 opacity-40'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
            </div>
            {/* Golden aura behind dialog */}
            <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl animate-pulse' />
            <div
                className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px] animate-pulse'
                style={{ animationDelay: "0.8s" }}
            />

            {children}
        </DialogContent>
    )
}

function richText(
    text: string,
    components: {
        b: (chunks: React.ReactNode) => React.ReactNode
    },
) {
    const parts = text.split(/(<b>.*?<\/b>)/g)
    return parts.map((part, index) => {
        if (part.startsWith("<b>") && part.endsWith("</b>")) {
            return (
                <React.Fragment key={index}>
                    {components.b(part.slice(3, -4))}
                </React.Fragment>
            )
        }
        return <React.Fragment key={index}>{part}</React.Fragment>
    })
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
