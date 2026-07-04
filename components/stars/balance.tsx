"use client"

import { Clock, LogIn, Star } from "lucide-react"
import { useStars } from "@/contexts/stars-context"
import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import StarCard from "../star-card"
import { useTranslations } from "next-intl"
import Link from "next/link"

export default function StarsBalance() {
    const {
        stars,
        dailyStars,
        planStars,
        addonStars,
        engagementStarsCurrent,
        engagementStarsTotal,
        nextRefillAt,
        refillCap,
        refillCycleMs,
        subscription,
    } = useStars()
    const { user } = useAuth()
    const t = useTranslations()

    const [now, setNow] = useState<number>(Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const dailyCap = refillCap
    const dailyValue = typeof dailyStars === "number" ? dailyStars : 0
    const planValue = typeof planStars === "number" ? planStars : 0
    const addonValue = typeof addonStars === "number" ? addonStars : 0
    const engagementCurrent =
        typeof engagementStarsCurrent === "number" ? engagementStarsCurrent : 0
    const engagementTotal =
        typeof engagementStarsTotal === "number" ? engagementStarsTotal : 0
    const currentStars = typeof stars === "number" ? stars : 0
    const planCap = subscription?.baseStars ?? 0
    const addonCap = subscription?.addonStars ?? 0

    const dailyProgress =
        dailyCap > 0 ? Math.min(100, (dailyValue / dailyCap) * 100) : 0
    const planProgress =
        planCap > 0 ? Math.min(100, (planValue / planCap) * 100) : 0
    const addonProgress =
        addonCap > 0 ? Math.min(100, (addonValue / addonCap) * 100) : 0
    const engagementProgress =
        engagementTotal > 0
            ? Math.min(100, (engagementCurrent / engagementTotal) * 100)
            : 0

    const planRefillLabel = subscription?.currentPeriodEnd
        ? formatRefillDate(subscription.currentPeriodEnd)
        : ""
    const timeLeft = nextRefillAt ? Math.max(0, nextRefillAt - now) : 0
    const refillCycle = refillCycleMs ?? 5 * 60 * 60 * 1000
    const dailyRefillProgress = nextRefillAt
        ? Math.min(100, Math.max(0, (1 - timeLeft / refillCycle) * 100))
        : dailyValue >= dailyCap
          ? 100
          : 0
    const dailyRefillLabel = nextRefillAt
        ? formatRelativeTime(nextRefillAt, now)
        : "-"
    const planLabel = subscription
        ? `${t(`Pricing.${subscription.tier}Plan`)} · ${
              subscription.cycle === "annual"
                  ? t("Pricing.yearly")
                  : t("Pricing.monthly")
          }`
        : null
    return (
        <StarCard>
            <div className='relative flex flex-col items-center text-center gap-6'>
                {/* Enhanced Balance Display */}
                <div className='flex items-center gap-6 text-yellow-300'>
                    <div className='relative'>
                        <div className='h-16 w-16 rounded-full bg-gradient-to-r from-yellow-400/40 to-yellow-600/40 border-2 border-yellow-500/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300'>
                            <Star
                                className='w-8 h-8 animate-spin-slow'
                                fill='currentColor'
                            />
                        </div>
                        {/* Orbiting particles */}
                        <div className='absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 animate-ping' />
                        <div className='absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-gradient-to-r from-yellow-300 to-amber-400 animate-pulse' />
                    </div>
                    <div className='text-left'>
                        <p className='text-xs text-gray-400 mb-1'>
                            {t("StarsBalance.available")}
                        </p>
                        <p className='text-5xl md:text-6xl font-bold text-white tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent'>
                            {currentStars}
                        </p>
                        {planLabel ? (
                            <div className='mt-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/35 bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-transparent px-3 py-1.5 shadow-[0_0_20px_-10px_rgba(250,204,21,0.8)] backdrop-blur-sm'>
                                <div className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400/20 border border-yellow-300/40'>
                                    <Star
                                        className='h-3 w-3 text-yellow-300'
                                        fill='currentColor'
                                    />
                                </div>
                                <p className='text-sm font-semibold tracking-wide text-yellow-100'>
                                    {t("StarsBalance.planLabel", {
                                        plan: planLabel,
                                    })}
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className='w-full max-w-2xl space-y-4'>
                    <div className='flex flex-col gap-4 sm:flex-row'>
                        {/* Daily Balance Gauge */}
                        <StarsGauge
                            label={
                                subscription
                                    ? t("StarsBalance.dailyBalance", {
                                          current: dailyValue,
                                          total: dailyCap,
                                      })
                                    : t("StarsBalance.balance", {
                                          current: dailyValue,
                                          total: dailyCap,
                                      })
                            }
                            progress={dailyProgress}
                            rightLabel={t("StarsBalance.nextRefill")}
                            rightValue={dailyRefillLabel || undefined}
                            rightProgress={dailyRefillProgress}
                        />

                        {subscription && (
                            <StarsGauge
                                label={t("StarsBalance.planBalance", {
                                    current: planValue,
                                    total: planCap,
                                })}
                                progress={planProgress}
                                rightLabel={t("StarsBalance.nextRefill")}
                                rightValue={planRefillLabel || undefined}
                            />
                        )}

                        {subscription?.tier === "pro" && (
                            <div className='flex flex-1 items-start gap-3'>
                                <StarsGauge
                                    label={t("StarsBalance.addonBalance", {
                                        current: addonValue,
                                        total: addonCap,
                                    })}
                                    progress={addonProgress}
                                    accent='emerald'
                                    rightLabel={t("StarsBalance.nextRefill")}
                                    rightValue={planRefillLabel || undefined}
                                />
                                <Link
                                    href='/stars#add-ons'
                                    className='shrink-0 rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/10'
                                >
                                    {t("StarsBalance.buyAddons")}
                                </Link>
                            </div>
                        )}

                        {engagementTotal > 0 && engagementCurrent > 0 && (
                            <StarsGauge
                                label={t("StarsBalance.engagementBalance", {
                                    current: engagementCurrent,
                                    total: engagementTotal,
                                })}
                                progress={engagementProgress}
                                accent='violet'
                            />
                        )}
                    </div>

                    {!user && (
                        <Link href='/signin' className='block group'>
                            <div className='p-4 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/50 group-hover:from-primary/30'>
                                <div className='flex items-center gap-4'>
                                    <div className='p-2 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform'>
                                        <LogIn className='w-5 h-5' />
                                    </div>
                                    <div className='text-left'>
                                        <p className='text-sm font-bold text-white group-hover:text-primary transition-colors'>
                                            Increase your star limit!
                                        </p>
                                        <p className='text-xs text-gray-400'>
                                            Sign in to increase your maximum
                                            stars from 3 to 6.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </StarCard>
    )
}

function formatRelativeTime(
    timestamp: number | null | undefined,
    nowMs: number
): string {
    if (!timestamp) return "-"
    const ms = Math.max(0, timestamp - nowMs)
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    const pad = (n: number) => n.toString().padStart(2, "0")
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

function formatRefillDate(timestamp: number): string {
    const formatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    })
    return formatter.format(new Date(timestamp))
}

function StarsGauge({
    label,
    progress,
    rightLabel,
    rightValue,
    rightProgress,
    accent = "amber",
}: {
    label: string
    progress: number
    rightLabel?: string
    rightValue?: string
    rightProgress?: number
    accent?: "amber" | "emerald" | "violet"
}) {
    const gradient =
        accent === "emerald"
            ? "from-emerald-400 via-emerald-500 to-emerald-600"
            : accent === "violet"
              ? "from-violet-400 via-purple-500 to-fuchsia-600"
            : "from-yellow-400 via-amber-500 to-orange-500"
    const glow =
        accent === "emerald"
            ? "from-emerald-400/50 via-emerald-500/50 to-emerald-600/50"
            : accent === "violet"
              ? "from-violet-400/50 via-purple-500/50 to-fuchsia-600/50"
            : "from-yellow-400/50 via-amber-500/50 to-orange-500/50"

    return (
        <div className='flex-1 space-y-2'>
            <div className='flex items-end justify-between gap-3 text-xs text-gray-400'>
                <span className='inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80'>
                    {label}
                </span>
                {rightValue ? (
                    <RefillIndicator
                        label={rightLabel ?? "Next refill"}
                        value={rightValue}
                        progress={rightProgress}
                        compact
                    />
                ) : null}
            </div>
            <div className='relative h-3 w-full rounded-full bg-gradient-to-r from-gray-800/50 to-gray-700/50 overflow-hidden border border-gray-600/30'>
                <div
                    className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700 ease-out relative overflow-hidden`}
                    style={{ width: `${progress}%` }}
                >
                    <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse' />
                </div>
                <div
                    className={`absolute top-0 h-full bg-gradient-to-r ${glow} blur-sm transition-all duration-700 ease-out`}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

function RefillIndicator({
    label,
    value,
    progress = 0,
    compact = false,
}: {
    label: string
    value: string
    progress?: number
    compact?: boolean
}) {
    return (
        <div className='flex items-center gap-2'>
            {!compact ? (
                <Clock className='w-5 h-5 text-yellow-400' />
            ) : null}
            <div className='flex flex-col items-end gap-2'>
                <span className='text-xs text-gray-300'>{label}</span>
                <div className='flex min-w-[7.5rem] flex-col gap-1 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 px-3 py-2'>
                    <div className='flex items-center justify-between gap-2'>
                        <span className='text-white font-bold font-mono text-[11px]'>
                            {value}
                        </span>
                        <span className='text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-200/80'>
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className='h-1.5 overflow-hidden rounded-full bg-black/25'>
                        <div
                            className='h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 transition-all duration-700 ease-out'
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

