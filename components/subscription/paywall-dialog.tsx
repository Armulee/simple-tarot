"use client"

import { useState, type ReactNode } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2, Crown, Lock, Sparkles, Star } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Checkout } from "@/components/checkout"
import {
    SUBSCRIPTION_PLANS,
    resolvePlanBillingPrice,
    resolvePlanPriceId,
    type BillingCycle,
    type SubscriptionPlanTier,
} from "@/lib/payments/subscription-plans"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { cn } from "@/lib/utils"

export type PaywallTier = SubscriptionPlanTier | "free"

const TIER_RANK: Record<PaywallTier, number> = {
    free: 0,
    basic: 1,
    pro: 2,
}

export type PaywallDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Minimum subscription tier that unlocks the gated feature. */
    requiredTier: SubscriptionPlanTier
    /** The user's current tier; used to label "Current plan". */
    currentTier?: PaywallTier | null
    /** Dialog title. */
    title: string
    /** Short description shown beneath the title. */
    description: string
    /** A single-line label describing what the feature is. */
    feature: string
    /** Optional icon shown above the title. Defaults to a sparkles icon. */
    icon?: ReactNode
    /** Optional small note rendered at the bottom of the dialog. */
    footnote?: string
    /** Label shown on a disabled plan card that doesn't satisfy the gate. */
    insufficientLabel?: string
    /**
     * Optional content rendered between the plan cards and the footnote
     * (e.g. an alternative single-action CTA such as "Unlock with 1 Star").
     */
    secondary?: ReactNode
}

export function PaywallDialog({
    open,
    onOpenChange,
    requiredTier,
    currentTier,
    title,
    description,
    feature,
    icon,
    footnote,
    insufficientLabel,
    secondary,
}: PaywallDialogProps) {
    const t = useTranslations("Pricing")
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")

    const requiredRank = TIER_RANK[requiredTier]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!max-w-2xl !max-h-[90vh] bg-gradient-to-b from-[#0a0a1a] to-[#1a0b2e] border-purple-500/20 text-white p-0 overflow-hidden flex flex-col'>
                <DialogHeader className='px-6 pt-6 pb-2 flex-shrink-0'>
                    <div className='flex items-center justify-center mb-2'>
                        <span className='inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25'>
                            {icon ?? (
                                <Sparkles className='h-6 w-6 text-indigo-300' />
                            )}
                        </span>
                    </div>
                    <DialogTitle className='text-white text-center text-xl'>
                        {title}
                    </DialogTitle>
                    <DialogDescription className='text-center text-purple-200/70'>
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className='flex-1 overflow-y-auto px-6 pb-6 space-y-4 scrollbar-thin'>
                    <div className='flex items-center justify-center'>
                        <div className='inline-flex rounded-full bg-white/5 border border-white/10 p-0.5'>
                            {(["monthly", "annual"] as BillingCycle[]).map(
                                (cycle) => (
                                    <button
                                        key={cycle}
                                        type='button'
                                        onClick={() => setBillingCycle(cycle)}
                                        className={cn(
                                            "px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                                            billingCycle === cycle
                                                ? "bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/25"
                                                : "text-white/60 hover:text-white/90",
                                        )}
                                    >
                                        {cycle === "monthly"
                                            ? t("monthly")
                                            : t("yearly")}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    <div className='grid gap-3 sm:grid-cols-2'>
                        {SUBSCRIPTION_PLANS.map((plan) => {
                            const tier = plan.id as SubscriptionPlanTier
                            const billing = plan.billing?.[billingCycle]
                            const priceId = resolvePlanPriceId(
                                plan,
                                billingCycle,
                                currency,
                            )
                            const monthlyNative = resolvePlanBillingPrice(
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
                                    : monthlyNative
                            const discountPercent =
                                billingCycle === "annual" &&
                                monthlyNative != null &&
                                annualMonthlyPrice != null
                                    ? Math.round(
                                          (1 -
                                              annualMonthlyPrice /
                                                  monthlyNative) *
                                              100,
                                      )
                                    : null

                            const meetsGate = TIER_RANK[tier] >= requiredRank
                            const isCurrent = currentTier === tier

                            return (
                                <div
                                    key={plan.id}
                                    className={cn(
                                        "relative flex flex-col gap-3 rounded-2xl border p-4",
                                        meetsGate
                                            ? "border-indigo-400/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                                            : "border-white/10 bg-black/30 opacity-80",
                                    )}
                                >
                                    <div className='flex items-center justify-between gap-2'>
                                        <div className='flex items-center gap-2'>
                                            <Crown
                                                className={cn(
                                                    "h-4 w-4",
                                                    meetsGate
                                                        ? "text-indigo-300"
                                                        : "text-white/40",
                                                )}
                                            />
                                            <span className='text-base font-semibold text-white'>
                                                {t(plan.nameKey)}
                                            </span>
                                        </div>
                                        {plan.badgeKey && (
                                            <span className='inline-flex rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-[1px] text-[9px] font-bold tracking-widest uppercase text-indigo-200'>
                                                {t(plan.badgeKey)}
                                            </span>
                                        )}
                                    </div>

                                    <div className='flex items-baseline gap-1.5'>
                                        <Star className='h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0' />
                                        <span className='text-lg font-bold text-white'>
                                            {billing?.stars}
                                        </span>
                                        <span className='text-[10px] uppercase tracking-widest text-white/60'>
                                            {billingCycle === "monthly"
                                                ? t("starsPerMonth")
                                                : t("starsPerYear")}
                                        </span>
                                    </div>

                                    <div className='flex items-baseline gap-1.5'>
                                        <span className='text-2xl font-bold text-white'>
                                            {displayPrice != null
                                                ? formatCurrency(
                                                      displayPrice,
                                                      currency,
                                                      locale,
                                                  )
                                                : "--"}
                                        </span>
                                        <span className='text-xs text-white/60'>
                                            /{t("perMonth")}
                                        </span>
                                    </div>

                                    {billingCycle === "annual" &&
                                        discountPercent != null &&
                                        discountPercent > 0 && (
                                            <div className='inline-flex w-fit rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-[1px] text-[10px] font-medium text-emerald-200'>
                                                {t("savePercent", {
                                                    percent: discountPercent,
                                                })}{" "}
                                                {t("billedYearly")}
                                            </div>
                                        )}

                                    <ul className='space-y-1 text-[11px] text-white/75'>
                                        <li className='flex items-center gap-1.5'>
                                            {meetsGate ? (
                                                <CheckCircle2 className='h-3 w-3 text-indigo-300 shrink-0' />
                                            ) : (
                                                <Lock className='h-3 w-3 text-white/40 shrink-0' />
                                            )}
                                            <span
                                                className={cn(
                                                    !meetsGate &&
                                                        "text-white/50",
                                                )}
                                            >
                                                {feature}
                                            </span>
                                        </li>
                                        <li className='flex items-center gap-1.5'>
                                            <CheckCircle2 className='h-3 w-3 text-indigo-300 shrink-0' />
                                            {t("bonusStars")}
                                        </li>
                                        <li className='flex items-center gap-1.5'>
                                            <CheckCircle2 className='h-3 w-3 text-indigo-300 shrink-0' />
                                            {t("cancelFromAccount")}
                                        </li>
                                    </ul>

                                    {meetsGate ? (
                                        <Checkout
                                            mode='subscribe'
                                            plan={billingCycle}
                                            packId={priceId}
                                            className='w-full'
                                        />
                                    ) : (
                                        <button
                                            type='button'
                                            disabled
                                            className='w-full rounded-full bg-white/5 text-white/40 cursor-not-allowed px-4 py-2 text-sm font-semibold border border-white/10'
                                        >
                                            {isCurrent
                                                ? t("currentPlan")
                                                : (insufficientLabel ??
                                                  t("upgradePlan"))}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {secondary ? (
                        <div className='pt-2 border-t border-white/10'>
                            {secondary}
                        </div>
                    ) : null}

                    {footnote && (
                        <p className='text-center text-[11px] text-white/50'>
                            {footnote}
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
