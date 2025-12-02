"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import CurrencySelector from "./currency-selector"
import SubscriptionSection from "./subscription-section"
import StarPacksGrid from "./star-packs-grid"
import {
    getAnnualMonthlyEquivalent,
    getSubscriptionPrice,
} from "@/lib/payments/star-products"
import { ensureSupportedCurrency, type CurrencyCode } from "@/lib/payments/currency-utils"

type PricingContentProps = {
    locale: string
    defaultCurrency: CurrencyCode
}

export default function PricingContent({
    locale,
    defaultCurrency,
}: PricingContentProps) {
    const t = useTranslations("Pricing")
    const [currency, setCurrency] = useState<CurrencyCode>(
        ensureSupportedCurrency(defaultCurrency)
    )

    const monthlyPrice = getSubscriptionPrice("monthly", currency)
    const annualPrice = getSubscriptionPrice("annual", currency)
    const annualMonthlyEquivalent = getAnnualMonthlyEquivalent(currency)

    return (
        <>
            <CurrencySelector
                locale={locale}
                defaultCurrency={defaultCurrency}
                onCurrencyChange={setCurrency}
            />

            {/* Divider: Subscription plans */}
            <div className='flex items-center gap-3 mt-6'>
                <span className='h-px flex-1 bg-white/60'></span>
                <span className='text-xs tracking-wider uppercase text-white'>
                    {t("subscriptionPlans")}
                </span>
                <span className='h-px flex-1 bg-white/60'></span>
            </div>

            <SubscriptionSection
                locale={locale}
                currency={currency}
                monthlyPrice={monthlyPrice}
                annualPrice={annualPrice}
                annualMonthlyEquivalent={annualMonthlyEquivalent}
            />

            {/* Divider: One-time star packs */}
            <div className='flex items-center gap-3 mt-8'>
                <span className='h-px flex-1 bg-white/60'></span>
                <span className='text-xs tracking-wider uppercase text-white'>
                    {t("oneTimePacks")}
                </span>
                <span className='h-px flex-1 bg-white/60'></span>
            </div>

            <StarPacksGrid locale={locale} currency={currency} />
        </>
    )
}

