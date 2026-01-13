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
import CurrencySelector from "./currency-selector"

// Access env variables directly - Next.js makes NEXT_PUBLIC_* vars available in client components
// Fallback to the pre-evaluated value from the module in case env isn't available
const MONTHLY_PACK_ID = process.env.NEXT_PUBLIC_MONTHLY_PACK_ID || MONTHLY_PACKS.id
const ANNUALLY_PACK_ID = process.env.NEXT_PUBLIC_ANNUALLY_PACK_ID || ANNUALLY_PACKS.id

type SubscriptionSectionProps = {
    locale: string
    currency: CurrencyCode
    monthlyPrice: number | null
    annualPrice: number | null
    annualMonthlyEquivalent: number | null
    defaultCurrency: CurrencyCode
    onCurrencyChange: (currency: CurrencyCode) => void
}

export default function SubscriptionSection({
    locale,
    currency,
    monthlyPrice,
    annualPrice,
    annualMonthlyEquivalent,
    defaultCurrency,
    onCurrencyChange,
}: SubscriptionSectionProps) {
    const t = useTranslations("Pricing")

    // Debug: Log pack IDs to help diagnose issues
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.log("Subscription Pack IDs:", {
            monthly: {
                fromEnv: process.env.NEXT_PUBLIC_MONTHLY_PACK_ID,
                fromModule: MONTHLY_PACKS.id,
                final: MONTHLY_PACK_ID,
            },
            annual: {
                fromEnv: process.env.NEXT_PUBLIC_ANNUALLY_PACK_ID,
                fromModule: ANNUALLY_PACKS.id,
                final: ANNUALLY_PACK_ID,
            },
        })
    }

    const formatAmount = (amount?: number | null) =>
        amount != null ? formatCurrency(amount, currency, locale) : "--"

    return (
        <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
    <Tabs defaultValue='annual' className='w-full'>
        <div className='flex items-center justify-center mb-8'>
            <TabsList className='bg-muted/30 p-1 border border-border/40 rounded-full h-auto'>
                <TabsTrigger
                    value='monthly'
                    className='rounded-full px-6 py-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all duration-300'
                >
                    {t("monthly")}
                </TabsTrigger>
                <TabsTrigger
                    value='annual'
                    className='rounded-full px-6 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all duration-300 relative'
                >
                    {t("yearly")}
                    <span className='absolute -top-3 -right-3 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse'>
                        -17%
                    </span>
                </TabsTrigger>
            </TabsList>
        </div>
                <TabsContent value='monthly'>
                    {/* Monthly colored background overlay */}
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-purple-500/5' />
                    <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                        <div className='text-center md:text-left'>
                            <div className='flex items-center justify-center md:justify-start gap-4'>
                                <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10'>
                                    <Crown className='w-8 h-8 text-violet-300' />
                                </div>
                                <div className='text-left'>
                                    <h3 className='font-serif text-2xl font-bold'>{t("monthlySubscription")}</h3>
                                    <p className='text-sm text-muted-foreground'>{t("cancelAnytime")}</p>
                                </div>
                            </div>
                        </div>
                        <div className='flex flex-col items-center md:items-end justify-center space-y-2 bg-black/20 p-4 rounded-xl border border-white/5'>
                            <div className='flex items-baseline gap-2'>
                                <span className='text-3xl font-bold bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent'>
                                    {formatAmount(monthlyPrice)}
                                </span>
                                <span className='text-sm text-muted-foreground'>
                                    /month
                                </span>
                            </div>
                            <CurrencySelector
                                locale={locale}
                                defaultCurrency={defaultCurrency}
                                currency={currency}
                                onCurrencyChange={onCurrencyChange}
                            />
                        </div>
                        <div className='md:col-span-3 grid md:grid-cols-2 gap-6 pt-6 border-t border-white/10'>
                            <ul className='space-y-3'>
                                <li className='flex items-center gap-3 text-sm text-white/90'>
                                    <CheckCircle2 className='w-5 h-5 text-violet-400 flex-shrink-0' />
                                    {t("ongoingSupport")}
                                </li>
                                <li className='flex items-center gap-3 text-sm text-white/90'>
                                    <CheckCircle2 className='w-5 h-5 text-violet-400 flex-shrink-0' />
                                    {t("bonusStars")}
                                </li>
                                <li className='flex items-center gap-3 text-sm text-white/90'>
                                    <CheckCircle2 className='w-5 h-5 text-violet-400 flex-shrink-0' />
                                    {t("cancelFromAccount")}
                                </li>
                            </ul>
                            <div className='flex items-center justify-end'>
                                <Checkout
                                    mode='subscribe'
                                    plan='monthly'
                                    packId={MONTHLY_PACK_ID || MONTHLY_PACKS.id || undefined}
                                    currency={currency}
                                    className="w-full md:w-auto"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value='annual'>
                    {/* Annual colored background overlay (indigo) */}
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-indigo-700/10 border-2 border-indigo-500/20' />
                    <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                        <div className='text-center md:text-left'>
                            <div className='flex items-center justify-center md:justify-start gap-4'>
                                <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10'>
                                    <Crown className='w-8 h-8 text-indigo-300' />
                                </div>
                                <div className='text-left'>
                                    <div className='flex items-center gap-2'>
                                        <h3 className='font-serif text-2xl font-bold'>{t("annualSubscription")}</h3>
                                        <span className='px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-bold uppercase tracking-wider'>
                                            {t("bestValue")}
                                        </span>
                                    </div>
                                    <p className='text-sm text-muted-foreground'>{t("billedYearly")} ({formatAmount(annualPrice)})</p>
                                </div>
                            </div>
                        </div>
                        <div className='flex flex-col items-center md:items-end justify-center space-y-2 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20'>
                            <div className='flex items-baseline gap-2'>
                                <span className='text-3xl font-bold bg-gradient-to-r from-indigo-200 to-blue-200 bg-clip-text text-transparent'>
                                    {formatAmount(annualMonthlyEquivalent)}
                                </span>
                                <span className='text-sm text-muted-foreground line-through decoration-white/30'>
                                    {formatAmount(monthlyPrice)}
                                </span>
                                <span className='text-sm text-muted-foreground'>
                                    /month
                                </span>
                            </div>
                            <CurrencySelector
                                locale={locale}
                                defaultCurrency={defaultCurrency}
                                currency={currency}
                                onCurrencyChange={onCurrencyChange}
                            />
                        </div>
                        <div className='md:col-span-3 grid md:grid-cols-2 gap-6 pt-6 border-t border-indigo-500/20'>
                            <ul className='space-y-3'>
                                <li className='flex items-center gap-3 text-sm text-white/90'>
                                    <CheckCircle2 className='w-5 h-5 text-indigo-400 flex-shrink-0' />
                                    {t("bestValueYearly")}
                                </li>
                                <li className='flex items-center gap-3 text-sm text-white/90'>
                                    <CheckCircle2 className='w-5 h-5 text-indigo-400 flex-shrink-0' />
                                    {t("samePerks")}
                                </li>
                                <li className='flex items-center gap-3 text-sm text-white/90'>
                                    <CheckCircle2 className='w-5 h-5 text-indigo-400 flex-shrink-0' />
                                    {t("cancelRenewal")}
                                </li>
                            </ul>
                            <div className='flex items-center justify-end'>
                                <Checkout
                                    mode='subscribe'
                                    plan='annual'
                                    packId={ANNUALLY_PACK_ID || ANNUALLY_PACKS.id || undefined}
                                    currency={currency}
                                    className="w-full md:w-auto"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
