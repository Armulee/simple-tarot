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
    convertUsdToCurrency,
} from "@/lib/payments/currency-utils"
import CurrencySelector from "./currency-selector"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Access env variables directly - Next.js makes NEXT_PUBLIC_* vars available in client components
// Fallback to the pre-evaluated value from the module in case env isn't available
const MONTHLY_PACK_ID =
    process.env.NEXT_PUBLIC_MONTHLY_PACK_ID || MONTHLY_PACKS.id
const ANNUALLY_PACK_ID =
    process.env.NEXT_PUBLIC_ANNUALLY_PACK_ID || ANNUALLY_PACKS.id

type SubscriptionSectionProps = {
    locale: string
    currency: CurrencyCode
    monthlyPrice: number | null
    annualMonthlyEquivalent: number | null
    defaultCurrency: CurrencyCode
    onCurrencyChange: (currency: CurrencyCode) => void
}

type SubscriptionInfo = {
    plan: "monthly" | "annual" | string
    status: string
}

export default function SubscriptionSection({
    locale,
    currency,
    monthlyPrice,
    annualMonthlyEquivalent,
    defaultCurrency,
    onCurrencyChange,
}: SubscriptionSectionProps) {
    const t = useTranslations("Pricing")
    const { user } = useAuth()
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
        null
    )
    const [hasUsedOffer, setHasUsedOffer] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }

        async function fetchSubscriptionData() {
            try {
                const now = new Date().toISOString()
                // 1. Get current subscription (active, trialing, or canceled but not yet expired)
                const { data: currentSub } = await supabase
                    .from("billing_subscriptions")
                    .select("plan, status, current_period_end")
                    .eq("user_id", user?.id)
                    .or(
                        `status.in.(active,trialing),and(status.eq.canceled,current_period_end.gt.${now})`
                    )
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (currentSub) {
                    setSubscription(currentSub as SubscriptionInfo)
                }

                // 2. Check if user has EVER had a subscription (to determine offer eligibility)
                const { count } = await supabase
                    .from("billing_subscriptions")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user?.id)

                setHasUsedOffer((count ?? 0) > 0)
            } catch (err) {
                console.error("Error fetching subscription:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchSubscriptionData()
    }, [user])

    const formatAmount = (amount?: number | null) =>
        amount != null ? formatCurrency(amount, currency, locale) : "--"

    const isEligibleForOffer = !hasUsedOffer && !subscription
    const discountedMonthlyPrice = isEligibleForOffer
        ? convertUsdToCurrency(9.99, currency)
        : monthlyPrice
    const monthlyCouponId = isEligibleForOffer ? "DX9hJoW7" : undefined

    // Dynamic discount calculations
    const monthlyDiscountPct =
        monthlyPrice && discountedMonthlyPrice
            ? Math.round(
                  ((monthlyPrice - discountedMonthlyPrice) / monthlyPrice) * 100
              )
            : 0
    const annualDiscountPct =
        monthlyPrice && annualMonthlyEquivalent
            ? Math.round(
                  ((monthlyPrice - annualMonthlyEquivalent) / monthlyPrice) *
                      100
              )
            : 0

    // Logic:
    // 1. If annual active -> Show "Subscribed" notice
    // 2. If monthly active -> Show only annual tab
    // 3. Otherwise -> Show both

    if (loading) {
        return (
            <Card className='p-12 flex flex-col items-center justify-center bg-card/10 border-border/20'>
                <div className='w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin' />
            </Card>
        )
    }

    if (subscription?.plan === "annual" || subscription?.plan === "year") {
        return (
            <Card className='relative overflow-hidden p-10 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-black border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 text-center space-y-8 group transition-all duration-500 hover:border-indigo-500/50'>
                {/* Background decorative elements */}
                <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50' />
                <div className='absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[80px]' />
                <div className='absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px]' />

                <div className='relative z-10 space-y-6'>
                    <div className='inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 shadow-inner group-hover:scale-110 transition-transform duration-500'>
                        <Crown className='w-12 h-12 text-indigo-300' />
                    </div>

                    <div className='space-y-3'>
                        <div className='inline-block px-4 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-bold tracking-widest uppercase animate-pulse'>
                            {t("bestValue")}
                        </div>
                        <h2 className='text-3xl md:text-4xl font-serif font-bold text-white tracking-tight'>
                            {t("annualSubscription")}
                        </h2>
                        <p className='text-indigo-200/60 max-w-md mx-auto text-sm leading-relaxed'>
                            You have achieved celestial mastery with our Annual
                            plan. Enjoy unlimited stars and premium cosmic
                            insights.
                        </p>
                    </div>

                    <div className='flex items-center justify-center gap-2 text-indigo-400 font-medium'>
                        <CheckCircle2 className='w-5 h-5' />
                        <span className='tracking-wide uppercase text-xs font-bold'>
                            Subscription Active
                        </span>
                    </div>

                    <div className='pt-4'>
                        <Link href='/billing'>
                            <Button className='rounded-full bg-white text-black hover:bg-white/90 px-8 py-6 h-auto font-bold transition-all duration-300 shadow-xl shadow-white/5'>
                                Manage My Subscription
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        )
    }

    const isMonthlyActive =
        subscription?.plan === "monthly" || subscription?.plan === "month"

    return (
        <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
            <Tabs
                defaultValue={isMonthlyActive ? "annual" : "annual"}
                className='w-full'
            >
                <div className='flex items-center justify-center mb-8'>
                    <TabsList className='bg-muted/30 p-1 border border-border/40 rounded-full h-auto'>
                        {!isMonthlyActive && (
                            <TabsTrigger
                                value='monthly'
                                className='rounded-full px-6 py-2 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all duration-300 relative'
                            >
                                {t("monthly")}
                                {isEligibleForOffer &&
                                    monthlyDiscountPct > 0 && (
                                        <span className='absolute -top-3 -right-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse'>
                                            -{monthlyDiscountPct}%
                                        </span>
                                    )}
                            </TabsTrigger>
                        )}
                        <TabsTrigger
                            value='annual'
                            className='rounded-full px-6 py-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all duration-300 relative'
                        >
                            {t("yearly")}
                            {annualDiscountPct > 0 && (
                                <span className='absolute -top-3 -right-3 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse'>
                                    -{annualDiscountPct}%
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                {!isMonthlyActive && (
                    <TabsContent value='monthly'>
                        {/* Monthly colored background overlay */}
                        <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-purple-500/5' />
                        <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                            <div className='md:col-span-2 text-center md:text-left'>
                                <div className='flex items-center justify-center md:justify-start gap-4'>
                                    <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10'>
                                        <Crown className='w-8 h-8 text-violet-300' />
                                    </div>
                                    <div className='text-left'>
                                        <h3 className='font-serif text-2xl font-bold leading-tight'>
                                            {t("monthlySubscription")}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                            <div className='flex flex-col items-center md:items-end justify-center space-y-2 bg-black/20 p-4 rounded-xl border border-white/5 h-full w-full md:w-fit'>
                                <div className='flex items-baseline gap-2'>
                                    <span className='text-3xl font-bold bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent'>
                                        {formatAmount(discountedMonthlyPrice)}
                                    </span>
                                    {isEligibleForOffer && (
                                        <span className='text-sm text-muted-foreground line-through decoration-white/30'>
                                            {formatAmount(monthlyPrice)}
                                        </span>
                                    )}
                                </div>
                                {isEligibleForOffer && (
                                    <p className='text-xs text-violet-300/60 mt-2 font-medium italic'>
                                        {t("firstMonthOffer")}{" "}
                                        {t("thenRegularPrice", {
                                            price: formatAmount(monthlyPrice),
                                        })}
                                    </p>
                                )}

                                <CurrencySelector
                                    locale={locale}
                                    defaultCurrency={defaultCurrency}
                                    currency={currency}
                                    onCurrencyChange={onCurrencyChange}
                                />
                            </div>
                            <div className='md:col-span-3 grid md:grid-cols-2 gap-6 pt-6 border-t border-white/10 mt-2'>
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
                                <div className='flex items-center justify-center md:justify-end'>
                                    <Checkout
                                        mode='subscribe'
                                        plan='monthly'
                                        packId={
                                            MONTHLY_PACK_ID ||
                                            MONTHLY_PACKS.id ||
                                            undefined
                                        }
                                        currency={currency}
                                        couponId={monthlyCouponId}
                                        className='w-full md:w-auto'
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                )}

                <TabsContent value='annual'>
                    {/* Annual colored background overlay (indigo) */}
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-indigo-700/10 border-2 border-indigo-500/20' />
                    <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                        <div className='md:col-span-2 text-center md:text-left'>
                            <div className='flex items-center justify-center md:justify-start gap-4'>
                                <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10'>
                                    <Crown className='w-8 h-8 text-indigo-300' />
                                </div>
                                <div className='text-left'>
                                    <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
                                        <h3 className='font-serif text-2xl font-bold leading-tight'>
                                            {t("annualSubscription")}
                                        </h3>
                                        <span className='inline-block px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 font-bold uppercase w-fit sm:mx-0'>
                                            {t("bestValue")}
                                        </span>
                                    </div>
                                    {isMonthlyActive && (
                                        <p className='text-xs text-indigo-300/60 mt-2 font-medium italic'>
                                            Upgrade your current Monthly plan to
                                            Annual and save more!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='flex flex-col items-center md:items-end justify-center space-y-2 bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20 h-full'>
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
                        <div className='md:col-span-3 grid md:grid-cols-2 gap-6 pt-6 border-t border-indigo-500/20 mt-2'>
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
                            <div className='flex items-center justify-center md:justify-end'>
                                <Checkout
                                    mode='subscribe'
                                    plan='annual'
                                    packId={
                                        ANNUALLY_PACK_ID ||
                                        ANNUALLY_PACKS.id ||
                                        undefined
                                    }
                                    currency={currency}
                                    className='w-full md:w-auto'
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    )
}
