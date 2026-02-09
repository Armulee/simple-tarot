"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Star } from "lucide-react"
import { useLocale } from "next-intl"
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
import { formatCurrency } from "@/lib/payments/currency-utils"
import { useStars } from "@/contexts/stars-context"

export default function NoStarsUpsell() {
    const { user } = useAuth()
    const { subscription } = useStars()
    const pathname = usePathname()
    const locale = useLocale()
    const currency = usePreferredCurrency("USD")

    const packs = useMemo(() => {
        return STAR_PACKS.filter((p) => !!p.id)
    }, [])
    const isProSubscriber = subscription?.tier === "pro"

    return (
        <div className='mt-3 space-y-3 text-center'>
            <div className='text-sm text-white/85'>
                <Link
                    href='/pricing'
                    className='underline text-white hover:text-white/90'
                >
                    View pricing
                </Link>
            </div>

            {user ? (
                <div className='space-y-2 grid grid-cols-1 md:grid-cols-2 gap-2'>
                    <div className='text-xs text-white/75'>
                        Top up (instant):
                    </div>

                    {isProSubscriber && packs.length > 0 ? (
                        <div className='-mx-1'>
                            <Swiper
                                modules={[FreeMode, Mousewheel]}
                                freeMode
                                mousewheel={{
                                    forceToAxis: false,
                                    releaseOnEdges: true,
                                    sensitivity: 1,
                                }}
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
                                                customTrigger={
                                                    <button
                                                        type='button'
                                                        className='w-full rounded-xl border border-yellow-500/30 bg-white/5 hover:bg-white/8 transition px-3 py-3 text-left'
                                                        disabled={!p.id}
                                                    >
                                                        <div className='flex items-center justify-between gap-2'>
                                                            <div className='inline-flex items-center gap-2'>
                                                                <Star
                                                                    className='w-4 h-4 text-yellow-300'
                                                                    fill='currentColor'
                                                                />
                                                                <span className='text-white font-semibold'>
                                                                    {p.stars}
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
                        <div className='text-xs text-white/70'>
                            {isProSubscriber
                                ? "Top ups are not configured yet."
                                : "Top ups are available for Pro subscribers."}
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-sm text-white/80 leading-snug'>
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

