"use client"

import { Clock, LogIn, Star } from "lucide-react"
import { useStars } from "@/contexts/stars-context"
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import StarCard from "../star-card"
import { useTranslations } from "next-intl"
import Link from "next/link"

export default function StarsBalance() {
    const { stars, nextRefillAt, refillCap, subscription } = useStars()
    const { user } = useAuth()
    const t = useTranslations()

    const [now, setNow] = useState<number>(Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    const nextIn = useMemo(() => {
        if (!nextRefillAt) return "-"
        if (subscription?.currentPeriodEnd) {
            return formatRefillDate(nextRefillAt)
        }
        return formatRelativeTime(nextRefillAt, now)
    }, [nextRefillAt, now, subscription?.currentPeriodEnd])

    const currentStars = typeof stars === "number" ? stars : 0
    const baseCap = subscription?.baseStars ?? refillCap
    const addonCap = subscription?.addonStars ?? 0
    const baseAvailable = Math.min(currentStars, baseCap)
    const addonAvailable = Math.max(0, currentStars - baseCap)
    const baseProgress =
        baseCap > 0 ? Math.min(100, (baseAvailable / baseCap) * 100) : 0
    const addonProgress =
        addonCap > 0 ? Math.min(100, (addonAvailable / addonCap) * 100) : 0
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
                            <p className='mt-2 text-xs text-gray-400'>
                                {t("StarsBalance.planLabel", { plan: planLabel })}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className='w-full max-w-2xl space-y-4'>
                    <div className='flex items-center justify-center gap-3 text-sm text-gray-300'>
                        <div className='flex items-center gap-2'>
                            <Clock className='w-5 h-5 text-yellow-400' />
                            <span>{t("StarsBalance.nextRefill")}</span>
                        </div>
                        <div className='px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400/20 to-amber-500/20 border border-yellow-500/30'>
                            <span className='text-white font-bold font-mono'>
                                {nextIn}
                            </span>
                        </div>
                    </div>

                    {/* Plan Balance Gauge */}
                    <StarsGauge
                        label={
                            subscription
                                ? t("StarsBalance.planBalance", {
                                      current: baseAvailable,
                                      total: baseCap,
                                  })
                                : t("StarsBalance.balance", {
                                      current: baseAvailable,
                                      total: baseCap,
                                  })
                        }
                        progress={baseProgress}
                    />

                    {subscription?.tier === "pro" && addonCap > 0 && (
                        <StarsGauge
                            label={t("StarsBalance.addonBalance", {
                                current: addonAvailable,
                                total: addonCap,
                            })}
                            progress={addonProgress}
                            accent='emerald'
                        />
                    )}

                    {/* Enhanced Description */}
                    <div className='p-4 rounded-xl bg-gradient-to-r from-white/5 to-white/10 border border-white/10 backdrop-blur-sm'>
                        <p className='text-sm text-gray-300 leading-relaxed text-left'>
                            {subscription ? (
                                t("StarsBalance.subscriptionRefill", {
                                    cap: refillCap,
                                })
                            ) : user ? (
                                t("StarsBalance.autoRefill", {
                                    cap: refillCap,
                                })
                            ) : (
                                <>
                                    <span className='text-gray-400'>
                                        {t("StarsBalance.anonymousPrefix")}
                                    </span>{" "}
                                    {t("StarsBalance.anonymousRefill")}
                                </>
                            )}
                        </p>
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
                                            stars from 5 to 12.
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
    accent = "amber",
}: {
    label: string
    progress: number
    accent?: "amber" | "emerald"
}) {
    const gradient =
        accent === "emerald"
            ? "from-emerald-400 via-emerald-500 to-emerald-600"
            : "from-yellow-400 via-amber-500 to-orange-500"
    const glow =
        accent === "emerald"
            ? "from-emerald-400/50 via-emerald-500/50 to-emerald-600/50"
            : "from-yellow-400/50 via-amber-500/50 to-orange-500/50"

    return (
        <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs text-gray-400'>
                <span>{label}</span>
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

