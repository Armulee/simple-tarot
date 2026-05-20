"use client"

import { Crown, Lock, Sparkles } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { DayData } from "@/lib/calendar-helper"
import type { CalendarPlanTier } from "@/lib/calendar/access-window"
import {
    formatCurrency,
    type CurrencyCode,
} from "@/lib/payments/currency-utils"
import { getPlanPrice } from "@/lib/payments/subscription-plans"
import type { HoroscopeBirthData } from "@/types/horoscope"
import { AskCalendarAI } from "./AskCalendarAI"
import { DetailHeaderCard } from "./DetailHeaderCard"
import { EventSignalsCard } from "./EventSignalsCard"
import { LuckyCard } from "./LuckyCard"
import { PremiumUpsellCard } from "./PremiumUpsellCard"
import { SelectedTransitCard } from "./SelectedTransitCard"
import { VitalityCard } from "./VitalityCard"
import type { TransitDayFetchState } from "./types"

export function DetailPanel({
    data,
    isSelectedDateLoaded,
    isMissingCodex,
    isPlanLocked,
    planTier,
    birthData,
    locale,
    today,
    selectedIso,
    transitState,
}: {
    data: DayData | null
    isSelectedDateLoaded: boolean
    isMissingCodex: boolean
    isPlanLocked: boolean
    planTier: CalendarPlanTier
    birthData: HoroscopeBirthData | null
    locale: string
    today: Date | null
    selectedIso: string | null
    transitState: TransitDayFetchState | null
}) {
    const t = useTranslations("Calendar")

    return (
        <div className='lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto space-y-4 pb-2 pr-1 [scrollbar-color:rgba(255,255,255,0.15)_transparent] [scrollbar-width:thin]'>
            {isPlanLocked ? (
                <LockedDetailCard planTier={planTier} />
            ) : data ? (
                <>
                    <DetailHeaderCard data={data} />
                    <SelectedTransitCard
                        isoDate={selectedIso}
                        chartData={
                            transitState?.status === "ok"
                                ? transitState.chartData
                                : null
                        }
                        personalizedTransitAspects={
                            transitState?.status === "ok"
                                ? transitState.personalizedTransitAspects
                                : null
                        }
                        status={
                            transitState?.status === "ok"
                                ? "ready"
                                : transitState?.status === "error"
                                  ? "error"
                                  : transitState?.status === "loading"
                                    ? "loading"
                                    : "idle"
                        }
                    />
                    <VitalityCard data={data} />
                    <EventSignalsCard data={data} />
                    <LuckyCard data={data} />
                    <PremiumUpsellCard />
                </>
            ) : isMissingCodex ? (
                <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 text-center text-white/60 space-y-2'>
                    <Lock className='h-5 w-5 text-white/40 mx-auto' />
                    <div className='text-sm'>{t("detail.missingTitle")}</div>
                    <div className='text-xs text-white/40'>
                        {t("detail.missingBody")}
                    </div>
                </div>
            ) : !isSelectedDateLoaded ? (
                <div className='space-y-4'>
                    <div className='h-48 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse' />
                    <div className='h-32 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse' />
                    <div className='h-40 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl animate-pulse' />
                </div>
            ) : (
                <div className='rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 text-center text-white/50'>
                    {t("detail.selectPrompt")}
                </div>
            )}

            {birthData ? (
                <AskCalendarAI
                    birthData={birthData}
                    planTier={planTier}
                    locale={locale}
                    today={today}
                />
            ) : null}
        </div>
    )
}

function LockedDetailCard({ planTier }: { planTier: CalendarPlanTier }) {
    const t = useTranslations("Calendar")
    const locale = useLocale()
    const currency: CurrencyCode = locale === "th" ? "THB" : "USD"
    const targetTier = planTier === "basic" ? "pro" : "basic"
    const subscribeHash =
        targetTier === "basic" ? "subscribe-basic" : "subscribe-pro"
    const bodyKey =
        planTier === "basic" ? "locked.bodyBasic" : "locked.bodyFree"
    const ctaKey = planTier === "basic" ? "locked.ctaBasic" : "locked.ctaFree"
    const priceAmount = getPlanPrice(targetTier, "monthly", currency)
    const priceLabel = formatCurrency(priceAmount, currency, locale).replace(
        /^US(?=\$)/,
        "",
    )

    return (
        <div className='relative overflow-hidden rounded-3xl border border-amber-300/40 bg-gradient-to-br from-amber-400/15 via-amber-300/5 to-transparent backdrop-blur-xl p-6 space-y-4'>
            <div className='pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl' />
            <div className='pointer-events-none absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-violet-500/20 blur-3xl' />

            <div className='relative flex items-center gap-3'>
                <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-300/40 shadow-[0_0_24px_-6px_rgba(252,211,77,0.5)]'>
                    <Crown className='h-5 w-5' />
                </span>
                <div className='font-serif italic text-xl text-white leading-tight'>
                    {t("locked.title")}
                </div>
            </div>

            <p className='relative text-sm text-white/75 leading-relaxed'>
                {t(bodyKey, { price: priceLabel })}
            </p>

            {planTier === "free" ? (
                <p className='relative text-xs text-white/55 leading-relaxed'>
                    {t("locked.noteFree")}
                </p>
            ) : null}

            <Link
                href={`/stars#${subscribeHash}`}
                className='relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-200 transition-colors shadow-[0_8px_24px_-8px_rgba(252,211,77,0.6)]'
            >
                <Sparkles className='h-4 w-4' />
                {t(ctaKey)}
            </Link>
        </div>
    )
}
