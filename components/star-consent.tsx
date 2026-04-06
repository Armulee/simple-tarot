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
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Sparkle } from "lucide-react"
import { useTranslations } from "next-intl"

type ConsentChoice = "accepted" | "declined" | null

const CONSENT_KEY = "cookie-consent-v1"

type StarConsentContextType = {
    choice: ConsentChoice
    open: boolean
    show: () => void
    accept: () => void
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
        "pointer-events-none absolute w-[15px] h-[15px] border-[rgba(200,180,140,0.45)]"
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

export function StarConsentProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    const [choice, setChoice] = useState<ConsentChoice>(null)
    const [understood, setUnderstood] = useState(false)
    const [scrolledToEnd, setScrolledToEnd] = useState(false)
    const [scrollHintVisible, setScrollHintVisible] = useState(false)
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
        try {
            const saved = window.localStorage.getItem(CONSENT_KEY)
            if (saved === "accepted") {
                setChoice("accepted")
                setOpen(false)
            } else {
                if (saved === "declined") setChoice("declined")
                else setChoice(null)
                setOpen(true)
            }
        } catch {
            setChoice(null)
            setOpen(true)
        }
    }, [])

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

    const flashScrollHint = useCallback(() => {
        if (scrolledToEnd) return
        setScrollHintVisible(true)
        if (scrollHintTimer.current) clearTimeout(scrollHintTimer.current)
        scrollHintTimer.current = setTimeout(
            () => setScrollHintVisible(false),
            2500,
        )
    }, [scrolledToEnd])

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
        const timer = setTimeout(() => {
            if (open) {
                window.dispatchEvent(
                    new CustomEvent("toaster-position-change", {
                        detail: { position: "top-center" },
                    }),
                )
            } else {
                window.dispatchEvent(
                    new CustomEvent("toaster-position-change", {
                        detail: { position: "bottom-center" },
                    }),
                )
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [open])

    const consentPending = choice === null || choice === "declined"

    const show = useCallback(() => {
        setOpen(true)
    }, [])

    const accept = useCallback(async () => {
        try {
            window.localStorage.setItem(CONSENT_KEY, "accepted")
        } catch {}
        try {
            await fetch("/api/device/init", { method: "POST" })
        } catch {}
        setChoice("accepted")
        setOpen(false)
        setUnderstood(false)
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("cookie-consent-changed", {
                    detail: { choice: "accepted" },
                }),
            )
        }
    }, [])

    const value = useMemo<StarConsentContextType>(
        () => ({ choice, open, show, accept }),
        [choice, open, show, accept],
    )

    const t = useTranslations("StarConsent")

    const richB = {
        b: (chunks: React.ReactNode) => (
            <strong className='font-normal text-[rgba(232,224,208,0.9)]'>
                {chunks}
            </strong>
        ),
    }

    const handleDialogOpenChange = (next: boolean) => {
        if (!next && consentPending) return
        setOpen(next)
    }

    return (
        <StarConsentContext.Provider value={value}>
            {children}
            <Dialog open={open} onOpenChange={handleDialogOpenChange}>
                <StarsDialog
                    hideCloseButton
                    className='relative flex !max-w-[500px] flex-col !overflow-hidden !p-0 h-[90dvh] !border-[0.5px] !border-[rgba(200,180,140,0.3)] !rounded-[3px] !bg-[#13121f] !shadow-none'
                    onInteractOutside={(e) => {
                        if (consentPending) e.preventDefault()
                    }}
                    onEscapeKeyDown={(e) => {
                        if (consentPending) e.preventDefault()
                    }}
                >
                    <div className='relative z-10 flex min-h-0 w-full h-full flex-1 flex-col'>
                        <CornerAccents />

                        {/* Scrollable consent copy */}
                        <div className='relative h-[60dvh] shrink-0'>
                            <div
                                ref={scrollRef}
                                role='region'
                                aria-label={t("consentScrollRegionLabel")}
                                tabIndex={0}
                                onScroll={checkScrollEnd}
                                className='consent-scrollbar absolute inset-0 overscroll-y-contain border-b border-[rgba(200,180,140,0.1)] px-6 pt-4 pb-14'
                            >
                                {/* Icon */}
                                <div className='flex justify-center mb-2'>
                                    <CelestialIcon />
                                </div>

                                {/* Eyebrow */}
                                <p className='font-serif text-[10px] font-normal tracking-[0.28em] uppercase text-[rgba(200,180,140,0.6)] text-center'>
                                    {t("eyebrow")}
                                </p>

                                {/* Title */}
                                <DialogHeader className='mb-6'>
                                    <DialogTitle className='font-serif text-[26px] font-medium text-[#e8e0d0] text-center leading-tight'>
                                        {t("noticeHeading")}
                                    </DialogTitle>
                                </DialogHeader>

                                {/* Divider */}
                                <div className='flex items-center gap-2.5 mb-5'>
                                    <div className='flex-1 h-px bg-[rgba(200,180,140,0.16)]' />
                                    <div className='w-1 h-1 rounded-full bg-[rgba(200,180,140,0.32)]' />
                                    <div className='flex-1 h-px bg-[rgba(200,180,140,0.16)]' />
                                </div>

                                {/* Section 1: Experience */}
                                <p className='text-md font-medium uppercase text-[rgba(200,180,140,0.48)] mb-2'>
                                    {t("experienceSectionLabel")}
                                </p>
                                <DialogDescription asChild>
                                    <p className='text-[13.5px] font-light text-[rgba(232,224,208,0.62)] leading-[1.78] mb-4'>
                                        {t.rich("experienceBody", richB)}
                                    </p>
                                </DialogDescription>

                                {/* Section divider */}
                                <div className='h-px bg-[rgba(200,180,140,0.1)] my-5' />

                                {/* Section 2: Limitation of Liability */}
                                <p className='text-md font-medium uppercase text-[rgba(200,180,140,0.48)] mb-2'>
                                    {t("liabilitySectionLabel")}
                                </p>
                                <p className='text-[13.5px] font-light text-[rgba(232,224,208,0.62)] leading-[1.78] mb-4'>
                                    {t.rich("liabilityBody", richB)}
                                </p>

                                {/* Section divider */}
                                <div className='h-px bg-[rgba(200,180,140,0.1)] my-5' />

                                {/* Section 3: Religious & Cultural Sensitivity */}
                                <p className='text-md font-medium uppercase text-[rgba(200,180,140,0.48)] mb-2'>
                                    {t("religiousSectionLabel")}
                                </p>
                                <p className='text-[13.5px] font-light text-[rgba(232,224,208,0.62)] leading-[1.78] mb-4'>
                                    {t.rich("religiousBody", richB)}
                                </p>

                                {/* Section divider */}
                                <div className='h-px bg-[rgba(200,180,140,0.1)] my-5' />

                                {/* Section 4: Cookies */}
                                <p className='text-md font-medium uppercase text-[rgba(200,180,140,0.48)] mb-2'>
                                    {t("cookieSectionLabel")}
                                </p>
                                <p className='text-[13.5px] font-light text-[rgba(232,224,208,0.62)] leading-[1.78] pb-1'>
                                    {t.rich("cookieBody", richB)}
                                    <Link
                                        href='/privacy-policy'
                                        className='underline decoration-dotted text-[rgba(200,180,140,0.45)]'
                                    >
                                        {t("privacyLink")}
                                    </Link>
                                </p>
                            </div>

                            {/* Gradient fade overlay */}
                            <div
                                className={cn(
                                    "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13121f] via-[#13121f]/70 to-transparent transition-opacity duration-300",
                                    scrolledToEnd ? "opacity-0" : "opacity-100",
                                )}
                            />
                        </div>

                        {/* Fixed footer: checkbox + proceed */}
                        <footer className='fixed bottom-0 left-0 right-0 shrink-0 bg-[#13121f]/95 px-6 pb-4 pt-3 backdrop-blur-sm'>
                            {/* Inline toast */}
                            <div
                                role='alert'
                                className={cn(
                                    "absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-[0.5px] border-[rgba(200,180,140,0.25)] bg-[#1a1826] px-4 py-1.5 text-[10.5px] text-[rgba(200,180,140,0.7)] shadow-lg transition-all duration-300",
                                    scrollHintVisible
                                        ? "translate-y-0 opacity-100"
                                        : "translate-y-2 opacity-0 pointer-events-none",
                                )}
                            >
                                {t("scrollToEndHint")}
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
                                        "flex items-start gap-3 rounded-[2px] border-[0.5px] px-4 py-3 select-none transition-colors duration-200",
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
                                        onCheckedChange={(v) =>
                                            setUnderstood(v === true)
                                        }
                                        className='mt-0.5 h-[15px] w-[15px] shrink-0 rounded-[2px] border-[0.5px] border-[rgba(200,180,140,0.38)] data-[state=checked]:bg-[rgba(200,180,140,0.2)] data-[state=checked]:border-[rgba(200,180,140,0.68)] data-[state=checked]:text-[rgba(200,180,140,0.9)]'
                                        aria-label={t("checkboxMain")}
                                    />
                                    <div>
                                        <div className='text-[13px] font-normal text-[rgba(232,224,208,0.82)] leading-normal mb-0.5'>
                                            {t("checkboxMain")}
                                        </div>
                                        <div className='text-[11.5px] font-light text-[rgba(232,224,208,0.36)] leading-snug'>
                                            {t("checkboxSub")}
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <button
                                type='button'
                                disabled={!understood}
                                onClick={() => void accept()}
                                className='w-full py-3.5 bg-transparent border-[0.5px] rounded-[2px] text-[11px] font-normal tracking-[0.18em] uppercase transition-all duration-300 disabled:border-[rgba(200,180,140,0.2)] disabled:text-[rgba(232,224,208,0.32)] disabled:cursor-not-allowed enabled:border-[rgba(200,180,140,0.55)] enabled:text-[rgba(232,224,208,0.88)] enabled:cursor-pointer enabled:hover:bg-[rgba(200,180,140,0.07)] enabled:hover:border-[rgba(200,180,140,0.8)] enabled:active:scale-[0.99]'
                            >
                                {t("enterButton")}
                            </button>
                        </footer>
                    </div>
                </StarsDialog>
            </Dialog>
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

export function hasCookieConsent(): boolean {
    if (typeof window === "undefined") return false
    try {
        return window.localStorage.getItem(CONSENT_KEY) === "accepted"
    } catch {
        return false
    }
}
