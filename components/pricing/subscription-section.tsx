"use client"

import { Card } from "@/components/ui/card"
import { Crown, CheckCircle2 } from "lucide-react"
import { Checkout } from "@/components/checkout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslations } from "next-intl"
import { ANNUALLY_PACKS, MONTHLY_PACKS } from "@/lib/payments/star-products"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"

type SubscriptionSectionProps = {
    locale: string
    currency: CurrencyCode
    monthlyPrice: number | null
    annualPrice: number | null
    annualMonthlyEquivalent: number | null
}

export default function SubscriptionSection({
    locale,
    currency,
    monthlyPrice,
    annualPrice,
    annualMonthlyEquivalent,
}: SubscriptionSectionProps) {
    const t = useTranslations("Pricing")

    const formatAmount = (amount?: number | null) =>
        amount != null ? formatCurrency(amount, currency, locale) : "--"

    return (
        <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
            <Tabs defaultValue='monthly' className='w-full'>
                <div className='flex items-center justify-between flex-wrap gap-4'>
                    <div className='order-2 md:order-1 space-y-1'>
                        <TabsList>
                            <TabsTrigger value='monthly'>
                                {t("monthly")}
                            </TabsTrigger>
                            <TabsTrigger value='annual'>
                                {t("yearly")}
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </div>
                <TabsContent value='monthly'>
                    {/* Monthly colored background overlay */}
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/12 via-fuchsia-500/10 to-purple-500/12' />
                    <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                        <div className='order-1 md:order-2 text-center'>
                            <div className='w-16 h-16 mx-auto rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center'>
                                <Crown className='w-8 h-8 text-violet-300' />
                            </div>
                        </div>
                        <div className='order-2 md:order-1 space-y-2'>
                            <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-violet-400/15 border border-violet-400/30 text-violet-300'>
                                <Crown className='w-4 h-4' />
                                {t("monthlySubscription")}
                            </div>
                            <div className='text-3xl font-bold'>
                                {formatAmount(monthlyPrice)}
                                <span className='text-sm text-white/70'>
                                    /month
                                </span>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("perMonth")} · {t("autoRenew")} ·{" "}
                                {t("cancelAnytime")}
                            </div>
                        </div>
                        <div className='order-3 space-y-3'>
                            <ul className='mt-2 text-sm text-white/80 space-y-1'>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-violet-300' />{" "}
                                    {t("ongoingSupport")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-violet-300' />{" "}
                                    {t("bonusStars")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-violet-300' />{" "}
                                    {t("cancelFromAccount")}
                                </li>
                            </ul>
                            <Checkout
                                mode='subscribe'
                                plan='monthly'
                                packId={MONTHLY_PACKS.id}
                                currency={currency}
                            />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value='annual'>
                    {/* Annual colored background overlay (indigo) */}
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/12 via-indigo-600/10 to-indigo-700/12' />
                    <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                        <div className='order-1 md:order-2 text-center'>
                            <div className='w-16 h-16 mx-auto rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center'>
                                <Crown className='w-8 h-8 text-indigo-300' />
                            </div>
                        </div>
                        <div className='order-2 md:order-1 space-y-2'>
                            <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-indigo-400/15 border border-indigo-400/30 text-indigo-300'>
                                <Crown className='w-4 h-4' />
                                {t("annualSubscription")}
                            </div>
                            <div className='inline-flex items-baseline gap-2'>
                                <div className='text-3xl font-bold'>
                                    {formatAmount(annualMonthlyEquivalent)}{" "}
                                </div>
                                <div className='text-sm text-white/70 line-through'>
                                    {formatAmount(monthlyPrice)}{" "}
                                </div>
                                <span className='text-sm text-white/70'>
                                    /month
                                </span>
                                <span className='text-xs px-2 py-0.5 rounded border bg-indigo-400/15 border-indigo-400/30 text-indigo-300 font-semibold'>
                                    {t("save17")}
                                </span>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("perMonth")} · {t("billedYearly")} (
                                {formatAmount(annualPrice)})
                            </div>
                        </div>
                        <div className='order-3 space-y-3'>
                            <ul className='mt-2 text-sm text-white/80 space-y-1'>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-indigo-300' />{" "}
                                    {t("bestValueYearly")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-indigo-300' />{" "}
                                    {t("samePerks")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-indigo-300' />{" "}
                                    {t("cancelRenewal")}
                                </li>
                            </ul>
                            <Checkout
                                mode='subscribe'
                                plan='annual'
                                packId={ANNUALLY_PACKS.id}
                                currency={currency}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
