"use client"

import { Card } from "@/components/ui/card"
import { Star, Infinity as InfinityIcon, CheckCircle2 } from "lucide-react"
import { Checkout } from "@/components/checkout"
import { useTranslations } from "next-intl"
import {
    INFINITY_PACK,
    STAR_PACKS,
    getPackPrice,
} from "@/lib/payments/star-products"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import CurrencySelector from "./currency-selector"

type StarPacksGridProps = {
    locale: string
    currency: CurrencyCode
    defaultCurrency: string
    onCurrencyChange: (currency: CurrencyCode) => void
}

export default function StarPacksGrid({
    locale,
    currency,
    defaultCurrency,
    onCurrencyChange,
}: StarPacksGridProps) {
    const t = useTranslations("Pricing")

    const formatAmount = (amount?: number | null) =>
        amount != null ? formatCurrency(amount, currency, locale) : "--"

    const packIconColor = () => "text-yellow-300"

    const packBadgeClasses = () => "border-yellow-400/30 text-yellow-300"

    const packOverlay = () =>
        "from-amber-500/12 via-amber-600/10 to-orange-600/12"

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {STAR_PACKS.map((p, index) => (
                <Card
                    key={p.id ?? `star-pack-${index}`}
                    className={`relative overflow-visible border-0 p-6 rounded-xl bg-card/10 hover:brightness-110 transition`}
                >
                    <div
                        className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${packOverlay()}`}
                    />
                    <div className='grid grid-cols-1 gap-6 items-center'>
                        <div className='space-y-2 text-left'>
                            <div
                                className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border ${packBadgeClasses()} absolute -top-3 left-2`}
                            >
                                <Star
                                    className={`w-4 h-4 ${packIconColor()}`}
                                />
                                <span>
                                    {p.labelKey ? t(p.labelKey) : t("oneTime")}
                                </span>
                            </div>
                            <div className='inline-flex items-center gap-2 justify-center w-full mt-2'>
                                <span
                                    className={`relative inline-flex items-center gap-3 px-5 py-2 rounded-full border ${packBadgeClasses()}`}
                                >
                                    <Star
                                        className={`w-7 h-7 ${packIconColor()}`}
                                        fill='currentColor'
                                    />
                                    <span
                                        className={`text-3xl font-extrabold leading-none ${packIconColor()}`}
                                    >
                                        {p.stars}
                                    </span>
                                    <span
                                        className={`text-3xl font-extrabold leading-none ${packIconColor()}`}
                                    >
                                        {t("stars")}
                                    </span>
                                    {p.bonus > 0 && (
                                        <span className='absolute -top-3 -right-3 rotate-6 text-xs px-2 py-0.5 rounded border bg-emerald-400 border-emerald-500 text-emerald-950 font-semibold'>
                                            +{p.bonus} bonus
                                        </span>
                                    )}
                                </span>
                            </div>
                            {/* Dynamic Price Box */}
                            <div className='bg-white/10 backdrop-blur-sm border border-yellow-400/30 rounded-lg px-4 py-3'>
                                <div className='flex items-center justify-between gap-2'>
                                    <div className='text-2xl font-bold text-yellow-200'>
                                        {formatAmount(
                                            p.id
                                                ? getPackPrice(p.id, currency)
                                                : null
                                        )}
                                    </div>
                                    <CurrencySelector
                                        locale={locale}
                                        defaultCurrency={defaultCurrency}
                                        currency={currency}
                                        onCurrencyChange={onCurrencyChange}
                                    />
                                </div>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("oneTime")} · {t("instantDelivery")}
                            </div>
                        </div>
                        <div className='space-y-3 text-left'>
                            <ul className='text-sm text-white/80 space-y-1'>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2
                                        className={`w-4 h-4 ${packIconColor()}`}
                                    />{" "}
                                    {t("instantDelivery")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2
                                        className={`w-4 h-4 ${packIconColor()}`}
                                    />{" "}
                                    {t("secureCheckout")}
                                </li>
                                {p.bonus > 0 && (
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2
                                            className={`w-4 h-4 ${packIconColor()}`}
                                        />{" "}
                                        {t("includesBonus")}
                                    </li>
                                )}
                            </ul>
                            <div>
                                <Checkout
                                    mode='pack'
                                    packId={p.id}
                                    currency={currency}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
            {/* Infinity one-time pack */}
            <Card className='relative p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
                <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/12 via-amber-600/10 to-orange-600/12' />
                <div className='z-10 grid grid-cols-1 gap-6 items-center'>
                    <div className='space-y-2 text-left'>
                        <div
                            className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border ${packBadgeClasses()} absolute -top-3 left-2`}
                        >
                            <InfinityIcon className='w-4 h-4' />
                            <span>{t("oneTime")}</span>
                        </div>
                        <div className='inline-flex items-center gap-2 justify-center w-full mt-2'>
                            <span
                                className={`relative inline-flex items-center gap-3 px-5 py-2 rounded-full border ${packBadgeClasses()}`}
                            >
                                <InfinityIcon
                                    className={`w-7 h-7 ${packIconColor()}`}
                                />
                                <span
                                    className={`text-3xl font-extrabold leading-none ${packIconColor()}`}
                                >
                                    Infinity
                                </span>
                            </span>
                        </div>
                        {/* Dynamic Price Box */}
                        <div className='bg-white/10 backdrop-blur-sm border border-yellow-400/30 rounded-lg px-4 py-3'>
                            <div className='flex items-center justify-between gap-2'>
                                <div className='text-2xl font-bold text-yellow-200'>
                                    {formatAmount(
                                        INFINITY_PACK.id
                                            ? getPackPrice(
                                                  INFINITY_PACK.id,
                                                  currency
                                              )
                                            : null
                                    )}
                                </div>
                                <CurrencySelector
                                    locale={locale}
                                    defaultCurrency={defaultCurrency}
                                    currency={currency}
                                    onCurrencyChange={onCurrencyChange}
                                />
                            </div>
                        </div>
                        <div className='text-sm text-muted-foreground'>
                            {t("oneTime")} · 30 {t("days")} ·{" "}
                            {t("instantDelivery")}
                        </div>
                    </div>
                    <div className='space-y-3 text-left'>
                        <ul className='text-sm text-white/80 space-y-1'>
                            <li className='flex items-center gap-2'>
                                <CheckCircle2
                                    className={`w-4 h-4 ${packIconColor()}`}
                                />{" "}
                                {t("infinityStars")}
                            </li>
                            <li className='flex items-center gap-2'>
                                <CheckCircle2
                                    className={`w-4 h-4 ${packIconColor()}`}
                                />{" "}
                                {t("instantDelivery")}
                            </li>
                            <li className='flex items-center gap-2'>
                                <CheckCircle2
                                    className={`w-4 h-4 ${packIconColor()}`}
                                />{" "}
                                {t("oneTimePayment")}
                            </li>
                        </ul>
                        <div>
                            <Checkout
                                mode='pack'
                                packId={INFINITY_PACK.id}
                                infinityTerm={INFINITY_PACK.infinityTerm}
                                currency={currency}
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
