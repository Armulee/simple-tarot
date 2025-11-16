"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useTranslations } from "next-intl"
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { StarsDialog } from "../star-consent"
import {
    formatAvailabilityCountdown,
    getAvailabilityCountdown,
    getAvailabilityLabel,
} from "@/lib/roadmap"

type CheckoutMode = "pack" | "subscribe"

type CheckoutProps = {
    mode: CheckoutMode
    packId?: string
    plan?: "monthly" | "annual"
    infinityTerm?: "month" | "year"
    customTrigger?: ReactNode
    availabilityLabel?: string
}

export function Checkout({ mode, customTrigger, availabilityLabel }: CheckoutProps) {
    const { user } = useAuth()
    const t = useTranslations("Checkout")
    const [open, setOpen] = useState(false)
    const stripeConfigured = Boolean(process.env.STRIPE_API_KEY)
    const [countdown, setCountdown] = useState(getAvailabilityCountdown())
    const fallbackLabel = useMemo(
        () => availabilityLabel ?? getAvailabilityLabel(),
        [availabilityLabel]
    )
    useEffect(() => {
        if (typeof window === "undefined") return
        const interval = window.setInterval(() => {
            setCountdown(getAvailabilityCountdown())
        }, 1000)
        return () => window.clearInterval(interval)
    }, [])
    const displayLabel =
        formatAvailabilityCountdown(countdown) ?? fallbackLabel ?? undefined

    if (!user) {
        const signinHref = `/signin?callbackUrl=${encodeURIComponent("/pricing")}`
        return customTrigger ? (
            <Link href={signinHref}>
                <span>{customTrigger}</span>
            </Link>
        ) : (
            <Link href={signinHref}>
                <Button className='w-full rounded-full bg-white text-black hover:brightness-90'>
                    {t("signInToSubscribe")}
                </Button>
            </Link>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger ? (
                    <span onClick={() => setOpen(true)}>{customTrigger}</span>
                ) : (
                    <Button
                        className='w-full rounded-full bg-white text-black hover:brightness-90'
                        onClick={() => setOpen(true)}
                    >
                        <div className='flex w-full flex-col items-center justify-center gap-1 text-center'>
                            <span>{mode === "pack" ? t("purchase") : t("subscribe")}</span>
                            {mode === "subscribe" && displayLabel && (
                                <span className='text-xs font-semibold text-black/70'>
                                    {displayLabel}
                                </span>
                            )}
                        </div>
                    </Button>
                )}
            </DialogTrigger>
            <StarsDialog className='relative space-y-4'>
                <DialogHeader className='space-y-2'>
                    <DialogTitle className='text-yellow-300 font-serif text-xl'>
                        {t("comingSoonTitle")}
                    </DialogTitle>
                    <DialogDescription className='text-white/85'>
                        {t("comingSoonDescription")}
                    </DialogDescription>
                </DialogHeader>
                <p className='text-sm text-white/70 leading-relaxed'>
                    {t("comingSoonHelper")}
                </p>
                <p className='text-xs text-white/60 leading-relaxed'>
                    {stripeConfigured
                        ? t("stripeReady")
                        : t("stripeMissing", {
                              countdown: displayLabel ?? t("countdownUnknown"),
                          })}
                </p>
                <DialogFooter>
                    <Button
                        className='w-full rounded-full bg-white text-black hover:brightness-95'
                        onClick={() => setOpen(false)}
                    >
                        {t("close")}
                    </Button>
                </DialogFooter>
            </StarsDialog>
        </Dialog>
    )
}
