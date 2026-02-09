"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Crown, Star } from "lucide-react"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkout } from "@/components/checkout"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
    convertUsdToCurrency,
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import {
    SUBSCRIPTION_PLANS,
    parseSubscriptionPlanKey,
    type BillingCycle,
    type SubscriptionPlanTier,
} from "@/lib/payments/subscription-plans"

type SubscriptionSectionProps = {
    locale: string
    currency: CurrencyCode
}

export default function SubscriptionSection({
    locale,
    currency,
}: SubscriptionSectionProps) {
    const t = useTranslations("Pricing")
    const { user } = useAuth()
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
    const [activePlan, setActivePlan] = useState<{
        tier: SubscriptionPlanTier
        cycle: BillingCycle
    } | null>(null)
    const [upgradeTarget, setUpgradeTarget] = useState<string | null>(null)

    const formatFromUsd = (amount: number) =>
        formatCurrency(convertUsdToCurrency(amount, currency), currency, locale)

    useEffect(() => {
        const fetchActivePlan = async () => {
            if (!user) {
                setActivePlan(null)
                return
            }

            try {
                const { data } = await supabase
                    .from("billing_subscriptions")
                    .select("plan, status")
                    .eq("user_id", user.id)
                    .in("status", ["active", "trialing"])
                    .maybeSingle()

                setActivePlan(parseSubscriptionPlanKey(data?.plan))
            } catch (error) {
                console.error("Error checking subscription:", error)
                setActivePlan(null)
            }
        }

        fetchActivePlan()
    }, [user])

    const handleUpgrade = async (priceId: string) => {
        if (!priceId || upgradeTarget) return
        setUpgradeTarget(priceId)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error("AUTH_REQUIRED")
            }

            const response = await fetch(
                "/api/billing/subscription/upgrade",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ priceId }),
                }
            )

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || "Upgrade failed")
            }

            toast.success(t("upgradeSuccess") || "Upgraded!")
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("signInToUpgrade") || "Please sign in first."
                    : error instanceof Error
                      ? error.message
                      : t("upgradeError") || "Upgrade failed."
            toast.error(message)
        } finally {
            setUpgradeTarget(null)
        }
    }

    return (
        <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20'>
            <div className='flex items-center justify-center mb-8'>
                <div className='bg-muted/30 p-1 border border-border/40 rounded-full h-auto flex gap-2'>
                    {(["monthly", "annual"] as BillingCycle[]).map((cycle) => (
                        <button
                            key={cycle}
                            type='button'
                            onClick={() => setBillingCycle(cycle)}
                            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all duration-300 ${
                                billingCycle === cycle
                                    ? "bg-indigo-600 text-white"
                                    : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            {cycle === "monthly" ? t("monthly") : t("yearly")}
                        </button>
                    ))}
                </div>
            </div>

            <div className='grid md:grid-cols-3 gap-6'>
                {SUBSCRIPTION_PLANS.map((plan) => {
                    const billing = plan.billing?.[billingCycle]
                    const priceId = plan.priceIds?.[billingCycle] ?? ""
                    const isCustom = plan.id === "custom"
                    const isOwned =
                        !isCustom &&
                        activePlan?.tier === plan.id &&
                        activePlan?.cycle === billingCycle
                    const isUpgrade =
                        !isCustom && activePlan && !isOwned
                    const monthlyPrice = plan.billing?.monthly?.priceUsd
                    const annualMonthlyPrice = plan.billing?.annual?.priceUsd
                        ? plan.billing.annual.priceUsd / 12
                        : undefined
                    const displayPrice =
                        billingCycle === "annual"
                            ? annualMonthlyPrice
                            : billing?.priceUsd
                    const discountPercent =
                        billingCycle === "annual" &&
                        monthlyPrice &&
                        annualMonthlyPrice
                            ? Math.round(
                                  (1 - annualMonthlyPrice / monthlyPrice) * 100
                              )
                            : null

                    return (
                        <div
                            key={plan.id}
                            className='relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-6 flex flex-col gap-6'
                        >
                            {isOwned && (
                                <span className='inline-flex w-fit rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-emerald-200'>
                                    {t("owned")}
                                </span>
                            )}
                            {!isOwned && plan.badgeKey && (
                                <span className='inline-flex w-fit rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-indigo-200'>
                                    {t(plan.badgeKey)}
                                </span>
                            )}

                            <div className='space-y-2'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center'>
                                        <Crown className='w-5 h-5 text-indigo-300' />
                                    </div>
                                    <h3 className='text-2xl font-serif font-bold text-white'>
                                        {t(plan.nameKey)}
                                    </h3>
                                </div>
                                <p className='text-sm text-white/70 leading-relaxed'>
                                    {t(plan.descriptionKey)}
                                </p>
                            </div>

                            {isCustom ? (
                                <div className='space-y-4'>
                                    <div className='rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-sm text-indigo-100'>
                                        {t("customCalculated")}
                                    </div>
                                    <Link href={plan.link ?? "/custom-plan"}>
                                        <Button className='w-full rounded-full bg-white text-black hover:bg-white/90'>
                                            {t(plan.ctaKey)}
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <div className='space-y-1'>
                                        <div className='flex items-center gap-2'>
                                            <Star fill='currentColor' className='w-6 h-6 text-yellow-400' />
                                            <div className='text-4xl font-bold text-white'>
                                                {billing?.stars}
                                            </div>
                                        </div>
                                        <div className='text-xs uppercase tracking-widest text-white/60'>
                                            {billingCycle === "monthly"
                                                ? t("starsPerMonth")
                                                : t("starsPerYear")}
                                        </div>
                                    </div>

                                    <div className='space-y-1'>
                                        <div className='flex items-baseline gap-2'>
                                            <span className='text-3xl font-bold text-white'>
                                                {displayPrice != null
                                                    ? formatFromUsd(displayPrice)
                                                    : "--"}
                                            </span>
                                            <span className='text-sm text-muted-foreground'>
                                                {t("perMonth")}
                                            </span>
                                        </div>
                                        {billingCycle === "annual" &&
                                            monthlyPrice != null && (
                                                <div className='flex items-center gap-2 text-xs'>
                                                    <span className='text-white/40 line-through'>
                                                        {formatFromUsd(monthlyPrice)}
                                                        /{t("perMonth")}
                                                    </span>
                                                    {discountPercent !== null &&
                                                        discountPercent > 0 && (
                                                            <span className='inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200'>
                                                                {t(
                                                                    "savePercent",
                                                                    {
                                                                        percent:
                                                                            discountPercent,
                                                                    }
                                                                )}
                                                            </span>
                                                        )}
                                                </div>
                                            )}
                                        {billingCycle === "annual" && (
                                            <div className='text-xs text-white/50 uppercase tracking-widest'>
                                                {t("billedYearly")}
                                            </div>
                                        )}
                                    </div>

                                    <ul className='space-y-2 text-sm text-white/80'>
                                        <li className='flex items-center gap-2'>
                                            <CheckCircle2 className='w-4 h-4 text-indigo-300' />
                                            {t("ongoingSupport")}
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <CheckCircle2 className='w-4 h-4 text-indigo-300' />
                                            {t("bonusStars")}
                                        </li>
                                        <li className='flex items-center gap-2'>
                                            <CheckCircle2 className='w-4 h-4 text-indigo-300' />
                                            {t("cancelFromAccount")}
                                        </li>
                                    </ul>

                                    {isOwned ? (
                                        <Button
                                            className='w-full rounded-full bg-white/10 text-white/70 cursor-not-allowed'
                                            disabled
                                        >
                                            {t("owned")}
                                        </Button>
                                    ) : isUpgrade ? (
                                        <Button
                                            className='w-full rounded-full bg-white text-black hover:bg-white/90'
                                            disabled={
                                                !priceId ||
                                                upgradeTarget === priceId
                                            }
                                            onClick={() =>
                                                handleUpgrade(priceId)
                                            }
                                            aria-busy={
                                                upgradeTarget === priceId
                                            }
                                        >
                                            {t("upgradePlan")}
                                        </Button>
                                    ) : (
                                        <Checkout
                                            mode='subscribe'
                                            plan={billingCycle}
                                            packId={priceId}
                                            className='w-full'
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
