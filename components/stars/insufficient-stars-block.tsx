"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Star, Sparkles, LogIn, Clock, Gift } from "lucide-react"
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
    INFINITY_PACK,
} from "@/lib/payments/star-products"
import { formatCurrency } from "@/lib/payments/currency-utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function InsufficientStarsBlock() {
    const { user } = useAuth()
    const pathname = usePathname()
    const locale = useLocale()
    const currency = usePreferredCurrency("USD")
    const t = useTranslations("InsufficientStars")

    const packs = useMemo(() => {
        // Show 1-time star packs + optionally Infinity, but only if configured.
        const oneTime = STAR_PACKS.filter((p) => !!p.id)
        const infinity = INFINITY_PACK.id ? [INFINITY_PACK] : []
        return [...oneTime, ...infinity]
    }, [])

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
                                                ? getPackPrice(p.id, currency)
                                                : null
                                        const priceLabel =
                                            price != null
                                                ? formatCurrency(
                                                      price,
                                                      currency,
                                                      locale
                                                  )
                                                : null

                                        return (
                                            <SwiperSlide
                                                key={p.id ?? p.name}
                                                className="!w-[180px]"
                                            >
                                                <Checkout
                                                    mode="pack"
                                                    packId={p.id ?? ""}
                                                    currency={currency}
                                                    infinityTerm={p.infinityTerm}
                                                    customTrigger={
                                                        <button
                                                            type="button"
                                                            className="w-full rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-600/10 hover:from-yellow-500/20 hover:to-amber-600/20 transition-all duration-300 px-4 py-4 text-left hover:scale-[1.02] hover:shadow-lg hover:shadow-yellow-500/20"
                                                            disabled={!p.id}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="inline-flex items-center gap-2">
                                                                    {p.stars ===
                                                                    "infinity" ? (
                                                                        <Sparkles className="w-5 h-5 text-yellow-300" />
                                                                    ) : (
                                                                        <Star
                                                                            className="w-5 h-5 text-yellow-300"
                                                                            fill="currentColor"
                                                                        />
                                                                    )}
                                                                    <span className="text-white font-bold text-lg">
                                                                        {p.stars ===
                                                                        "infinity"
                                                                            ? "Infinity"
                                                                            : p.stars}
                                                                    </span>
                                                                </div>
                                                                {priceLabel && (
                                                                    <span className="text-sm text-yellow-200/90 font-semibold">
                                                                        {priceLabel}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1.5 text-xs text-white/60">
                                                                {p.name}
                                                                {p.bonus > 0
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
