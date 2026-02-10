"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Star, LogIn, Clock, Gift, Sparkles, Crown } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode, Mousewheel } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"

import { Checkout } from "@/components/checkout"
import { useAuth } from "@/hooks/use-auth"
import { usePreferredCurrency } from "@/hooks/use-preferred-currency"
import {
    STAR_PACKS,
    getPackPrice,
} from "@/lib/payments/star-products"
import {
    convertUsdToCurrency,
    formatCurrency,
} from "@/lib/payments/currency-utils"
import { Button } from "@/components/ui/button"
import { useStars } from "@/contexts/stars-context"
import { Card } from "@/components/ui/card"
import { SUBSCRIPTION_PLANS } from "@/lib/payments/subscription-plans"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InsufficientStarsBlock() {
    const { user } = useAuth()
    const { subscription } = useStars()
    const pathname = usePathname()
    const locale = useLocale()
    const currency = usePreferredCurrency("USD")
    const t = useTranslations("InsufficientStars")
    const formatDisplayCurrency = (amount: number) =>
        formatCurrency(amount, currency, locale).replace(/^US(?=\$)/, "")

    const packs = useMemo(() => {
        return STAR_PACKS.filter((p) => !!p.id)
    }, [])
    const isProSubscriber = subscription?.tier === "pro"
    const isBasicSubscriber = subscription?.tier === "basic"
    const isSubscribed = Boolean(subscription?.tier)
    const availablePlans = useMemo(() => {
        if (!isSubscribed) {
            return SUBSCRIPTION_PLANS.filter(
                (plan) => plan.id === "basic" || plan.id === "pro"
            )
        }
        if (isBasicSubscriber) {
            return SUBSCRIPTION_PLANS.filter(
                (plan) => plan.id === "basic" || plan.id === "pro"
            )
        }
        return []
    }, [isBasicSubscriber, isSubscribed])

    return (
        <Card className="relative overflow-hidden border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)] p-6 md:p-8">
            {/* Decorative glow elements */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px]" />
            
            <div className="relative z-10 space-y-6 text-center">
                {/* Header Icon */}
                <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                    <Star className="w-8 h-8 text-yellow-300" fill="currentColor" />
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-yellow-200">
                        {t("title")}
                    </h3>
                    <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                        {user ? t("descriptionLoggedIn") : t("descriptionAnonymous")}
                    </p>
                </div>

                {user ? (
                    /* Logged-in user: Show quick top-up options */
                    <div className="space-y-4">
                        {isProSubscriber ? (
                            <>
                                <div className="text-xs text-white/60 uppercase tracking-wider font-medium">
                                    {t("quickTopUp")}
                                </div>

                                {packs.length > 0 ? (
                                    <div className="-mx-2">
                                        <Swiper
                                            modules={[FreeMode, Mousewheel]}
                                            freeMode
                                            mousewheel={{
                                                forceToAxis: false,
                                                releaseOnEdges: true,
                                                sensitivity: 1,
                                            }}
                                            slidesPerView="auto"
                                            spaceBetween={12}
                                            className="w-full px-2"
                                        >
                                            {packs.map((p) => {
                                                const price =
                                                    p.id != null
                                                        ? getPackPrice(
                                                              p.id,
                                                              currency
                                                          )
                                                        : null
                                                const priceLabel =
                                                    price != null
                                                        ? formatDisplayCurrency(
                                                              price
                                                          )
                                                        : null

                                                return (
                                                    <SwiperSlide
                                                        key={p.id ?? p.name}
                                                        className="!w-[180px]"
                                                    >
                                                        <Checkout
                                                            mode="addon"
                                                            packId={p.id ?? ""}
                                                            currency={currency}
                                                            customTrigger={
                                                                <button
                                                                    type="button"
                                                                    className="w-full rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-600/10 hover:from-yellow-500/20 hover:to-amber-600/20 transition-all duration-300 px-4 py-4 text-left hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/20"
                                                                    disabled={
                                                                        !p.id
                                                                    }
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="inline-flex items-center gap-2">
                                                                            <Star
                                                                                className="w-5 h-5 text-yellow-300"
                                                                                fill="currentColor"
                                                                            />
                                                                            <span className="text-white font-bold text-lg">
                                                                                {
                                                                                    p.stars
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        {priceLabel && (
                                                                            <span className="text-sm text-yellow-200/90 font-semibold">
                                                                                {
                                                                                    priceLabel
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="mt-1.5 text-xs text-white/60">
                                                                        {p.name}
                                                                        {p.bonus >
                                                                        0
                                                                            ? ` · +${p.bonus} bonus`
                                                                            : ""}
                                                                    </div>
                                                                </button>
                                                            }
                                                        />
                                                    </SwiperSlide>
                                                )
                                            })}
                                        </Swiper>
                                    </div>
                                ) : (
                                    <div className="text-sm text-white/60">
                                        {t("packsNotConfigured")}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="-mx-2">
                                <div className="rounded-2xl border border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-indigo-500/10 p-4 text-left">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-400/20 border border-fuchsia-300/30">
                                            <Sparkles className="h-4 w-4 text-fuchsia-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-fuchsia-100">
                                                {isBasicSubscriber
                                                    ? t("promoBasicTitle")
                                                    : t("promoGuestTitle")}
                                            </p>
                                            <p className="text-xs text-white/70">
                                                {isBasicSubscriber
                                                    ? t("promoBasicDescription")
                                                    : t("promoGuestDescription")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {availablePlans.length > 0 && (
                                    <Tabs
                                        defaultValue="annual"
                                        className="mt-4"
                                    >
                                        <TabsList className="mb-3">
                                            <TabsTrigger value="monthly">
                                                {t("monthly")}
                                            </TabsTrigger>
                                            <TabsTrigger value="annual">
                                                {t("annual")}
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="monthly">
                                            <div className="flex gap-3">
                                                {availablePlans.map((plan) => {
                                                    const billing =
                                                        plan.billing?.monthly
                                                    const priceId =
                                                        plan.priceIds?.monthly ??
                                                        ""
                                                    const isProPlan =
                                                        plan.id === "pro"
                                                    const stars =
                                                        billing?.stars ?? 0
                                                    const monthlyAmount =
                                                        typeof billing?.priceUsd ===
                                                        "number"
                                                            ? convertUsdToCurrency(
                                                                  billing.priceUsd,
                                                                  currency
                                                              )
                                                            : null
                                                    const priceLabel =
                                                        monthlyAmount != null
                                                            ? formatDisplayCurrency(
                                                                  monthlyAmount
                                                              )
                                                            : t("unavailable")
                                                    const isOwned =
                                                        subscription?.tier ===
                                                            plan.id &&
                                                        subscription?.cycle ===
                                                            "monthly"

                                                    return (
                                                        <div
                                                            key={plan.id}
                                                            className={`group relative w-full rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                                                                isProPlan
                                                                    ? "border-yellow-400/40 bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/10 hover:shadow-xl hover:shadow-yellow-500/20"
                                                                    : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]"
                                                            }`}
                                                        >
                                                            {isProPlan && (
                                                                <div className="absolute right-2 -top-3 inline-flex items-center gap-1 rounded-full border border-yellow-300/40 bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-100">
                                                                    <Crown className="h-3.5 w-3.5" />
                                                                    {t("bestValue")}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-bold text-white">
                                                                    {plan.id === "pro"
                                                                        ? t("proPlan")
                                                                        : t("basicPlan")}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-white/65 flex items-center gap-2 w-full">
                                                                <Star
                                                                    fill="currentColor"
                                                                    className="w-4 h-4 text-yellow-300"
                                                                />{" "}
                                                                {t("starsPerMonthLabel", {
                                                                    stars,
                                                                })}
                                                            </p>
                                                            <div className="mt-3">
                                                                <span className="text-xl font-black text-white">
                                                                    {priceLabel}
                                                                </span>
                                                                <span className="ml-1 text-xs text-white/60">
                                                                    {t("perMonth")}
                                                                </span>
                                                            </div>

                                                            <div className="mt-4 space-y-3">
                                                                {isOwned ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled
                                                                        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/10 text-white/50 cursor-not-allowed"
                                                                    >
                                                                        {t("owned")}
                                                                    </button>
                                                                ) : (
                                                                    <Checkout
                                                                        mode="subscribe"
                                                                        plan="monthly"
                                                                        packId={
                                                                            priceId
                                                                        }
                                                                        currency={
                                                                            currency
                                                                        }
                                                                        customTrigger={
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    !priceId
                                                                                }
                                                                                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                                                                    priceId
                                                                                        ? isProPlan
                                                                                            ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400"
                                                                                            : "bg-white text-black hover:bg-white/90"
                                                                                        : "cursor-not-allowed bg-white/10 text-white/50"
                                                                                }`}
                                                                            >
                                                                                {isBasicSubscriber &&
                                                                                plan.id ===
                                                                                    "pro"
                                                                                    ? t("upgradeNow")
                                                                                    : t("getPlan", {
                                                                                          plan:
                                                                                              plan.id ===
                                                                                              "pro"
                                                                                                  ? t(
                                                                                                        "proShort"
                                                                                                    )
                                                                                                  : t(
                                                                                                        "basicShort"
                                                                                                    ),
                                                                                      })}
                                                                            </button>
                                                                        }
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="annual">
                                            <div className="flex gap-3">
                                                {availablePlans.map((plan) => {
                                                    const billing =
                                                        plan.billing?.annual
                                                    const priceId =
                                                        plan.priceIds?.annual ??
                                                        ""
                                                    const isProPlan =
                                                        plan.id === "pro"
                                                    const stars =
                                                        billing?.stars ?? 0
                                                    const monthlyPriceUsd =
                                                        plan.billing?.monthly
                                                            ?.priceUsd
                                                    const annualMonthlyUsd =
                                                        typeof billing?.priceUsd ===
                                                        "number"
                                                            ? billing.priceUsd /
                                                              12
                                                            : null
                                                    const discountPercent =
                                                        monthlyPriceUsd &&
                                                        annualMonthlyUsd
                                                            ? Math.round(
                                                                  (1 -
                                                                      annualMonthlyUsd /
                                                                          monthlyPriceUsd) *
                                                                      100
                                                              )
                                                            : null
                                                    const annualMonthlyAmount =
                                                        annualMonthlyUsd != null
                                                            ? convertUsdToCurrency(
                                                                  annualMonthlyUsd,
                                                                  currency
                                                              )
                                                            : null
                                                    const regularMonthlyAmount =
                                                        typeof monthlyPriceUsd ===
                                                        "number"
                                                            ? convertUsdToCurrency(
                                                                  monthlyPriceUsd,
                                                                  currency
                                                              )
                                                            : null
                                                    const priceLabel =
                                                        annualMonthlyAmount !=
                                                        null
                                                            ? formatDisplayCurrency(
                                                                  annualMonthlyAmount
                                                              )
                                                            : t("unavailable")
                                                    const isOwned =
                                                        subscription?.tier ===
                                                            plan.id &&
                                                        subscription?.cycle ===
                                                            "annual"

                                                    return (
                                                        <div
                                                            key={plan.id}
                                                            className={`group relative w-full rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                                                                isProPlan
                                                                    ? "border-yellow-400/40 bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/10 hover:shadow-xl hover:shadow-yellow-500/20"
                                                                    : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/[0.07]"
                                                            }`}
                                                        >
                                                            {isProPlan && (
                                                                <div className="absolute right-2 -top-3 inline-flex items-center gap-1 rounded-full border border-yellow-300/40 bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-100">
                                                                    <Crown className="h-3.5 w-3.5" />
                                                                    {t("bestValue")}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-bold text-white">
                                                                    {plan.id === "pro"
                                                                        ? t("proPlan")
                                                                        : t("basicPlan")}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-white/65 flex items-center gap-2 w-full">
                                                                <Star
                                                                    fill="currentColor"
                                                                    className="w-4 h-4 text-yellow-300"
                                                                />{" "}
                                                                {t("starsPerYearLabel", {
                                                                    stars,
                                                                })}
                                                            </p>
                                                            <div className="mt-3">
                                                                <span className="text-xl font-black text-white">
                                                                    {priceLabel}
                                                                </span>
                                                                <span className="ml-1 text-xs text-white/60">
                                                                    {t("perMonth")}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1">
                                                                {regularMonthlyAmount !=
                                                                    null && (
                                                                    <span className="text-[11px] text-white/45 line-through">
                                                                        {formatDisplayCurrency(
                                                                            regularMonthlyAmount
                                                                        )}
                                                                        {t("perMonth")}
                                                                    </span>
                                                                )}
                                                                {discountPercent !==
                                                                    null &&
                                                                    discountPercent >
                                                                        0 && (
                                                                        <span className="inline-flex rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                                                                            {t("savePercent", {
                                                                                percent: discountPercent,
                                                                            })}
                                                                        </span>
                                                                    )}
                                                            </div>

                                                            <div className="mt-4 space-y-3">
                                                                {isOwned ? (
                                                                    <button
                                                                        type="button"
                                                                        disabled
                                                                        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/10 text-white/50 cursor-not-allowed"
                                                                    >
                                                                        {t("owned")}
                                                                    </button>
                                                                ) : (
                                                                    <Checkout
                                                                        mode="subscribe"
                                                                        plan="annual"
                                                                        packId={
                                                                            priceId
                                                                        }
                                                                        currency={
                                                                            currency
                                                                        }
                                                                        customTrigger={
                                                                            <button
                                                                                type="button"
                                                                                disabled={
                                                                                    !priceId
                                                                                }
                                                                                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                                                                                    priceId
                                                                                        ? isProPlan
                                                                                            ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400"
                                                                                            : "bg-white text-black hover:bg-white/90"
                                                                                        : "cursor-not-allowed bg-white/10 text-white/50"
                                                                                }`}
                                                                            >
                                                                                {isBasicSubscriber &&
                                                                                plan.id ===
                                                                                    "pro"
                                                                                    ? t("upgradeNow")
                                                                                    : t("getPlan", {
                                                                                          plan:
                                                                                              plan.id ===
                                                                                              "pro"
                                                                                                  ? t(
                                                                                                        "proShort"
                                                                                                    )
                                                                                                  : t(
                                                                                                        "basicShort"
                                                                                                    ),
                                                                                      })}
                                                                            </button>
                                                                        }
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                )}
                            </div>
                        )}

                        {/* Link to pricing page */}
                        <div className="pt-2">
                            <Link
                                href="/pricing"
                                className="text-sm text-yellow-300 hover:text-yellow-200 underline underline-offset-2 transition-colors"
                            >
                                {t("viewAllOptions")}
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Anonymous user: Show sign-in prompt */
                    <div className="space-y-6">
                        {/* Benefits of signing in */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm mx-auto">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                                    <Gift className="w-5 h-5 text-yellow-300" />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-semibold text-sm">{t("benefit1Title")}</div>
                                    <div className="text-white/60 text-xs">{t("benefit1Desc")}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-5 h-5 text-blue-300" />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-semibold text-sm">{t("benefit2Title")}</div>
                                    <div className="text-white/60 text-xs">{t("benefit2Desc")}</div>
                                </div>
                            </div>
                        </div>

                        {/* Sign-in button */}
                        <Link
                            href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}
                        >
                            <Button
                                size="lg"
                                className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold px-8 shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:scale-105 mb-3"
                            >
                                <LogIn className="w-5 h-5 mr-2" />
                                {t("signInButton")}
                            </Button>
                        </Link>

                        {/* Additional info */}
                        <p className="text-xs text-white/50 max-w-xs mx-auto">
                            {t("signInNote")}
                        </p>
                    </div>
                )}
            </div>
        </Card>
    )
}
