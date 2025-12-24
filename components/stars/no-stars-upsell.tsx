"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Star, Sparkles } from "lucide-react"
import { useLocale } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { Swiper, SwiperSlide } from "swiper/react"
import { FreeMode } from "swiper/modules"
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

export default function NoStarsUpsell() {
    const { user } = useAuth()
    const pathname = usePathname()
    const locale = useLocale()
    const currency = usePreferredCurrency("USD")

    const packs = useMemo(() => {
        // Show 1-time star packs + optionally Infinity, but only if configured.
        const oneTime = STAR_PACKS.filter((p) => !!p.id)
        const infinity = INFINITY_PACK.id ? [INFINITY_PACK] : []
        return [...oneTime, ...infinity]
    }, [])

    return (
        <div className='mt-4 space-y-4'>
            <div className='text-sm text-white/85'>
                <Link
                    href='/pricing'
                    className='underline text-white hover:text-white/90'
                >
                    View pricing
                </Link>
            </div>

            {user ? (
                <div className='space-y-3'>
                    <div className='text-sm text-white/80'>
                        Quick top up (instant):
                    </div>

                    {packs.length > 0 ? (
                        <div className='-mx-1'>
                            <Swiper
                                modules={[FreeMode]}
                                freeMode
                                slidesPerView='auto'
                                spaceBetween={10}
                                className='w-full'
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
                                            className='!w-[172px]'
                                        >
                                            <Checkout
                                                mode='pack'
                                                packId={p.id ?? ""}
                                                currency={currency}
                                                infinityTerm={p.infinityTerm}
                                                customTrigger={
                                                    <button
                                                        type='button'
                                                        className='w-full rounded-xl border border-yellow-500/30 bg-white/5 hover:bg-white/8 transition px-3 py-3 text-left'
                                                        disabled={!p.id}
                                                    >
                                                        <div className='flex items-center justify-between gap-2'>
                                                            <div className='inline-flex items-center gap-2'>
                                                                {p.stars ===
                                                                "infinity" ? (
                                                                    <Sparkles className='w-4 h-4 text-yellow-300' />
                                                                ) : (
                                                                    <Star
                                                                        className='w-4 h-4 text-yellow-300'
                                                                        fill='currentColor'
                                                                    />
                                                                )}
                                                                <span className='text-white font-semibold'>
                                                                    {p.stars ===
                                                                    "infinity"
                                                                        ? "Infinity"
                                                                        : p.stars}
                                                                </span>
                                                            </div>
                                                            {priceLabel && (
                                                                <span className='text-xs text-white/70'>
                                                                    {priceLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className='mt-1 text-xs text-white/65'>
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
                        <div className='text-sm text-white/70'>
                            Top ups are not configured yet.
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-sm text-white/80'>
                    To increase stars usage, please{" "}
                    <Link
                        href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}
                        className='underline text-white hover:text-white/90'
                    >
                        log in
                    </Link>
                    .
                </div>
            )}
        </div>
    )
}

