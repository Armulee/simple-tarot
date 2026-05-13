"use client"

import { useLocale, useTranslations } from "next-intl"
import SubscriptionSection from "./subscription-section"
import StarPacksGrid from "./star-packs-grid"
import { useStars } from "@/contexts/stars-context"
import type { CurrencyCode } from "@/lib/payments/currency-utils"

export default function PricingContent() {
    const t = useTranslations("Pricing")
    const { subscription } = useStars()
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const showAddOnPacks = subscription?.tier === "pro"

    return (
        <>
            {/* Divider: Subscription plans */}
            <div className='flex items-center gap-3 mt-6'>
                <span className='h-px flex-1 bg-white/60'></span>
                <span className='text-xs tracking-wider uppercase text-white'>
                    {t("subscriptionPlans")}
                </span>
                <span className='h-px flex-1 bg-white/60'></span>
            </div>

            <SubscriptionSection locale={locale} currency={currency} />

            {/* Divider: One-time star packs */}
            <div className='flex items-center gap-3 mt-8'>
                <span className='h-px flex-1 bg-white/60'></span>
                <span className='text-xs tracking-wider uppercase text-white'>
                    {t("oneTimePacks")}
                </span>
                <span className='h-px flex-1 bg-white/60'></span>
            </div>

            {showAddOnPacks ? (
                <StarPacksGrid locale={locale} currency={currency} />
            ) : (
                <div className='mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70'>
                    {t("proOnlyPacks")}
                </div>
            )}
        </>
    )
}
