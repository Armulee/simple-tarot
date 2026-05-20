"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2, Crown, Hand, Lock, Star } from "lucide-react"
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

type ManualPickPaywallDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentTier?: SubscriptionPlanTier | "free" | null
}

export function ManualPickPaywallDialog({
    open,
    onOpenChange,
    currentTier,
}: ManualPickPaywallDialogProps) {
    const t = useTranslations("Pricing")
    const tCards = useTranslations("ReadingPage.chooseCards")
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='!max-w-2xl bg-gradient-to-b from-[#0a0a1a] to-[#1a0b2e] border-purple-500/20 text-white p-0 overflow-hidden'>
                <DialogHeader className='px-6 pt-6 pb-2'>
                    <div className='flex items-center justify-center mb-2'>
                        <span className='inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25'>
                            <Hand className='h-6 w-6 text-indigo-300' />
                        </span>
                    </div>
                    <DialogTitle className='text-white text-center text-xl'>
                        {tCards("manualPickPaywallTitle")}
                    </DialogTitle>
                    <DialogDescription className='text-center text-purple-200/70'>
                        {tCards("manualPickPaywallDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className='px-6 pb-6 space-y-4'>
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

                            const unlocksManualPick = tier === "pro"
                            const isCurrent = currentTier === tier

                            return (
                                <div
                                    key={plan.id}
                                    className={cn(
                                        "relative flex flex-col gap-3 rounded-2xl border p-4",
                                        unlocksManualPick
                                            ? "border-indigo-400/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
                                            : "border-white/10 bg-black/30 opacity-80",
                                    )}
                                >
                                    <div className='flex items-center justify-between gap-2'>
                                        <div className='flex items-center gap-2'>
                                            <Crown
                                                className={cn(
                                                    "h-4 w-4",
                                                    unlocksManualPick
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
                                            {unlocksManualPick ? (
                                                <CheckCircle2 className='h-3 w-3 text-indigo-300 shrink-0' />
                                            ) : (
                                                <Lock className='h-3 w-3 text-white/40 shrink-0' />
                                            )}
                                            <span
                                                className={cn(
                                                    !unlocksManualPick &&
                                                        "text-white/50",
                                                )}
                                            >
                                                {tCards(
                                                    "manualPickPaywallFeature",
                                                )}
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

                                    {unlocksManualPick ? (
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
                                                : tCards(
                                                      "manualPickPaywallInsufficient",
                                                  )}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <p className='text-center text-[11px] text-white/50'>
                        {tCards("manualPickPaywallNote")}
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
