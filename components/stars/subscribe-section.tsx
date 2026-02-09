"use client"

import { useState, useEffect } from "react"
import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react"
import { Checkout } from "@/components/checkout"
import OneTapTopUp from "@/components/stars/one-tap-top-up"
import { useTranslations, useLocale } from "next-intl"
import { usePreferredCurrency } from "@/hooks/use-preferred-currency"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import CurrencySelector from "@/components/pricing/currency-selector"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    convertUsdToCurrency,
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import {
    SUBSCRIPTION_PLANS,
    getPlanPriceUsd,
    parseSubscriptionPlanKey,
    type BillingCycle,
    type SubscriptionPlanTier,
} from "@/lib/payments/subscription-plans"

type SubscribeSectionProps = {
    defaultCurrency?: CurrencyCode
}

type PlanChangePrompt = {
    priceId: string
    action: "upgrade" | "downgrade"
    targetPriceUsd: number
}

export default function SubscribeSection({
    defaultCurrency = "USD",
}: SubscribeSectionProps) {
    const t = useTranslations("StarsPage")
    const locale = useLocale()
    const localeDefaultCurrency = locale === "th" ? "THB" : "USD"
    const preferredCurrency = usePreferredCurrency(
        defaultCurrency ?? localeDefaultCurrency
    )
    const [currency, setCurrency] = useState(preferredCurrency)
    const { user } = useAuth()
    const [billingCycle, setBillingCycle] =
        useState<BillingCycle>("monthly")
    const [activePlan, setActivePlan] = useState<{
        tier: SubscriptionPlanTier
        cycle: BillingCycle
    } | null>(null)
    const [changeTarget, setChangeTarget] = useState<string | null>(null)
    const [pendingChange, setPendingChange] = useState<PlanChangePrompt | null>(
        null
    )
    const proBaselineMonthlyStars = 599
    const proBaselineAnnualStars = 7188

    useEffect(() => {
        setCurrency(preferredCurrency)
    }, [preferredCurrency])

    useEffect(() => {
        if (activePlan) {
            setBillingCycle(activePlan.cycle)
        }
    }, [activePlan])

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

    const currentPlanPrice = activePlan
        ? getPlanPriceUsd(activePlan.tier, activePlan.cycle)
        : null

    const getPlanAction = (
        tier: SubscriptionPlanTier,
        cycle: BillingCycle
    ): "subscribe" | "current" | "upgrade" | "downgrade" => {
        if (!activePlan) return "subscribe"
        if (activePlan.tier === tier && activePlan.cycle === cycle) {
            return "current"
        }
        if (currentPlanPrice == null) return "upgrade"
        const targetPrice = getPlanPriceUsd(tier, cycle)
        return targetPrice >= currentPlanPrice ? "upgrade" : "downgrade"
    }

    const handlePlanChange = async (priceId: string) => {
        if (!priceId || changeTarget) return
        setChangeTarget(priceId)
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

            toast.success(t("subscribe.upgradeSuccess") || "Plan updated!")
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("subscribe.signInToUpgrade") || "Please sign in first."
                    : error instanceof Error
                      ? error.message
                      : t("subscribe.upgradeError") || "Upgrade failed."
            toast.error(message)
        } finally {
            setChangeTarget(null)
        }
    }

    const confirmPlanChange = async () => {
        if (!pendingChange) return
        const priceId = pendingChange.priceId
        setPendingChange(null)
        await handlePlanChange(priceId)
    }

    return (
        <div className='mb-12'>
            <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
                <div className='bg-black/30 border border-white/10 rounded-full p-1 flex gap-2'>
                    {(["monthly", "annual"] as BillingCycle[]).map((cycle) => (
                        <button
                            key={cycle}
                            type='button'
                            onClick={() => setBillingCycle(cycle)}
                            className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-300 ${
                                billingCycle === cycle
                                    ? "bg-yellow-400 text-black"
                                    : "text-white/60 hover:text-white"
                            }`}
                        >
                            {cycle === "monthly"
                                ? t("subscribe.monthly")
                                : t("subscribe.annual")}
                        </button>
                    ))}
                </div>
                <CurrencySelector
                    locale={locale}
                    defaultCurrency={preferredCurrency}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                />
            </div>

            <div className='grid md:grid-cols-2 gap-4 mb-6'>
                {SUBSCRIPTION_PLANS.filter(
                    (plan) =>
                        !(
                            activePlan &&
                            plan.id === activePlan.tier &&
                            billingCycle === activePlan.cycle
                        )
                ).map((plan) => {
                            const billing = plan.billing?.[billingCycle]
                            const priceId = plan.priceIds?.[billingCycle] ?? ""
                            const monthlyPrice = plan.billing?.monthly?.priceUsd
                            const annualMonthlyPrice =
                                billingCycle === "annual" &&
                                typeof billing?.priceUsd === "number"
                                    ? billing.priceUsd / 12
                                    : null
                            const discountPercent =
                                billingCycle === "annual" &&
                                monthlyPrice &&
                                annualMonthlyPrice
                                    ? Math.round(
                                          (1 - annualMonthlyPrice / monthlyPrice) *
                                              100
                                      )
                                    : null
                            const proMonthlyStars =
                                plan.id === "pro" &&
                                billingCycle === "monthly" &&
                                typeof billing?.stars === "number"
                                    ? billing.stars
                                    : null
                            const proAnnualStars =
                                plan.id === "pro" &&
                                billingCycle === "annual" &&
                                typeof billing?.stars === "number"
                                    ? billing.stars
                                    : null
                            const proMonthlySavingsPercent = proMonthlyStars
                                ? Math.round(
                                      (1 -
                                          proBaselineMonthlyStars /
                                              proMonthlyStars) *
                                          100
                                  )
                                : null
                            const proAnnualSavingsPercent = proAnnualStars
                                ? Math.round(
                                      (1 -
                                          proBaselineAnnualStars /
                                              proAnnualStars) *
                                          100
                                  )
                                : null

                            const action = getPlanAction(
                                plan.id as SubscriptionPlanTier,
                                billingCycle
                            )
                            const targetPriceUsd = getPlanPriceUsd(
                                plan.id as SubscriptionPlanTier,
                                billingCycle
                            )
                            const isDowngrade = action === "downgrade"

                            return (
                                <div
                                    key={plan.id}
                                    className='rounded-2xl border border-white/10 bg-black/40 p-6 flex items-center justify-between gap-4'
                                >
                                    <div className='flex-1'>
                                        <div className='flex flex-wrap items-center gap-2 mb-1'>
                                            <div className='text-lg font-semibold text-white'>
                                                {t(`subscribe.${plan.id}.title`)}
                                            </div>
                                            {plan.badgeKey && (
                                                <span className='inline-flex rounded-full bg-yellow-400/20 border border-yellow-400/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-yellow-200'>
                                                    {t("subscribe.mostPopular")}
                                                </span>
                                            )}
                                        </div>
                                        <div className='text-xs text-white/60 mb-3'>
                                            {t(
                                                `subscribe.${plan.id}.subtitle`
                                            )}
                                        </div>
                                        <div className='flex items-center gap-2 text-2xl font-bold text-white mb-1'>
                                            <Star fill='currentColor' className='w-6 h-6 text-yellow-400' />
                                            {billing?.stars ?? "--"}
                                        </div>
                                        <div className='text-xs uppercase tracking-widest text-white/60 mb-2'>
                                            {billingCycle === "annual"
                                                ? t("subscribe.starsPerYear")
                                                : t("subscribe.starsPerMonth")}
                                        </div>
                                        {proMonthlySavingsPercent !== null &&
                                            proMonthlySavingsPercent > 0 && (
                                                <div className='text-xs text-emerald-200 mb-2'>
                                                    {t(
                                                        "subscribe.saveStarsPercent",
                                                        {
                                                            percent:
                                                                proMonthlySavingsPercent,
                                                            from: proBaselineMonthlyStars,
                                                            to: proMonthlyStars ?? 0,
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        {proAnnualSavingsPercent !== null &&
                                            proAnnualSavingsPercent > 0 && (
                                                <div className='text-xs text-emerald-200 mb-2'>
                                                    {t(
                                                        "subscribe.saveStarsPercent",
                                                        {
                                                            percent:
                                                                proAnnualSavingsPercent,
                                                            from: proBaselineAnnualStars,
                                                            to: proAnnualStars ?? 0,
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        {discountPercent !== null &&
                                            discountPercent > 0 && (
                                                <div className='mb-2'>
                                                    <span className='inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200'>
                                                        {t(
                                                            "subscribe.savePercent",
                                                            { percent: discountPercent }
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        <div className='text-sm text-white/80'>
                                            {billing
                                                ? t("subscribe.priceLabel", {
                                                      price: formatCurrency(
                                                          convertUsdToCurrency(
                                                              annualMonthlyPrice ??
                                                                  billing.priceUsd,
                                                              currency
                                                          ),
                                                          currency,
                                                          locale
                                                      ),
                                                      cycle:
                                                          billingCycle ===
                                                          "annual"
                                                              ? t(
                                                                    "subscribe.annual"
                                                                )
                                                              : t(
                                                                    "subscribe.monthly"
                                                                ),
                                                  })
                                                : t("subscribe.notConfigured")}
                                        </div>
                                    </div>

                                    {activePlan ? (
                                        <button
                                            type='button'
                                            className={`h-full min-h-[120px] rounded-xl border transition-colors flex flex-col items-center justify-center gap-2 ${
                                                isDowngrade
                                                    ? "bg-red-950/60 border-red-900/40 hover:bg-red-950/80 text-red-100 px-4 py-3 w-fit min-w-[96px]"
                                                    : "bg-yellow-500/15 border-yellow-500/30 hover:bg-yellow-500/25 text-yellow-200 px-3 w-16"
                                            }`}
                                            onClick={() =>
                                                setPendingChange({
                                                    priceId,
                                                    action: isDowngrade
                                                        ? "downgrade"
                                                        : "upgrade",
                                                    targetPriceUsd,
                                                })
                                            }
                                            disabled={
                                                !priceId ||
                                                changeTarget === priceId
                                            }
                                            aria-busy={changeTarget === priceId}
                                        >
                                            {isDowngrade ? (
                                                <ArrowDownRight className='w-5 h-5 text-red-200' />
                                            ) : (
                                                <ArrowUpRight className='w-5 h-5 text-yellow-300' />
                                            )}
                                            <span
                                                className={`text-[10px] font-semibold uppercase tracking-widest text-center ${
                                                    isDowngrade
                                                        ? "text-red-100"
                                                        : "text-yellow-200"
                                                }`}
                                            >
                                                {action === "downgrade"
                                                    ? t(
                                                          "subscribe.downgrade"
                                                      ) || "Downgrade"
                                                    : t("subscribe.upgrade") ||
                                                      "Upgrade"}
                                            </span>
                                        </button>
                                    ) : (
                                        <Checkout
                                            mode='subscribe'
                                            plan={billingCycle}
                                            packId={priceId}
                                            currency={currency}
                                            customTrigger={
                                                <button
                                                    type='button'
                                                    className='h-full min-h-[120px] w-16 rounded-xl border border-yellow-500/30 bg-yellow-500/15 hover:bg-yellow-500/25 transition-colors flex flex-col items-center justify-center gap-2 px-3'
                                                >
                                                    <ArrowUpRight className='w-5 h-5 text-yellow-300' />
                                                    <span className='text-[10px] font-semibold uppercase tracking-widest text-yellow-200 text-center'>
                                                        {t("subscribe.upgrade") ||
                                                            "Upgrade"}
                                                    </span>
                                                </button>
                                            }
                                        />
                                    )}
                                </div>
                            )
                        })}
            </div>

            <AlertDialog
                open={Boolean(pendingChange)}
                onOpenChange={(open) => {
                    if (!open) setPendingChange(null)
                }}
            >
                <AlertDialogContent className='bg-background/95 backdrop-blur-sm border border-border/50'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='text-white font-semibold'>
                            {pendingChange?.action === "downgrade"
                                ? t("subscribe.downgradeDialogTitle")
                                : t("subscribe.upgradeDialogTitle")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='text-muted-foreground'>
                            {pendingChange?.action === "downgrade"
                                ? t("subscribe.downgradeDialogDescription")
                                : t("subscribe.upgradeDialogDescription", {
                                      amount: formatCurrency(
                                          convertUsdToCurrency(
                                              Math.max(
                                                  0,
                                                  (pendingChange?.targetPriceUsd ??
                                                      0) -
                                                      (currentPlanPrice ?? 0)
                                              ),
                                              currency
                                          ),
                                          currency,
                                          locale
                                      ),
                                  })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className='border-border/40 text-muted-foreground hover:bg-background/20'>
                            {t("subscribe.dialogCancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmPlanChange}
                            disabled={
                                !pendingChange ||
                                (changeTarget != null &&
                                    changeTarget === pendingChange.priceId)
                            }
                            className={
                                pendingChange?.action === "downgrade"
                                    ? "bg-red-700 hover:bg-red-800 text-white"
                                    : "bg-yellow-500 hover:bg-yellow-600 text-black"
                            }
                        >
                            {t("subscribe.dialogConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {activePlan?.tier === "pro" && (
                <>
                    {/* Subscribe Section */}
                    <span className='font-serif text-sm text-gray-400 text-center w-full block mb-2 text-lg font-bold text-zinc-300'>
                        ADDITIONAL ADD-ON STARS PACKS
                    </span>

                    <OneTapTopUp currency={currency} locale={locale} />
                </>
            )}
        </div>
    )
}
