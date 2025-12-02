"use client"

import { Star, Zap, Crown } from "lucide-react"
import { Checkout } from "@/components/checkout"
import SubscribeDropdown from "@/components/stars/subscribe-dropdown"
import OneTapTopUp from "@/components/stars/one-tap-top-up"
import { useTranslations } from "next-intl"
import { usePreferredCurrency } from "@/hooks/use-preferred-currency"
import type { CurrencyCode } from "@/lib/payments/currency-utils"

type SubscribeSectionProps = {
    defaultCurrency?: CurrencyCode
}

export default function SubscribeSection({
    defaultCurrency = "USD",
}: SubscribeSectionProps) {
    const t = useTranslations("StarsPage")
    const currency = usePreferredCurrency(defaultCurrency)

    return (
        <div className='mb-12'>
            <div className='text-center mb-6'>
                <h2 className='text-2xl font-serif font-semibold text-white mb-2'>
                    {t("subscribe.title")}
                </h2>
                <p className='text-gray-400'>
                    {t("subscribe.subtitle")}
                </p>
            </div>
            {/* Feature highlights */}
            <div className='mb-4 flex flex-wrap justify-center gap-4 text-sm text-gray-400'>
                <div className='flex items-center gap-2'>
                    <Star
                        className='w-4 h-4 text-yellow-400'
                        fill='currentColor'
                    />
                    <span>
                        {t("subscribe.features.unlimitedReadings")}
                    </span>
                </div>
                <div className='flex items-center gap-2'>
                    <Zap className='w-4 h-4 text-yellow-400' />
                    <span>
                        {t("subscribe.features.premiumFeatures")}
                    </span>
                </div>
                <div className='flex items-center gap-2'>
                    <Crown className='w-4 h-4 text-yellow-400' />
                    <span>
                        {t("subscribe.features.prioritySupport")}
                    </span>
                </div>
            </div>

            {/* Subscribe Button */}
            <div className='relative mb-4'>
                <Checkout
                    mode='subscribe'
                    plan='monthly'
                    currency={currency}
                    customTrigger={
                        <button
                            type='button'
                            className='group relative w-full mx-auto rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black border border-yellow-500/40 hover:from-yellow-300 hover:via-amber-400 hover:to-orange-400 transition-all duration-300 px-8 py-4 text-lg font-bold flex items-center justify-center gap-3 hover:scale-105 hover:shadow-2xl hover:shadow-yellow-500/30'
                        >
                            {/* Animated background glow */}
                            <div className='absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl' />

                            {/* Content */}
                            <div className='relative z-10 flex w-full items-center justify-between gap-4'>
                                <div className='flex items-center gap-3'>
                                    <Crown className='w-6 h-6 text-black group-hover:scale-110 transition-transform duration-300' />
                                    <div className='flex flex-col text-left'>
                                        <span>{t("subscribe.button")}</span>
                                    </div>
                                </div>
                                <SubscribeDropdown currency={currency} />
                            </div>

                            {/* Premium badge */}
                            <div className='absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center'>
                                <Crown className='w-3 h-3 text-white' />
                            </div>
                        </button>
                    }
                />
            </div>

            <OneTapTopUp currency={currency} />
        </div>
    )
}

