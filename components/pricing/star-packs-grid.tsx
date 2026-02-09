"use client"

import { Card } from "@/components/ui/card"
import {
    Star,
    CheckCircle2,
    ShieldCheck,
} from "lucide-react"
import { Checkout } from "@/components/checkout"
import { useTranslations } from "next-intl"
import {
    STAR_PACKS,
    getPackPrice,
} from "@/lib/payments/star-products"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import CurrencySelector from "./currency-selector"
import { Badge } from "@/components/ui/badge"

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

    return (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {STAR_PACKS.map((p, index) => {
                const isPopular = p.labelKey === "popular"
                const isBestValue = p.labelKey === "bestValue"

                return (
                    <Card
                        key={p.id ?? `star-pack-${index}`}
                        className={`group relative overflow-hidden border-white/5 bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-8 transition-all duration-500 hover:border-yellow-500/30 hover:shadow-2xl hover:shadow-yellow-500/10 hover:-translate-y-1 ${
                            isPopular || isBestValue
                                ? "ring-1 ring-yellow-500/20"
                                : ""
                        }`}
                    >
                        {/* Background Glow */}
                        <div className='absolute -top-24 -right-24 w-48 h-48 bg-yellow-500/5 rounded-full blur-[80px] group-hover:bg-yellow-500/10 transition-colors duration-500' />

                        <div className='relative z-10 space-y-8 h-full flex flex-col'>
                            {/* Header: Label & Icon */}
                            <div className='flex items-start justify-between'>
                                <div className='space-y-1'>
                                    <div className='flex items-center gap-2'>
                                        <Badge
                                            variant='outline'
                                            className={`text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full ${
                                                isPopular
                                                    ? "bg-yellow-400/20 border-yellow-400/30 text-yellow-400"
                                                    : isBestValue
                                                      ? "bg-emerald-400/20 border-emerald-400/30 text-emerald-400"
                                                      : "bg-white/5 border-white/10 text-gray-400"
                                            }`}
                                        >
                                            {p.labelKey
                                                ? t(p.labelKey)
                                                : t("oneTime")}
                                        </Badge>
                                    </div>
                                    <h3 className='text-2xl font-bold text-white font-serif tracking-tight'>
                                        {p.name}
                                    </h3>
                                </div>
                                <div
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform duration-500 group-hover:scale-110 shadow-inner ${
                                        isBestValue
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/5"
                                            : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 shadow-yellow-500/5"
                                    }`}
                                >
                                    <Star
                                        className='w-7 h-7'
                                        fill='currentColor'
                                    />
                                </div>
                            </div>

                            {/* Center Piece: Stars Amount */}
                            <div className='flex flex-col items-center justify-center py-4 relative'>
                                <div className='flex items-baseline gap-2'>
                                    <span className='text-6xl font-black bg-gradient-to-br from-white via-white to-gray-500 bg-clip-text text-transparent tracking-tighter'>
                                        {p.stars}
                                    </span>
                                    <span className='text-xl font-bold text-gray-500 uppercase tracking-widest'>
                                        {t("stars")}
                                    </span>
                                </div>
                                {p.bonus > 0 && (
                                    <div className='absolute -bottom-2 translate-y-1/2'>
                                        <Badge className='bg-emerald-500 text-black border-none font-bold px-3 py-1 rounded-full shadow-lg shadow-emerald-500/20 animate-bounce-slow'>
                                            +{p.bonus} {t("bonus")}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            {/* Pricing Area */}
                            <div className='space-y-4 pt-4 mt-auto'>
                                <div className='flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 group-hover:border-white/10 transition-colors'>
                                    <div className='text-2xl font-bold text-white tracking-tight'>
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

                                <ul className='space-y-3 px-1'>
                                    <li className='flex items-center gap-3 text-xs text-gray-400'>
                                        <CheckCircle2 className='w-4 h-4 text-emerald-400/70' />
                                        {t("instantDelivery")}
                                    </li>
                                    <li className='flex items-center gap-3 text-xs text-gray-400'>
                                        <ShieldCheck className='w-4 h-4 text-blue-400/70' />
                                        {t("secureCheckout")}
                                    </li>
                                </ul>

                                <Checkout
                                    mode='pack'
                                    packId={p.id}
                                    currency={currency}
                                    className='w-full'
                                />
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
