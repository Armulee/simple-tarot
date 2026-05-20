"use client"

import { Crown, Loader2, Sparkles, Star } from "lucide-react"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useStars } from "@/contexts/stars-context"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import { purchaseCalendarUnlock } from "@/lib/calendar/unlocks-client"
import { toLocalIsoDate } from "@/lib/calendar-helper"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { getPlanPrice } from "@/lib/payments/subscription-plans"
import { formatFullDate } from "./utils"

const STAR_COST = 1

export function LockedPaywallDialog({
    open,
    onOpenChange,
    planTier,
    lockedDate,
    userId,
    onUnlocked,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    planTier: CalendarPlanTier
    lockedDate: Date | null
    userId: string | null
    onUnlocked?: (date: Date) => void
}) {
    const t = useTranslations("Calendar")
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const targetTier = planTier === "basic" ? "pro" : "basic"
    const subscribeHash =
        targetTier === "basic" ? "subscribe-basic" : "subscribe-pro"
    const bodyKey =
        planTier === "basic" ? "locked.bodyBasic" : "locked.bodyFree"
    const ctaKey = planTier === "basic" ? "locked.ctaBasic" : "locked.ctaFree"
    const priceAmount = getPlanPrice(targetTier, "monthly", currency)
    const priceLabel = formatCurrency(priceAmount, currency, locale).replace(
        /^US(?=\$)/,
        "",
    )

    const formattedDate = lockedDate ? formatFullDate(locale, lockedDate) : null

    const { stars, initialized: starsInitialized } = useStars()
    const canAffordStarUnlock =
        starsInitialized && (stars ?? 0) >= STAR_COST && Boolean(userId)

    const [purchasing, setPurchasing] = useState(false)
    const [purchaseError, setPurchaseError] = useState<string | null>(null)

    const handleStarUnlock = async () => {
        if (!userId || !lockedDate) return
        if (!canAffordStarUnlock) {
            setPurchaseError(t("starUnlock.insufficient"))
            return
        }
        setPurchasing(true)
        setPurchaseError(null)

        // The unlock endpoint is the source of truth: it deducts the star
        // and inserts the calendar_unlocks row atomically. After it returns
        // we broadcast so the navbar star pill (and any other listener)
        // refreshes from the server.
        try {
            const iso = toLocalIsoDate(lockedDate)
            const result = await purchaseCalendarUnlock(userId, iso)
            if (!result.ok) {
                throw new Error(result.error)
            }
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("stars-balance-updated"),
                )
            }
            onUnlocked?.(lockedDate)
        } catch (err) {
            setPurchaseError(
                (err as Error).message === "INSUFFICIENT_STARS"
                    ? t("starUnlock.insufficient")
                    : t("starUnlock.error"),
            )
        } finally {
            setPurchasing(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-md w-[92vw] overflow-hidden border border-amber-300/30 bg-gradient-to-br from-[#0b0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(252,211,77,0.35)]'>
                <div className='pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl' />
                <div className='pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl' />

                <DialogHeader className='relative space-y-2 text-left'>
                    <div className='flex items-center gap-3'>
                        <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40 shadow-[0_0_24px_-6px_rgba(252,211,77,0.5)]'>
                            <Crown className='h-5 w-5' />
                        </span>
                        <DialogTitle className='font-serif italic text-xl text-white leading-tight'>
                            {t("locked.title")}
                        </DialogTitle>
                    </div>
                    {formattedDate ? (
                        <div className='text-[11px] uppercase tracking-[0.22em] text-amber-200/80'>
                            {formattedDate}
                        </div>
                    ) : null}
                    <DialogDescription className='text-sm text-white/75 leading-relaxed'>
                        {t(bodyKey, { price: priceLabel })}
                    </DialogDescription>
                </DialogHeader>

                {planTier === "free" ? (
                    <p className='relative text-xs text-white/55 leading-relaxed'>
                        {t("locked.noteFree")}
                    </p>
                ) : null}

                {userId ? (
                    <div className='relative space-y-2 rounded-2xl border border-yellow-300/30 bg-yellow-300/[0.06] p-3'>
                        <div className='flex items-start gap-2 text-xs text-white/80 leading-relaxed'>
                            <Star
                                className='mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-300'
                                fill='currentColor'
                            />
                            <span>{t("starUnlock.description")}</span>
                        </div>
                        <button
                            type='button'
                            onClick={handleStarUnlock}
                            disabled={!canAffordStarUnlock || purchasing}
                            className='relative inline-flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-300/40 bg-yellow-300/15 px-4 py-2.5 text-sm font-medium text-yellow-100 transition-colors hover:bg-yellow-300/25 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {purchasing ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Star
                                    className='h-4 w-4 text-yellow-300'
                                    fill='currentColor'
                                />
                            )}
                            {t("starUnlock.cta", { cost: STAR_COST })}
                        </button>
                        {!canAffordStarUnlock && starsInitialized ? (
                            <p className='text-[11px] text-white/55'>
                                {t("starUnlock.insufficient")}
                            </p>
                        ) : null}
                        {purchaseError ? (
                            <p className='text-[11px] text-red-300/90'>
                                {purchaseError}
                            </p>
                        ) : null}
                    </div>
                ) : null}

                <Link
                    href={`/stars#${subscribeHash}`}
                    onClick={() => onOpenChange(false)}
                    className='relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-200 transition-colors shadow-[0_8px_24px_-8px_rgba(252,211,77,0.6)]'
                >
                    <Sparkles className='h-4 w-4' />
                    {t(ctaKey)}
                </Link>
            </DialogContent>
        </Dialog>
    )
}
