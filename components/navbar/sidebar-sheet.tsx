"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import {
    Home,
    Info,
    DollarSign,
    LogIn,
    ShieldCheck,
    FileText,
    MessageSquare,
    BookOpen,
    Star,
    ArrowDownRight,
} from "lucide-react"
import { useEffect, useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { ConsistentAvatar } from "@/components/ui/consistent-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { UserProfileDropdown } from "@/components/user-profile-dropdown"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/contexts/profile-context"
import { useStars } from "@/contexts/stars-context"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabase"
import { PlanChangeDialog } from "@/components/subscription/plan-change-dialog"
import {
    SUBSCRIPTION_PLANS,
    getPlanPriceUsd,
    getPlanStars,
    type BillingCycle,
    type SubscriptionPlanTier,
} from "@/lib/payments/subscription-plans"
import { toast } from "sonner"

interface SidebarSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type PlanChangePrompt = {
    priceId: string
    action: "upgrade" | "downgrade"
    targetTier: SubscriptionPlanTier
    targetCycle: BillingCycle
    targetPriceUsd: number
    targetStars: number
}

export function SidebarSheet({ open, onOpenChange }: SidebarSheetProps) {
    const { user, loading } = useAuth()
    const { profile, loading: profileLoading } = useProfile()
    const {
        stars,
        initialized,
        nextRefillAt,
        refillCap,
        refillCycleMs,
        subscription,
    } = useStars()
    const pathname = usePathname()
    const t = useTranslations("Sidebar")
    const starsT = useTranslations("StarsPage")
    const a = useTranslations("Auth.SignIn")
    const [timeLeft, setTimeLeft] = useState(0)
    const [billingCycle, setBillingCycle] =
        useState<BillingCycle>("monthly")
    const [planChangeTarget, setPlanChangeTarget] = useState<string | null>(
        null
    )
    const [pendingChange, setPendingChange] = useState<PlanChangePrompt | null>(
        null
    )
    useEffect(() => {
        if (!nextRefillAt) {
            setTimeLeft(0)
            return
        }
        const updateTimer = () => {
            const diff = nextRefillAt - Date.now()
            setTimeLeft(Math.max(0, diff))
        }
        updateTimer()
        const interval = window.setInterval(updateTimer, 1000)
        return () => window.clearInterval(interval)
    }, [nextRefillAt])

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    const cycleMs = refillCycleMs ?? 2 * 60 * 60 * 1000
    const timeProgress = nextRefillAt
        ? Math.min(100, Math.max(0, (1 - timeLeft / cycleMs) * 100))
        : 0
    const progress =
        typeof stars === "number" && stars >= refillCap ? 100 : timeProgress
    const isProSubscriber = subscription?.tier === "pro"
    const currentPlanPrice = subscription
        ? getPlanPriceUsd(subscription.tier, subscription.cycle)
        : null
    const formatUsd = (amount: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)
    const formatRefillDate = (timestamp?: number | null) => {
        if (!timestamp) return "-"
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
        }).format(new Date(timestamp))
    }

    const currentPlanStars = subscription
        ? getPlanStars(subscription.tier, subscription.cycle)
        : 0
    const currentPlanName = subscription
        ? `${starsT(`subscribe.${subscription.tier}.title`)} · ${
              subscription.cycle === "annual"
                  ? starsT("subscribe.annual")
                  : starsT("subscribe.monthly")
          }`
        : "-"
    const targetPlanName = pendingChange
        ? `${starsT(`subscribe.${pendingChange.targetTier}.title`)} · ${
              pendingChange.targetCycle === "annual"
                  ? starsT("subscribe.annual")
                  : starsT("subscribe.monthly")
          }`
        : "-"
    const currentPlanPriceLabel =
        currentPlanPrice != null ? formatUsd(currentPlanPrice) : "-"
    const targetPlanPriceLabel = pendingChange
        ? formatUsd(pendingChange.targetPriceUsd)
        : "-"
    const differenceUsd = pendingChange
        ? Math.max(0, pendingChange.targetPriceUsd - (currentPlanPrice ?? 0))
        : 0
    const differenceLabel = formatUsd(differenceUsd)
    const refillDateLabel = formatRefillDate(subscription?.currentPeriodEnd)
    const currentStarsValue = typeof stars === "number" ? stars : 0
    const projectedStarsValue = pendingChange
        ? pendingChange.action === "upgrade"
            ? Math.max(
                  0,
                  currentStarsValue +
                      (pendingChange.targetStars - currentPlanStars)
              )
            : pendingChange.targetStars
        : currentStarsValue

    useEffect(() => {
        if (subscription?.cycle) {
            setBillingCycle(subscription.cycle)
        }
    }, [subscription?.cycle])

    const getPlanAction = (
        tier: SubscriptionPlanTier,
        cycle: BillingCycle
    ): "upgrade" | "downgrade" | "subscribe" => {
        if (!subscription) return "subscribe"
        if (subscription.tier === tier && subscription.cycle === cycle) {
            return "subscribe"
        }
        if (currentPlanPrice == null) return "upgrade"
        const targetPrice = getPlanPriceUsd(tier, cycle)
        return targetPrice >= currentPlanPrice ? "upgrade" : "downgrade"
    }

    const handlePlanChange = async (priceId: string) => {
        if (!priceId || planChangeTarget) return
        setPlanChangeTarget(priceId)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error("AUTH_REQUIRED")
            }

            const response = await fetch("/api/billing/subscription/upgrade", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ priceId }),
            })

            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || "Plan update failed")
            }

            toast.success(
                starsT("subscribe.upgradeSuccess") || "Plan updated"
            )
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? starsT("subscribe.signInToUpgrade") ||
                      "Please sign in first."
                    : error instanceof Error
                      ? error.message
                      : starsT("subscribe.upgradeError") ||
                        "Upgrade failed."
            toast.error(message)
        } finally {
            setPlanChangeTarget(null)
        }
    }

    const confirmPlanChange = async () => {
        if (!pendingChange) return
        const priceId = pendingChange.priceId
        setPendingChange(null)
        await handlePlanChange(priceId)
    }

    const getUserName = () => {
        return profile?.name || user?.email?.split("@")[0] || "User"
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='left'
                className='lg:hidden bg-card/95 backdrop-blur-md border-border/30 w-72 max-w-[85vw] flex flex-col h-full p-0 overflow-visible'
            >
                {/* Fixed Header Section */}
                <div className='flex-shrink-0 px-4 py-4 border-b border-white/10 overflow-visible'>
                    <SheetHeader>
                        <SheetTitle>
                            <Link
                                href='/'
                                onClick={() => onOpenChange(false)}
                                className='flex items-center space-x-2 group'
                            >
                                <Image
                                    src='/assets/logo.png'
                                    alt='AskingFate logo'
                                    width={28}
                                    height={28}
                                    className='rounded-md object-contain group-hover:scale-110 transition-transform'
                                    priority
                                />
                                <span className='font-playfair text-lg font-bold text-white group-hover:text-cosmic-purple transition-colors'>
                                    AskingFate
                                </span>
                            </Link>
                        </SheetTitle>
                    </SheetHeader>

                    {/* User Profile Section */}

                    {!loading && user ? (
                        <UserProfileDropdown
                            onClose={() => onOpenChange(false)}
                        >
                            <div className='flex items-center gap-3 p-3 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition-colors cursor-pointer'>
                                {profileLoading ? (
                                    <>
                                        <Skeleton className='w-10 h-10 rounded-full' />
                                        <div className='flex-1 min-w-0 space-y-2'>
                                            <Skeleton className='h-4 w-24' />
                                            <Skeleton className='h-3 w-32' />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ConsistentAvatar
                                            data={{
                                                name: profile?.name,
                                                email: user?.email,
                                            }}
                                            size='md'
                                        />
                                        <div className='flex-1 min-w-0'>
                                            <p className='text-sm font-medium text-white truncate'>
                                                {getUserName()}
                                            </p>
                                            <p className='text-xs text-white/70 truncate'>
                                                {user.email}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </UserProfileDropdown>
                    ) : (
                        <Link
                            href='/signin'
                            className='flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-white/90 border border-white/10 hover:bg-white/15 transition'
                            onClick={() => onOpenChange(false)}
                        >
                            <LogIn className='w-4 h-4' />
                            <span>{a("button")}</span>
                        </Link>
                    )}
                </div>

                {/* Scrollable Navigation Section */}
                <div className='flex-1 overflow-y-auto px-4 scrollbar-hide appearance-none'>
                    <nav className='space-y-6'>
                        <div className='mt-4'>
                            <div className='block group'>
                                <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400/10 via-yellow-500/5 to-transparent border border-yellow-500/20 p-4 transition-all duration-300 group-hover:border-yellow-500/40 group-hover:from-yellow-400/20'>
                                    <Link
                                        href='/stars'
                                        onClick={() => onOpenChange(false)}
                                        className='absolute inset-0 z-0'
                                    />
                                    <div className='relative z-10'>
                                        <div className='flex items-center justify-between mb-3'>
                                            <div className='flex items-center gap-2'>
                                                <div className='p-2 rounded-full bg-yellow-500/20 text-yellow-400 group-hover:scale-110 transition-transform'>
                                                    <Star
                                                        className='w-5 h-5'
                                                        fill='currentColor'
                                                    />
                                                </div>
                                                <span className='font-medium text-yellow-100'>
                                                    Your Stars
                                                </span>
                                            </div>
                                            <div className='text-2xl font-bold text-yellow-400'>
                                                {initialized ? (
                                                    stars ?? 0
                                                ) : (
                                                    <Skeleton className='h-8 w-8 rounded' />
                                                )}
                                            </div>
                                        </div>

                                        {nextRefillAt && timeLeft > 0 && (
                                            <div className='space-y-2'>
                                                <div className='flex justify-between text-[10px] uppercase tracking-wider text-yellow-500/70 font-semibold'>
                                                    <span>Next Refill</span>
                                                    <span>
                                                        {formatTime(timeLeft)}
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={progress}
                                                    className='h-1.5 bg-yellow-950/30'
                                                    indicatorClassName='bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                                                />
                                            </div>
                                        )}

                                        {!nextRefillAt && (
                                            <p className='text-[10px] text-yellow-500/50 italic'>
                                                {stars && stars >= refillCap
                                                    ? "Maximum stars reached"
                                                    : "Refill active"}
                                            </p>
                                        )}

                                        {subscription && (
                                            <div className='mt-3 space-y-2'>
                                                <span className='text-[10px] uppercase tracking-wider text-yellow-500/70 font-semibold'>
                                                    {t("planOptions")}
                                                </span>
                                                <div className='flex gap-2'>
                                                    {(
                                                        [
                                                            "monthly",
                                                            "annual",
                                                        ] as BillingCycle[]
                                                    ).map((cycle) => (
                                                        <button
                                                            key={cycle}
                                                            type='button'
                                                            onClick={() =>
                                                                setBillingCycle(
                                                                    cycle
                                                                )
                                                            }
                                                            className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest transition-all duration-300 ${
                                                                billingCycle ===
                                                                cycle
                                                                    ? "bg-yellow-400 text-black"
                                                                    : "text-white/60 hover:text-white"
                                                            }`}
                                                        >
                                                            {cycle ===
                                                            "monthly"
                                                                ? starsT(
                                                                      "subscribe.monthly"
                                                                  )
                                                                : starsT(
                                                                      "subscribe.annual"
                                                                  )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className='space-y-2'>
                                                    {SUBSCRIPTION_PLANS.filter(
                                                        (plan) =>
                                                            !(
                                                                subscription.tier ===
                                                                    plan.id &&
                                                                subscription.cycle ===
                                                                    billingCycle
                                                            )
                                                    ).map((plan) => {
                                                        const priceId =
                                                            plan.priceIds?.[
                                                                billingCycle
                                                            ] ?? ""
                                                        const action =
                                                            getPlanAction(
                                                                plan.id as SubscriptionPlanTier,
                                                                billingCycle
                                                            )
                                                        const targetPriceUsd =
                                                            getPlanPriceUsd(
                                                                plan.id as SubscriptionPlanTier,
                                                                billingCycle
                                                            )
                                                        const isDowngrade =
                                                            action ===
                                                            "downgrade"
                                                        return (
                                                            <button
                                                                key={`${plan.id}-${billingCycle}`}
                                                                type='button'
                                                                className={`rounded-xl border px-4 py-2 text-left text-xs transition-colors ${
                                                                    isDowngrade
                                                                        ? "w-fit bg-red-950/60 border-red-900/40 text-red-100 hover:bg-red-950/80"
                                                                        : "w-full bg-yellow-500/10 border-yellow-500/30 text-yellow-100 hover:bg-yellow-500/20"
                                                                }`}
                                                                onClick={() =>
                                                                    setPendingChange(
                                                                        {
                                                                            priceId,
                                                                            action: isDowngrade
                                                                                ? "downgrade"
                                                                                : "upgrade",
                                                                            targetTier:
                                                                                plan.id as SubscriptionPlanTier,
                                                                            targetCycle:
                                                                                billingCycle,
                                                                            targetPriceUsd,
                                                                            targetStars:
                                                                                plan
                                                                                    .billing?.[
                                                                                    billingCycle
                                                                                ]?.stars ?? 0,
                                                                        }
                                                                    )
                                                                }
                                                                disabled={
                                                                    !priceId ||
                                                                    planChangeTarget ===
                                                                        priceId
                                                                }
                                                            >
                                                                <div className='flex items-center justify-between'>
                                                                    <span className='font-semibold'>
                                                                        {starsT(
                                                                            `subscribe.${plan.id}.title`
                                                                        )}
                                                                    </span>
                                                                    <span className='text-[10px] uppercase tracking-widest inline-flex items-center gap-1'>
                                                                        {action ===
                                                                        "downgrade"
                                                                            ? (
                                                                                  <ArrowDownRight className='h-3 w-3 text-red-200' />
                                                                              )
                                                                            : null}
                                                                        {action ===
                                                                        "downgrade"
                                                                            ? starsT(
                                                                                  "subscribe.downgrade"
                                                                              )
                                                                            : starsT(
                                                                                  "subscribe.upgrade"
                                                                              )}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    className={`text-[10px] ${
                                                                        isDowngrade
                                                                            ? "text-red-200/70"
                                                                            : "text-yellow-200/70"
                                                                    }`}
                                                                >
                                                                    {starsT(
                                                                        `subscribe.${plan.id}.subtitle`
                                                                    )}
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <PlanChangeDialog
                                            open={Boolean(pendingChange)}
                                            onOpenChange={(open) => {
                                                if (!open)
                                                    setPendingChange(null)
                                            }}
                                            onConfirm={confirmPlanChange}
                                            confirmDisabled={
                                                !pendingChange ||
                                                (planChangeTarget != null &&
                                                    planChangeTarget ===
                                                        pendingChange.priceId)
                                            }
                                            action={
                                                pendingChange?.action ??
                                                "upgrade"
                                            }
                                            title={
                                                pendingChange?.action ===
                                                "downgrade"
                                                    ? starsT(
                                                          "subscribe.downgradeDialogTitle"
                                                      )
                                                    : starsT(
                                                          "subscribe.upgradeDialogTitle"
                                                      )
                                            }
                                            description={
                                                pendingChange?.action ===
                                                "downgrade"
                                                    ? starsT(
                                                          "subscribe.downgradeDialogDescription"
                                                      )
                                                    : starsT(
                                                          "subscribe.upgradeDialogDescription",
                                                          {
                                                              amount: differenceLabel,
                                                          }
                                                      )
                                            }
                                            summaryTitle={starsT(
                                                "subscribe.summaryTitle"
                                            )}
                                            starsTitle={starsT(
                                                "subscribe.starsSummaryTitle"
                                            )}
                                            currentPlanLabel={starsT(
                                                "subscribe.currentPlanLabel"
                                            )}
                                            targetPlanLabel={starsT(
                                                "subscribe.targetPlanLabel"
                                            )}
                                            differenceLabel={starsT(
                                                "subscribe.differenceLabel"
                                            )}
                                            refillLabel={starsT(
                                                "subscribe.refillLabel"
                                            )}
                                            currentStarsLabel={starsT(
                                                "subscribe.currentStarsLabel"
                                            )}
                                            projectedStarsLabel={starsT(
                                                "subscribe.projectedStarsLabel"
                                            )}
                                            currentPlan={{
                                                name: currentPlanName,
                                                price: currentPlanPriceLabel,
                                                stars: currentPlanStars,
                                            }}
                                            targetPlan={{
                                                name: targetPlanName,
                                                price: targetPlanPriceLabel,
                                                stars:
                                                    pendingChange?.targetStars ??
                                                    0,
                                            }}
                                            differenceValue={differenceLabel}
                                            refillDateValue={refillDateLabel}
                                            currentStarsValue={`${currentStarsValue} / ${currentPlanStars}`}
                                            projectedStarsValue={
                                                pendingChange
                                                    ? `${projectedStarsValue} / ${pendingChange.targetStars}`
                                                    : `${currentStarsValue}`
                                            }
                                            confirmLabel={starsT(
                                                "subscribe.dialogConfirm"
                                            )}
                                            cancelLabel={starsT(
                                                "subscribe.dialogCancel"
                                            )}
                                        />

                                        {!user && (stars ?? 0) <= 0 && (
                                            <div className='mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-100'>
                                                You’re out of stars.{" "}
                                                <span className='font-semibold text-white'>
                                                    Sign in
                                                </span>{" "}
                                                to recharge and get more.
                                            </div>
                                        )}

                                        {user && (
                                            <div className='mt-3'>
                                                <span className='text-[10px] uppercase tracking-wider text-yellow-500/70 font-semibold'>
                                                    Top up
                                                </span>
                                                <div className='mt-2'>
                                                    {isProSubscriber ? (
                                                        <Link
                                                            href='/stars/purchase'
                                                            onClick={() =>
                                                                onOpenChange(
                                                                    false
                                                                )
                                                            }
                                                            className='inline-flex items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/15 px-3 py-1 text-[11px] font-semibold text-yellow-100 transition-colors hover:bg-yellow-500/25 relative z-20'
                                                        >
                                                            Buy stars
                                                        </Link>
                                                    ) : (
                                                        <span className='text-[10px] text-yellow-200/70'>
                                                            {t(
                                                                "proTopUpOnly"
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ul className='flex flex-col space-y-1'>
                            <li>
                                <Link
                                    href={"/"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname === "/"
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <Home className='w-4 h-4' />
                                    <span>{t("home")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={"/about"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname === "/about"
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <Info className='w-4 h-4' />
                                    <span>{t("about")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={"/pricing"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname === "/pricing"
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <DollarSign className='w-4 h-4' />
                                    <span>{t("pricing")}</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={"/articles"}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                                        pathname.startsWith("/articles")
                                            ? "bg-accent text-white"
                                            : "text-cosmic-light hover:text-white hover:bg-white/10"
                                    }`}
                                    onClick={() => onOpenChange(false)}
                                >
                                    <BookOpen className='w-4 h-4' />
                                    <span>{t("articles")}</span>
                                </Link>
                            </li>

                            <li>
                                <Link
                                    href={"/contact"}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <MessageSquare className='w-4 h-4' />
                                    <span>{t("contactSupport")}</span>
                                </Link>
                            </li>

                            <li>
                                <Link
                                    href={"/privacy-policy"}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <ShieldCheck className='w-4 h-4' />
                                    <span>{t("privacyPolicy")}</span>
                                </Link>
                            </li>

                            <li>
                                <Link
                                    href={"/terms-of-service"}
                                    className='flex items-center gap-2 px-3 py-2 rounded-md text-cosmic-light hover:text-white hover:bg-white/10 transition-colors'
                                    onClick={() => onOpenChange(false)}
                                >
                                    <FileText className='w-4 h-4' />
                                    <span>{t("termsOfService")}</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </SheetContent>
        </Sheet>
    )
}
