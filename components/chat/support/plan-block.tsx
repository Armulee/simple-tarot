"use client"

import { useLocale, useTranslations } from "next-intl"
import { ArrowRight, CheckCircle2, Crown, Star } from "lucide-react"
import { Link } from "@/i18n/navigation"
import type { SupportBlockPayload } from "@/components/chat/types"
import {
    SUBSCRIPTION_PLANS,
    resolvePlanBillingPrice,
} from "@/lib/payments/subscription-plans"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"

type Props = {
    payload: Extract<SupportBlockPayload, { kind: "plan" }>
}

export function PlanBlock({ payload }: Props) {
    const t = useTranslations("Pricing")
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"

    return (
        <div className='w-full md:max-w-[85%] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4'>
            <div className='flex items-center justify-between gap-3'>
                <div className='min-w-0'>
                    <h4 className='text-sm font-semibold text-white'>
                        {payload.title}
                    </h4>
                    <p className='mt-1 text-xs text-white/65 line-clamp-2'>
                        {payload.description}
                    </p>
                </div>
                <span className='shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25'>
                    <Crown className='h-4 w-4 text-indigo-300' />
                </span>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
                {SUBSCRIPTION_PLANS.map((plan) => {
                    const monthly = plan.billing?.monthly
                    const annualNative = resolvePlanBillingPrice(
                        plan,
                        "annual",
                        currency,
                    )
                    const monthlyPrice = resolvePlanBillingPrice(
                        plan,
                        "monthly",
                        currency,
                    )
                    const annualMonthlyPrice =
                        annualNative != null ? annualNative / 12 : undefined
                    const discountPercent =
                        monthlyPrice != null && annualMonthlyPrice != null
                            ? Math.round(
                                  (1 - annualMonthlyPrice / monthlyPrice) * 100,
                              )
                            : null

                    return (
                        <div
                            key={plan.id}
                            className='flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3'
                        >
                            <div className='flex items-center justify-between gap-2'>
                                <span className='text-sm font-semibold text-white'>
                                    {t(plan.nameKey)}
                                </span>
                                {plan.badgeKey && (
                                    <span className='inline-flex rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-[1px] text-[9px] font-bold tracking-widest uppercase text-indigo-200'>
                                        {t(plan.badgeKey)}
                                    </span>
                                )}
                            </div>
                            <div className='flex items-baseline gap-1.5'>
                                <Star className='h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0' />
                                <span className='text-lg font-bold text-white'>
                                    {monthly?.stars}
                                </span>
                                <span className='text-[10px] uppercase tracking-widest text-white/60'>
                                    {t("starsPerMonth")}
                                </span>
                            </div>
                            <div className='flex items-baseline gap-1.5'>
                                <span className='text-lg font-bold text-white'>
                                    {monthlyPrice != null
                                        ? formatCurrency(
                                              monthlyPrice,
                                              currency,
                                              locale,
                                          )
                                        : "--"}
                                </span>
                                <span className='text-xs text-white/55'>
                                    /{t("perMonth")}
                                </span>
                            </div>
                            {discountPercent != null &&
                            discountPercent > 0 ? (
                                <div className='inline-flex w-fit rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-[1px] text-[10px] font-medium text-emerald-200'>
                                    {t("savePercent", {
                                        percent: discountPercent,
                                    })}{" "}
                                    {t("billedYearly")}
                                </div>
                            ) : null}
                            <ul className='space-y-1 text-[11px] text-white/75'>
                                <li className='flex items-center gap-1.5'>
                                    <CheckCircle2 className='h-3 w-3 text-indigo-300 shrink-0' />
                                    {t("bonusStars")}
                                </li>
                                <li className='flex items-center gap-1.5'>
                                    <CheckCircle2 className='h-3 w-3 text-indigo-300 shrink-0' />
                                    {t("cancelFromAccount")}
                                </li>
                            </ul>
                        </div>
                    )
                })}
            </div>

            <Link
                href={payload.href}
                className='group inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90'
            >
                {t("subscribeNow")}
                <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />
            </Link>
        </div>
    )
}
