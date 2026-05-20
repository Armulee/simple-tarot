"use client"

import { Crown, Sparkles, Star } from "lucide-react"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import { PaywallDialog } from "@/components/ui/paywall-dialog"
import { useStars } from "@/contexts/stars-context"
import { toLocalIsoDate } from "@/lib/calendar-helper"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import { purchaseCalendarUnlock } from "@/lib/calendar/unlocks-client"
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
    const upgradeHref = `/${locale}/stars#${subscribeHash}`
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

    return (
        <PaywallDialog
            open={open}
            onOpenChange={onOpenChange}
            tone='premium'
            icon={<Crown className='h-3.5 w-3.5' />}
            eyebrow={formattedDate ?? undefined}
            title={t("locked.title")}
            body={t(bodyKey, { price: priceLabel })}
            note={planTier === "free" ? t("locked.noteFree") : undefined}
            actions={[
                {
                    key: "upgrade",
                    label: t(ctaKey),
                    href: upgradeHref,
                    icon: <Sparkles className='h-3.5 w-3.5' />,
                    onClick: () => onOpenChange(false),
                },
                ...(showStarAction
                    ? [
                          {
                              key: "star",
                              label: t("starUnlock.cta", { cost: STAR_COST }),
                              onClick: () => void handleStarUnlock(),
                              icon: (
                                  <Star
                                      className='h-3.5 w-3.5 text-yellow-300'
                                      fill='currentColor'
                                  />
                              ),
                              disabled: starButtonDisabled,
                              loading: purchasing,
                          },
                      ]
                    : []),
            ]}
            footer={
                footerMessage ? (
                    <p
                        className={
                            purchaseError
                                ? "text-[11px] text-red-300/90"
                                : "text-[11px] text-white/55"
                        }
                    >
                        {footerMessage}
                    </p>
                ) : null
            }
        />
    )
}
