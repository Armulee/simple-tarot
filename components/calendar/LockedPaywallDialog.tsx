"use client"

import { Crown, Loader2, Star } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

import { PaywallDialog } from "@/components/subscription/paywall-dialog"
import { useStars } from "@/contexts/stars-context"
import { toLocalIsoDate } from "@/lib/calendar-helper"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import { purchaseCalendarUnlock } from "@/lib/calendar/unlocks-client"

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

    const { stars, initialized: starsInitialized } = useStars()
    const canAffordStarUnlock =
        starsInitialized && (stars ?? 0) >= STAR_COST && Boolean(userId)

    const [purchasing, setPurchasing] = useState(false)
    const [purchaseError, setPurchaseError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) {
            setPurchasing(false)
            setPurchaseError(null)
        }
    }, [open])

    const handleStarUnlock = async () => {
        if (!userId || !lockedDate) return
        if (!canAffordStarUnlock) {
            setPurchaseError(t("starUnlock.insufficient"))
            return
        }
        setPurchasing(true)
        setPurchaseError(null)
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

    const showStarAction = Boolean(userId)
    const starButtonDisabled = !canAffordStarUnlock || purchasing
    const footerMessage = purchaseError
        ? purchaseError
        : showStarAction && starsInitialized && !canAffordStarUnlock
            ? t("starUnlock.insufficient")
            : null

    const secondary = showStarAction ? (
        <div className='space-y-2 text-center'>
            <p className='text-xs text-white/70 leading-relaxed'>
                {t("starUnlock.description")}
            </p>
            <button
                type='button'
                onClick={() => void handleStarUnlock()}
                disabled={starButtonDisabled}
                className='inline-flex w-full items-center justify-center gap-2 rounded-full border border-yellow-300/40 bg-yellow-300/15 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-300/25 disabled:opacity-50 disabled:cursor-not-allowed'
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
            {footerMessage ? (
                <p
                    className={
                        purchaseError
                            ? "text-[11px] text-red-300/90"
                            : "text-[11px] text-white/55"
                    }
                >
                    {footerMessage}
                </p>
            ) : null}
        </div>
    ) : null

    return (
        <PaywallDialog
            open={open}
            onOpenChange={onOpenChange}
            requiredTier='basic'
            currentTier={planTier}
            title={t("locked.paywallTitle")}
            description={t("locked.paywallDesc")}
            feature={t("locked.paywallFeature")}
            footnote={t("locked.paywallNote")}
            insufficientLabel={t("locked.paywallInsufficient")}
            icon={<Crown className='h-6 w-6 text-indigo-300' />}
            secondary={secondary}
        />
    )
}
