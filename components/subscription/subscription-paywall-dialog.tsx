"use client"

import { CheckCircle2, Crown, Star } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { Checkout } from "@/components/checkout"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    SUBSCRIPTION_PLANS,
    resolvePlanBillingPrice,
    resolvePlanPriceId,
    type BillingCycle,
} from "@/lib/payments/subscription-plans"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { cn } from "@/lib/utils"

export type SubscriptionPaywallDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    icon?: ReactNode
    eyebrow?: string
    title: string
    description?: string
    /**
     * Optional content rendered below the plan cards (e.g. a secondary
     * "Unlock with 1 Star" CTA + helper text).
     */
    secondary?: ReactNode
    /** Force a default billing cycle on open. */
    defaultCycle?: BillingCycle
}

const FEATURE_KEYS = ["ongoingSupport", "bonusStars", "cancelFromAccount"] as const

export function SubscriptionPaywallDialog({
    open,
    onOpenChange,
    icon,
    eyebrow,
    title,
    description,
    secondary,
    defaultCycle = "monthly",
}: SubscriptionPaywallDialogProps) {
    const locale = useLocale()
    const tPricing = useTranslations("Pricing")
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const formatAmount = (amount: number) =>
        formatCurrency(amount, currency, locale).replace(/^US(?=\$)/, "")

    const [billingCycle, setBillingCycle] = useState<BillingCycle>(defaultCycle)

    useEffect(() => {
        if (open) setBillingCycle(defaultCycle)
    }, [open, defaultCycle])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!max-w-md w-[92vw] !max-h-[90vh] bg-gradient-to-b from-[#0a0a1a] to-[#1a0b2e] border-purple-500/20 text-white overflow-hidden flex flex-col !p-0'>
                <DialogHeader className='px-6 pt-6 pb-2 flex-shrink-0 items-center text-center'>
                    {icon ? (
                        <span className='mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 shadow-[0_0_24px_-6px_rgba(99,102,241,0.55)]'>
                            {icon}
                        </span>
                    ) : null}
                    {eyebrow ? (
                        <div className='text-[10px] font-medium uppercase tracking-[0.22em] text-indigo-200/80'>
                            {eyebrow}
                        </div>
                    ) : null}
                    <DialogTitle className='text-white text-center text-lg font-serif'>
                        {title}
                    </DialogTitle>
                    {description ? (
                        <DialogDescription className='text-center text-purple-200/80 text-sm leading-relaxed'>
                            {description}
                        </DialogDescription>
                    ) : null}
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-5 pb-6 space-y-4'>
                    <div className='flex justify-center'>
                        <div className='inline-flex rounded-full bg-white/5 border border-white/10 p-0.5'>
                            {(["monthly", "annual"] as BillingCycle[]).map(
                                (cycle) => (
                                    <button
                                        key={cycle}
                                        type='button'
                                        onClick={() => setBillingCycle(cycle)}
                                        className={cn(
                                            "px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest transition-all duration-200",
                                            billingCycle === cycle
                                                ? "bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/25"
                                                : "text-white/50 hover:text-white/80",
                                        )}
                                    >
                                        {cycle === "monthly"
                                            ? tPricing("monthly")
                                            : tPricing("yearly")}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    <div className='grid gap-3'>
                        {SUBSCRIPTION_PLANS.map((plan) => {
                            const billing = plan.billing?.[billingCycle]
                            const priceId = resolvePlanPriceId(
                                plan,
                                billingCycle,
                                currency,
                            )
                            const monthlyPrice = resolvePlanBillingPrice(
                                plan,
                                "monthly",
                                currency,
                            )
                            const annualNative = resolvePlanBillingPrice(
                                plan,
                                "annual",
                                currency,
                            )
                            const annualMonthlyPrice =
                                annualNative != null
                                    ? annualNative / 12
                                    : undefined
                            const displayPrice =
                                billingCycle === "annual"
                                    ? annualMonthlyPrice
                                    : monthlyPrice
                            const discountPercent =
                                billingCycle === "annual" &&
                                monthlyPrice != null &&
                                annualMonthlyPrice != null
                                    ? Math.round(
                                          (1 -
                                              annualMonthlyPrice / monthlyPrice) *
                                              100,
                                      )
                                    : null
                            return (
                                <div
                                    key={plan.id}
                                    className='relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 flex flex-col gap-4'
                                >
                                    {plan.badgeKey ? (
                                        <span className='absolute right-4 top-4 inline-flex rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-200'>
                                            {tPricing(plan.badgeKey)}
                                        </span>
                                    ) : null}

                                    <div className='flex items-center gap-3'>
                                        <Crown className='h-5 w-5 text-indigo-300' />
                                        <h3 className='text-lg font-serif font-semibold text-white'>
                                            {tPricing(plan.nameKey)}
                                        </h3>
                                    </div>

                                    <div className='flex items-center gap-2'>
                                        <Star
                                            fill='currentColor'
                                            className='h-5 w-5 text-yellow-400'
                                        />
                                        <span className='text-xl font-bold text-white'>
                                            {billing?.stars ?? "--"}
                                        </span>
                                        <span className='text-xs uppercase tracking-widest text-white/55'>
                                            {billingCycle === "annual"
                                                ? tPricing("starsPerYear")
                                                : tPricing("starsPerMonth")}
                                        </span>
                                    </div>

                                    <div className='flex items-baseline gap-2'>
                                        <span className='text-2xl font-bold text-white tabular-nums'>
                                            {displayPrice != null
                                                ? formatAmount(displayPrice)
                                                : "--"}
                                        </span>
                                        <span className='text-xs text-white/55'>
                                            /{tPricing("perMonth")}
                                        </span>
                                        {discountPercent &&
                                        discountPercent > 0 ? (
                                            <span className='ml-auto inline-flex rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200'>
                                                {tPricing("savePercent", {
                                                    percent: discountPercent,
                                                })}
                                            </span>
                                        ) : null}
                                    </div>

                                    <ul className='space-y-1.5 text-xs text-white/75'>
                                        {FEATURE_KEYS.map((key) => (
                                            <li
                                                key={key}
                                                className='flex items-center gap-2'
                                            >
                                                <CheckCircle2 className='h-3.5 w-3.5 text-indigo-300' />
                                                {tPricing(key)}
                                            </li>
                                        ))}
                                    </ul>

                                    <Checkout
                                        mode='subscribe'
                                        packId={priceId}
                                        currency={currency}
                                        plan={billingCycle}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    {secondary ? (
                        <div className='pt-2 border-t border-white/10'>
                            {secondary}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    )
}
