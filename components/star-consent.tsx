"use client"

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
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
    undefined
)

export function useStarConsent() {
    const ctx = useContext(StarConsentContext)
    if (!ctx)
        throw new Error(
            "useStarConsent must be used within StarConsentProvider"
        )
    return ctx
}

export function StarConsentProvider({
    children,
}: {
    children: React.ReactNode
}) {
    const [open, setOpen] = useState(false)
    const [choice, setChoice] = useState<ConsentChoice>(null)
    const [understood, setUnderstood] = useState(false)

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
        if (open) setUnderstood(false)
    }, [open])

    useEffect(() => {
        // Force a re-render/event dispatch on the next tick to ensure listeners are ready
        const timer = setTimeout(() => {
            if (open) {
                window.dispatchEvent(
                    new CustomEvent("toaster-position-change", {
                        detail: { position: "top-center" },
                    })
                )
            } else {
                window.dispatchEvent(
                    new CustomEvent("toaster-position-change", {
                        detail: { position: "bottom-center" },
                    })
                )
            }
        }, 100)

        return () => clearTimeout(timer)
    }, [open])

    const consentPending =
        choice === null || choice === "declined"

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
                })
            )
        }
    }, [])

    const value = useMemo<StarConsentContextType>(
        () => ({ choice, open, show, accept }),
        [choice, open, show, accept]
    )

    const t = useTranslations("StarConsent")

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
                    className='relative overflow-hidden'
                    onInteractOutside={(e) => {
                        if (consentPending) e.preventDefault()
                    }}
                    onEscapeKeyDown={(e) => {
                        if (consentPending) e.preventDefault()
                    }}
                >
                    <DialogHeader>
                        <DialogTitle className='text-yellow-300 font-serif text-xl'>
                            {t("noticeHeading")}
                        </DialogTitle>
                        <DialogDescription asChild>
                            <p className='text-white/85 text-sm leading-relaxed'>
                                {t("noticeBody")}
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <label className='mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left text-sm text-white/90'>
                        <Checkbox
                            checked={understood}
                            onCheckedChange={(v) =>
                                setUnderstood(v === true)
                            }
                            className='mt-0.5 border-white/30 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-black data-[state=checked]:border-yellow-400'
                            aria-label={t("checkboxLabel")}
                        />
                        <span>{t("checkboxLabel")}</span>
                    </label>
                    <div className='mt-6 flex justify-end'>
                        <button
                            type='button'
                            disabled={!understood}
                            onClick={() => void accept()}
                            className='px-4 py-2 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)] disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none'
                        >
                            {t("continue")}
                        </button>
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
                className
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
