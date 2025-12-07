"use client"

import { useState } from "react"
import { Star, Zap, Crown } from "lucide-react"
import { Checkout } from "@/components/checkout"
import OneTapTopUp from "@/components/stars/one-tap-top-up"
import { useTranslations, useLocale } from "next-intl"
import { usePreferredCurrency } from "@/hooks/use-preferred-currency"
import type { CurrencyCode } from "@/lib/payments/currency-utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type SubscribeSectionProps = {
    defaultCurrency?: CurrencyCode
}

export default function SubscribeSection({
    defaultCurrency = "USD",
}: SubscribeSectionProps) {
    const t = useTranslations("StarsPage")
    const tDropdown = useTranslations("SubscribeDropdown")
    const locale = useLocale()
    const currency = usePreferredCurrency(defaultCurrency)
    const [plan, setPlan] = useState<"monthly" | "annual">("monthly")

    return (
        <div className='mb-12'>
            <div className='text-center mb-6'>
                <h2 className='text-2xl font-serif font-semibold text-white mb-2'>
                    {t("subscribe.title")}
                </h2>
                <p className='text-gray-400'>{t("subscribe.subtitle")}</p>
            </div>
            {/* Feature highlights */}
            <div className='mb-6 flex flex-wrap justify-center gap-4 text-sm text-gray-400'>
                <div className='flex items-center gap-2'>
                    <Star
                        className='w-4 h-4 text-yellow-400'
                        fill='currentColor'
                    />
                    <span>{t("subscribe.features.unlimitedReadings")}</span>
                </div>
                <div className='flex items-center gap-2'>
                    <Zap className='w-4 h-4 text-yellow-400' />
                    <span>{t("subscribe.features.premiumFeatures")}</span>
                </div>
                <div className='flex items-center gap-2'>
                    <Crown className='w-4 h-4 text-yellow-400' />
                    <span>{t("subscribe.features.prioritySupport")}</span>
                </div>
            </div>

            {/* Plan Selection & Subscribe Button Row */}
            <div className='flex flex-row items-center justify-center gap-0 mb-4'>
                {/* Subscribe Button */}
                <div className='relative w-full'>
                    <Checkout
                        mode='subscribe'
                        plan={plan}
                        packId={
                            plan === "monthly"
                                ? (process.env.NEXT_PUBLIC_MONTHLY_PACK_ID ??
                                  "")
                                : (process.env.NEXT_PUBLIC_ANNUALLY_PACK_ID ??
                                  "")
                        }
                        currency={currency}
                        customTrigger={
                            <button
                                type='button'
                                className={`group relative w-full rounded-l-xl rounded-r-none transition-all duration-300 h-14 font-bold flex items-center justify-center gap-2 hover:brightness-110 ${
                                    plan === "annual"
                                        ? "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-black border-y border-l border-yellow-400/60 shadow-yellow-500/20"
                                        : "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black border-y border-l border-yellow-500/40 shadow-yellow-500/15"
                                }`}
                            >
                                {/* Animated background glow */}
                                <div
                                    className={`absolute inset-0 rounded-l-xl rounded-r-none opacity-60 blur-xl animate-pulse ${
                                        plan === "annual"
                                            ? "bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400"
                                            : "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500"
                                    }`}
                                />

                                {/* Content */}
                                <div className='relative z-10 flex w-full items-center justify-center gap-2'>
                                    <Crown
                                        className={`w-5 h-5 group-hover:scale-110 transition-transform duration-300 text-black`}
                                    />
                                    <span>{t("subscribe.button")} </span>
                                </div>

                                {/* Premium badge */}
                                <div className='absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center'>
                                    <Crown className='w-2.5 h-2.5 text-white' />
                                </div>
                            </button>
                        }
                    />
                </div>

                {/* Plan Selection */}
                <div className='w-auto border-l border-white/10'>
                    <Select
                        value={plan}
                        onValueChange={(value) =>
                            setPlan(value as "monthly" | "annual")
                        }
                    >
                        <SelectTrigger
                            className={`w-fit !h-14 rounded-l-none rounded-r-xl border-l-0 text-black font-bold border-r focus:ring-0 focus:ring-offset-0 ${
                                plan === "annual"
                                    ? "bg-yellow-500 border-yellow-400/60"
                                    : "bg-orange-500 border-yellow-500/40"
                            }`}
                        >
                            <SelectValue placeholder={tDropdown("monthly")} />
                        </SelectTrigger>
                        <SelectContent className='bg-zinc-900 border-white/10 text-white'>
                            <SelectItem
                                value='monthly'
                                className='focus:bg-white/10 focus:text-white'
                            >
                                {tDropdown("monthly")}
                            </SelectItem>
                            <SelectItem
                                value='annual'
                                className='focus:bg-white/10 focus:text-white'
                            >
                                {tDropdown("annual")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <OneTapTopUp currency={currency} locale={locale} />
        </div>
    )
}
