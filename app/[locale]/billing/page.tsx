"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    CalendarIcon,
    Star,
    Clock,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ShieldCheck,
    Zap,
    History,
    Filter,
    XCircle,
    Loader2,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import BrandLoader from "@/components/brand-loader"
import { useStars } from "@/contexts/stars-context"
import {
    getPlanPrice,
    getPlanStars,
    parseSubscriptionPlanKey,
} from "@/lib/payments/subscription-plans"
import {
    convertUsdToCurrency,
    formatCurrency,
} from "@/lib/payments/currency-utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Tx = {
    id: string
    type: string
    amount_cents: number
    currency: string
    reference: string | null
    provider: string
    provider_payment_id?: string | null
    created_at: string
    status?: string | null
    stars_amount?: number | null
    pack_name?: string | null
    subscription_id?: string | null
}

type AddonItem = {
    priceId: string
    name: string
    quantity: number
    unitPriceUsd: number
    totalPriceUsd: number
    starsPerPeriod: number
    totalStars: number
}

type Subscription = {
    id: string
    status: string
    current_period_end: string
    cancel_at_period_end: boolean
    plan: string
    pending_plan?: string | null
    pending_change_at?: string | null
    addon_items?: AddonItem[] | null
    addon_stars?: number | null
    addon_amount_usd?: number | null
    provider_customer_id?: string | null
}

export default function BillingPage() {
    const { user, loading: authLoading } = useAuth()
    const { initialized: starsInitialized } = useStars()
    const router = useRouter()
    const t = useTranslations("Billing")
    const locale = useLocale()
    const [txs, setTxs] = useState<Tx[]>([])
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
    const [portalLoading, setPortalLoading] = useState(false)
    const [addonRemoveTarget, setAddonRemoveTarget] =
        useState<AddonItem | null>(null)
    const [addonRemoving, setAddonRemoving] = useState(false)
    const [refundTarget, setRefundTarget] = useState<Tx | null>(null)
    const [refundLoading, setRefundLoading] = useState(false)
    const [revertingDowngrade, setRevertingDowngrade] = useState(false)

    // Auth guard: redirect to signin if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error(t("authRequired") || "Please sign in to access billing")
            router.push("/signin?callbackUrl=/billing")
        }
    }, [user, authLoading, router, t])

    const fetchBillingData = useCallback(async () => {
        if (!user) return
        setLoading(true)

        try {
            // Fetch transactions
            const txResult = await supabase
                .from("billing_transactions")
                .select(
                    "id,type,amount_cents,currency,reference,provider,provider_payment_id,status,created_at,stars_amount,pack_name,subscription_id"
                )
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })

            setTxs((txResult.data as Tx[]) || [])

            // Fetch active subscription
            const { data: subData } = await supabase
                .from("billing_subscriptions")
                .select(
                    "id, status, current_period_end, cancel_at_period_end, plan, pending_plan, pending_change_at, addon_items, addon_stars, addon_amount_usd, provider_customer_id"
                )
                .eq("user_id", user.id)
                .eq("status", "active")
                .maybeSingle()

            if (subData) {
                setSubscription(subData as Subscription)
            } else {
                setSubscription(null)
            }
        } catch (error) {
            console.error("Error fetching billing data:", error)
        } finally {
            setLoading(false)
        }
    }, [user])

    const handleCancelSubscription = async () => {
        if (!user || !subscription) return

        setCancelling(true)
        try {
            const response = await fetch("/api/billing/subscription/cancel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subscriptionId: subscription.id,
                    userId: user.id,
                }),
            })

            const result = await response.json()

            if (result.ok) {
                toast.success(
                    t("subscriptionCancelled") ||
                        "Subscription cancelled successfully"
                )
                fetchBillingData() // Refresh data
            } else {
                toast.error(result.error || "Failed to cancel subscription")
            }
        } catch (error) {
            console.error("Error cancelling subscription:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setCancelling(false)
            setShowCancelDialog(false)
        }
    }

    const handleManagePaymentMethod = async () => {
        if (!user || portalLoading) return
        setPortalLoading(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error("AUTH_REQUIRED")
            }
            const response = await fetch("/api/billing/portal", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "PORTAL_ERROR")
            }
            if (data?.url) {
                window.location.assign(data.url)
            } else {
                throw new Error("PORTAL_URL_MISSING")
            }
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("authRequired") || "Please sign in"
                    : error instanceof Error
                      ? error.message
                      : "Portal error"
            toast.error(message)
        } finally {
            setPortalLoading(false)
        }
    }

    const handleRemoveAddon = async () => {
        if (!user || !addonRemoveTarget) return
        setAddonRemoving(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error("AUTH_REQUIRED")
            }
            const response = await fetch("/api/billing/subscription/addon", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    priceId: addonRemoveTarget.priceId,
                    action: "remove",
                }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "ADDON_REMOVE_FAILED")
            }
            toast.success(t("addonRemoved") || "Add-on removed")
            fetchBillingData()
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("authRequired") || "Please sign in"
                    : error instanceof Error
                      ? error.message
                      : t("addonRemoveFailed") || "Failed to remove add-on"
            toast.error(message)
        } finally {
            setAddonRemoving(false)
            setAddonRemoveTarget(null)
        }
    }

    const handleRevertDowngrade = async () => {
        if (!user || !subscription?.pending_plan) return
        setRevertingDowngrade(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error("AUTH_REQUIRED")
            }
            const response = await fetch(
                "/api/billing/subscription/revert",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            )
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "REVERT_FAILED")
            }
            toast.success(t("revertDowngradeSuccess"))
            fetchBillingData()
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("authRequired") || "Please sign in"
                    : error instanceof Error
                      ? error.message
                      : t("revertDowngradeFailed")
            toast.error(message)
        } finally {
            setRevertingDowngrade(false)
        }
    }

    const handleRefund = async () => {
        if (!user || !refundTarget) return
        setRefundLoading(true)
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error("AUTH_REQUIRED")
            }
            const response = await fetch("/api/billing/refund", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ transactionId: refundTarget.id }),
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(data?.error || "REFUND_FAILED")
            }
            toast.success(t("refundSuccess"))
            fetchBillingData()
        } catch (error) {
            const message =
                error instanceof Error && error.message === "AUTH_REQUIRED"
                    ? t("authRequired") || "Please sign in"
                    : error instanceof Error
                      ? error.message
                      : t("refundFailed")
            toast.error(message)
        } finally {
            setRefundLoading(false)
            setRefundTarget(null)
        }
    }

    // Fetch billing data
    useEffect(() => {
        if (!user || authLoading) return
        fetchBillingData()
    }, [user, authLoading, fetchBillingData])

    // Show loading state for initial auth
    if (authLoading) {
        return <BrandLoader />
    }

    // Don't render if not authenticated (redirect will happen)
    if (!user) {
        return null
    }

    // Show loader while billing data is fetching
    if (loading) {
        return <BrandLoader />
    }

    // Helper function to extract stars from reference (fallback)
    const getStarsFromReference = (reference: string | null): number | null => {
        if (!reference) return null
        const match = reference.match(/(\d+)\s*stars?/i)
        return match ? parseInt(match[1]) : null
    }

    // Helper function to format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return {
            date: date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
            time: date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            }),
            full: format(date, "MMM dd, yyyy"),
        }
    }
    const displayCurrency = locale === "th" ? "THB" : "USD"
    const formatDisplayAmount = (amount: number) =>
        formatCurrency(amount, displayCurrency, locale).replace(/^US(?=\$)/, "")
    const formatUsdAsDisplay = (amountUsd: number) =>
        formatDisplayAmount(
            convertUsdToCurrency(amountUsd, displayCurrency)
        )

    const refundWindowMs = 7 * 24 * 60 * 60 * 1000
    const isRefundable = (tx: Tx) => {
        if (!tx?.provider_payment_id) return false
        if (tx?.status === "refunded") return false
        if (tx?.provider !== "stripe") return false
        const createdAt = new Date(tx.created_at).getTime()
        if (!Number.isFinite(createdAt)) return false
        return Date.now() - createdAt <= refundWindowMs
    }

    // Group transactions by period
    const groupTransactionsByPeriod = () => {
        const currentYear = new Date().getFullYear()
        const filteredTxs = txs.filter((tx) => {
            const txDate = new Date(tx.created_at)
            if (dateRange?.from && dateRange?.to) {
                return txDate >= dateRange.from && txDate <= dateRange.to
            } else if (dateRange?.from) {
                return txDate >= dateRange.from
            } else if (dateRange?.to) {
                return txDate <= dateRange.to
            }
            return true
        })

        const grouped: { [key: string]: Tx[] } = {}
        filteredTxs.forEach((tx) => {
            const date = new Date(tx.created_at)
            const year = date.getFullYear()
            const month = date.getMonth()
            const key = year === currentYear ? `${year}-${month}` : `${year}`
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(tx)
        })

        return Object.entries(grouped).sort(([a], [b]) => {
            const aDate = new Date(a.includes("-") ? `${a}-01` : `${a}-01-01`)
            const bDate = new Date(b.includes("-") ? `${b}-01` : `${b}-01-01`)
            return bDate.getTime() - aDate.getTime()
        })
    }

    const formatPeriodHeader = (key: string) => {
        const currentYear = new Date().getFullYear()
        const [year, month] = key.split("-").map(Number)
        if (year === currentYear && month !== undefined) {
            return format(new Date(year, month), "MMMM yyyy")
        }
        return year.toString()
    }

    // Use the actual subscription data from billing_subscriptions
    const planInfo = parseSubscriptionPlanKey(subscription?.plan)
    const planLabel = planInfo
        ? `${t(planInfo.tier === "basic" ? "basicPlan" : "proPlan")} ${
              planInfo.cycle === "annual" ? t("yearly") : t("monthly")
          }`
        : t("starterPlan")
    const pendingPlanInfo = parseSubscriptionPlanKey(
        subscription?.pending_plan ?? null
    )
    const pendingChangeAtMs = subscription?.pending_change_at
        ? new Date(subscription.pending_change_at).getTime()
        : null
    const hasPendingDowngrade = Boolean(
        pendingPlanInfo &&
            pendingChangeAtMs &&
            pendingChangeAtMs > Date.now()
    )
    const planStars = planInfo
        ? getPlanStars(planInfo.tier, planInfo.cycle)
        : null
    const planPriceAmount = planInfo
        ? getPlanPrice(planInfo.tier, planInfo.cycle, displayCurrency)
        : null
    const addonStars = subscription?.addon_stars ?? 0
    const totalPlanStars =
        typeof planStars === "number" ? planStars + addonStars : null
    const addonAmountUsd = subscription?.addon_amount_usd ?? 0
    const totalPriceAmount =
        typeof planPriceAmount === "number"
            ? planPriceAmount +
              convertUsdToCurrency(addonAmountUsd, displayCurrency)
            : null
    const isMaxPlan = planInfo?.tier === "pro"
    const primaryActionLabel = isMaxPlan ? t("buyAddons") : t("upgradePlan")
    const primaryActionHref = isMaxPlan ? "/stars#add-ons" : "/stars"
    const addonItems: AddonItem[] = Array.isArray(subscription?.addon_items)
        ? subscription?.addon_items ?? []
        : []

    return (
        <div className='min-h-screen pb-20 relative bg-transparent text-white selection:bg-yellow-400/30'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse' />
                <div className='absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]' />
                <div className='absolute top-[40%] left-[20%] w-[20%] h-[20%] bg-indigo-500/5 rounded-full blur-[80px]' />
            </div>

            <div className='max-w-5xl mx-auto px-6 pt-10 relative z-10 space-y-12'>
                {/* Header Section */}
                <div className='flex flex-col md:flex-row md:items-end justify-between gap-6'>
                    <div className='space-y-2'>
                        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-medium mb-2'>
                            <Zap className='w-3 h-3 fill-yellow-400' />
                            <span>{t("billingHistory")}</span>
                        </div>
                        <h1 className='text-5xl font-serif font-bold tracking-tight text-white'>
                            {t("title")}
                        </h1>
                        <p className='text-gray-400 text-lg font-light max-w-md'>
                            {t("subtitle")}
                        </p>
                    </div>

                    <div className='flex items-center gap-3'>
                        <Button
                            variant='outline'
                            className='rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white'
                            onClick={() => router.push("/stars")}
                        >
                            {t("upgradePlan") || "Get More Stars"}
                            <ArrowRight className='w-4 h-4 ml-2' />
                        </Button>
                    </div>
                </div>

                {/* Current Plan Card */}
                {(!starsInitialized || subscription) && (
                    <Card className='col-span-1 md:col-span-2 relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-transparent border-white/10 p-8 backdrop-blur-md rounded-2xl group transition-all duration-500 hover:border-white/20'>
                        <div className='absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity'>
                            <ShieldCheck className='w-32 h-32 text-white' />
                        </div>

                        <div className='relative z-10 h-full flex flex-col justify-between space-y-6'>
                            <div className='space-y-1'>
                                <p className='text-sm font-medium text-gray-400 uppercase tracking-wider'>
                                    {t("currentPlan")}
                                </p>
                                <div className='flex items-center gap-3'>
                                    <h2 className='text-3xl font-bold text-white'>
                                        {!starsInitialized ? (
                                            <Skeleton className='h-9 w-48 bg-white/10 rounded-lg' />
                                        ) : (
                                            <span className='flex items-center gap-2 bg-gradient-to-r from-yellow-200 to-yellow-500 bg-clip-text text-transparent'>
                                                {planLabel}
                                            </span>
                                        )}
                                    </h2>
                                    {starsInitialized && subscription && (
                                        <Badge className='bg-yellow-400/20 text-yellow-300 border-yellow-400/30 animate-pulse'>
                                            {subscription.cancel_at_period_end
                                                ? t("ending")
                                                : t("active")}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className='grid grid-cols-2 gap-8'>
                                {(!starsInitialized || subscription) && (
                                    <div className='space-y-1'>
                                        <div className='text-xs text-gray-500 flex items-center gap-1.5'>
                                            <Clock className='w-3 h-3 text-indigo-400' />
                                            {!starsInitialized ? (
                                                <Skeleton className='h-3 w-20 bg-white/5' />
                                            ) : (
                                                t("nextBilling") || "Next Billing"
                                            )}
                                        </div>
                                        <div className='text-xl font-semibold text-white'>
                                            {!starsInitialized ? (
                                                <Skeleton className='h-7 w-32 bg-white/10 rounded-md' />
                                            ) : subscription?.current_period_end ? (
                                                formatDate(
                                                    subscription.current_period_end
                                                ).full
                                            ) : (
                                                "-"
                                            )}
                                        </div>
                                    </div>
                                )}
                                {totalPlanStars !== null && (
                                    <div className='space-y-1'>
                                        <div className='text-xs text-gray-500 flex items-center gap-1.5'>
                                            <Star className='w-3 h-3 text-yellow-300' />
                                            {t("starsPerPeriod")}
                                        </div>
                                        <div className='text-xl font-semibold text-white'>
                                            {totalPlanStars}
                                        </div>
                                        {addonStars > 0 && (
                                            <div className='text-[11px] text-emerald-200'>
                                                +{addonStars} {t("addonStars")}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {subscription && (
                                <div className='space-y-4'>
                                    <div className='flex flex-wrap items-center gap-3'>
                                        <Button
                                            variant='outline'
                                            className='rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs uppercase tracking-widest'
                                            onClick={handleManagePaymentMethod}
                                            disabled={portalLoading}
                                        >
                                            {portalLoading ? (
                                                <Loader2 className='w-3 h-3 animate-spin mr-2' />
                                            ) : null}
                                            {t("managePaymentMethod")}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            className='rounded-full bg-yellow-400/10 border-yellow-400/30 hover:bg-yellow-400/20 text-yellow-200 text-xs uppercase tracking-widest'
                                            onClick={() =>
                                                router.push(primaryActionHref)
                                            }
                                        >
                                            {primaryActionLabel}
                                        </Button>
                                        {hasPendingDowngrade && (
                                            <Button
                                                variant='outline'
                                                className='rounded-full bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-200 text-xs uppercase tracking-widest'
                                                onClick={handleRevertDowngrade}
                                                disabled={revertingDowngrade}
                                            >
                                                {revertingDowngrade ? (
                                                    <Loader2 className='w-3 h-3 animate-spin mr-2' />
                                                ) : null}
                                                {t("revertDowngrade")}
                                            </Button>
                                        )}
                                    </div>

                                    <div className='space-y-2'>
                                        <div className='text-xs text-gray-500 uppercase tracking-wider'>
                                            {t("addonPacks")}
                                        </div>
                                        {addonItems.length > 0 ? (
                                            <div className='space-y-2'>
                                                {addonItems.map((item) => (
                                                    <div
                                                        key={item.priceId}
                                                        className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2'
                                                    >
                                                        <div>
                                                            <div className='text-sm text-white font-semibold'>
                                                                {item.name}{" "}
                                                                <span className='text-xs text-white/60'>
                                                                    x
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className='text-xs text-gray-400'>
                                                                +{item.totalStars}{" "}
                                                                {t("stars")} ·{" "}
                                                                {formatUsdAsDisplay(
                                                                    item.totalPriceUsd
                                                                )}{" "}
                                                                /
                                                                {t(
                                                                    "monthly"
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='text-[10px] uppercase tracking-widest font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-full'
                                                            onClick={() =>
                                                                setAddonRemoveTarget(
                                                                    item
                                                                )
                                                            }
                                                            disabled={
                                                                addonRemoving
                                                            }
                                                        >
                                                            {addonRemoving &&
                                                            addonRemoveTarget?.priceId ===
                                                                item.priceId ? (
                                                                <Loader2 className='w-3 h-3 animate-spin mr-2' />
                                                            ) : (
                                                                <XCircle className='w-3 h-3 mr-2' />
                                                            )}
                                                            {t("removeAddon")}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className='text-sm text-white/60'>
                                                {t("noAddons")}
                                            </div>
                                        )}
                                        {planPriceAmount != null && (
                                            <div className='pt-2 text-xs text-gray-400'>
                                                {t("estimatedTotal")}:{" "}
                                                <span className='text-white'>
                                                    {formatDisplayAmount(
                                                        totalPriceAmount ??
                                                            planPriceAmount
                                                    )}
                                                </span>{" "}
                                                /{" "}
                                                {planInfo?.cycle === "annual"
                                                    ? t("yearly")
                                                    : t("monthly")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Subscription Management */}
                            {!starsInitialized ? (
                                <div className='pt-4 border-t border-white/5 flex items-center justify-between'>
                                    <Skeleton className='h-4 w-40 bg-white/5 rounded' />
                                    <Skeleton className='h-8 w-32 bg-white/5 rounded-full' />
                                </div>
                            ) : subscription ? (
                                <div className='text-left pt-4 border-t border-white/5 flex items-center justify-between'>
                                    <div className='flex items-center gap-2 text-xs text-gray-500'>
                                        {subscription.cancel_at_period_end ? (
                                            <>
                                                <AlertCircle className='w-3 h-3 text-yellow-400/70' />
                                                <span>
                                                    Cancels on{" "}
                                                    {
                                                        formatDate(
                                                            subscription.current_period_end
                                                        ).full
                                                    }
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className='w-3 h-3 text-green-400/70' />
                                                <span>Subscription active</span>
                                            </>
                                        )}
                                    </div>
                                    {!subscription.cancel_at_period_end && (
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            className='w-fit h-8 text-[10px] uppercase tracking-widest font-bold text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-full'
                                            onClick={() =>
                                                setShowCancelDialog(true)
                                            }
                                            disabled={cancelling}
                                        >
                                            {cancelling ? (
                                                <Loader2 className='w-3 h-3 animate-spin mr-2' />
                                            ) : (
                                                <XCircle className='w-3 h-3 mr-2' />
                                            )}
                                            {t("cancelSubscription") ||
                                                "Cancel Subscription"}
                                        </Button>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </Card>
                )}

                {/* Transactions Section */}
                <div className='space-y-8 pt-8'>
                    <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6'>
                        <div className='flex items-center gap-3'>
                            <History className='w-5 h-5 text-yellow-400' />
                            <h2 className='text-2xl font-serif font-semibold'>
                                {t("billingHistory")}
                            </h2>
                            <Badge
                                variant='outline'
                                className='bg-white/5 border-white/10 text-gray-400'
                            >
                                {txs.length} total
                            </Badge>
                        </div>

                        {/* Date Filter */}
                        <div className='flex items-center gap-3'>
                            <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10'>
                                <Filter className='w-3 h-3 text-gray-400' />
                                <span className='text-xs font-medium text-gray-400 uppercase tracking-tight'>
                                    {t("filterByDate")}:
                                </span>
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant='outline'
                                        className='min-w-[240px] h-10 bg-black/40 border-white/10 text-gray-300 hover:border-yellow-400/50 hover:bg-black/60 transition-all rounded-full justify-start text-left font-normal'
                                    >
                                        <CalendarIcon className='mr-2 h-4 w-4 text-yellow-400' />
                                        {dateRange?.from ? (
                                            dateRange.to ? (
                                                <span className='text-xs'>
                                                    {format(
                                                        dateRange.from,
                                                        "LLL dd, y"
                                                    )}{" "}
                                                    -{" "}
                                                    {format(
                                                        dateRange.to,
                                                        "LLL dd, y"
                                                    )}
                                                </span>
                                            ) : (
                                                <span className='text-xs'>
                                                    {format(
                                                        dateRange.from,
                                                        "LLL dd, y"
                                                    )}
                                                </span>
                                            )
                                        ) : (
                                            <span className='text-xs'>
                                                {t("pickDate")}
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className='w-auto p-0 bg-popover/95 border-white/10 shadow-2xl shadow-black/50 backdrop-blur-xl'
                                    align='end'
                                >
                                    <Calendar
                                        mode='range'
                                        defaultMonth={dateRange?.from}
                                        selected={dateRange}
                                        onSelect={setDateRange}
                                        className='rounded-xl border-none'
                                    />
                                </PopoverContent>
                            </Popover>
                            {(dateRange?.from || dateRange?.to) && (
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => setDateRange(undefined)}
                                    className='text-red-400 hover:text-red-300 hover:bg-red-400/10 h-10 px-4 rounded-full'
                                >
                                    {t("clearFilters")}
                                </Button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className='space-y-6'>
                            {[1, 2, 3].map((i) => (
                                <Card
                                    key={i}
                                    className='bg-white/[0.03] border-white/5 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6'
                                >
                                    <div className='flex items-center gap-6'>
                                        <Skeleton className='w-14 h-14 rounded-2xl bg-white/5' />
                                        <div className='space-y-2'>
                                            <Skeleton className='h-5 w-40 bg-white/10' />
                                            <Skeleton className='h-4 w-24 bg-white/5' />
                                        </div>
                                    </div>
                                    <div className='flex items-center justify-end gap-8'>
                                        <div className='text-right space-y-2'>
                                            <Skeleton className='h-3 w-12 bg-white/5 ml-auto' />
                                            <Skeleton className='h-6 w-20 bg-white/10' />
                                        </div>
                                        <Skeleton className='w-10 h-10 rounded-full bg-white/5' />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : txs.length === 0 ? (
                        <Card className='bg-white/[0.03] border-dashed border-white/10 p-20 text-center rounded-3xl backdrop-blur-sm'>
                            <div className='w-20 h-20 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6'>
                                <Star className='w-10 h-10 text-yellow-400/40' />
                            </div>
                            <h3 className='text-2xl font-bold text-white mb-2'>
                                {t("noPurchases")}
                            </h3>
                            <p className='text-gray-400 max-w-sm mx-auto'>
                                {t("noPurchasesDescription")}
                            </p>
                            <Button
                                className='mt-8 rounded-full bg-yellow-400 text-black hover:bg-yellow-300 font-semibold'
                                onClick={() => router.push("/stars")}
                            >
                                Browse Star Packs
                            </Button>
                        </Card>
                    ) : (
                        <div className='space-y-10'>
                            {groupTransactionsByPeriod().map(
                                ([periodKey, periodTxs]) => (
                                    <div key={periodKey} className='space-y-6'>
                                        <div className='flex items-center gap-4'>
                                            <h3 className='text-sm font-semibold text-yellow-400 uppercase tracking-widest bg-yellow-400/5 px-4 py-1 rounded-full border border-yellow-400/10'>
                                                {formatPeriodHeader(periodKey)}
                                            </h3>
                                            <div className='h-px bg-gradient-to-r from-yellow-400/20 to-transparent flex-1' />
                                        </div>

                                        <div className='grid grid-cols-1 gap-4'>
                                            {periodTxs.map((transaction) => {
                                                const amount =
                                                    (transaction.amount_cents ??
                                                        0) / 100
                                                const { date, time } =
                                                    formatDate(
                                                        transaction.created_at
                                                    )
                                                const stars =
                                                    transaction.stars_amount ||
                                                    getStarsFromReference(
                                                        transaction.reference
                                                    )
                                                const isSubscription =
                                                    transaction.type.startsWith(
                                                        "subscription"
                                                    )
                                                const planInfo = isSubscription
                                                    ? parseSubscriptionPlanKey(
                                                          transaction.pack_name ??
                                                              null
                                                      )
                                                    : null
                                                const isPlanChange =
                                                    transaction.reference
                                                        ?.toLowerCase()
                                                        .includes("change") ??
                                                    false
                                                const isRenewal =
                                                    transaction.type ===
                                                        "subscription_recurring" &&
                                                    !isPlanChange
                                                const planName = planInfo
                                                    ? planInfo.tier === "basic"
                                                        ? t("basicPlan")
                                                        : t("proPlan")
                                                    : null
                                                const planLabel = planName
                                                    ? `${planName} ${t(
                                                          "planSuffix"
                                                      )}`
                                                    : null
                                                const intervalBadge = planInfo
                                                    ? planInfo.cycle === "annual"
                                                        ? t("yearly")
                                                        : t("monthly")
                                                    : null
                                                const title = (() => {
                                                    if (planLabel) {
                                                        return isRenewal
                                                            ? `${planLabel} ${t(
                                                                  "renewalSuffix"
                                                              )}`
                                                            : planLabel
                                                    }
                                                    const name =
                                                        transaction.pack_name ??
                                                        null
                                                    if (name) {
                                                        if (isSubscription)
                                                            return name
                                                        return name
                                                            .toLowerCase()
                                                            .includes("pack")
                                                            ? name
                                                            : `${name} Pack`
                                                    }
                                                    const starCount =
                                                        typeof stars ===
                                                        "number"
                                                            ? stars
                                                            : transaction.stars_amount ??
                                                              0
                                                    return `${starCount} Stars Pack`
                                                })()

                                                return (
                                                    <Link
                                                        href={`/billing/transactions/${transaction.id}`}
                                                        key={transaction.id}
                                                        className='group'
                                                    >
                                                        <Card className='relative overflow-hidden bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer group-hover:shadow-xl group-hover:shadow-black/40'>
                                                            <div className='flex items-center gap-6'>
                                                                <div
                                                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 shadow-inner ${
                                                                        isSubscription
                                                                            ? "bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/20"
                                                                            : "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/20"
                                                                    }`}
                                                                >
                                                                    {isSubscription ? (
                                                                        <Zap className='w-6 h-6 fill-current' />
                                                                    ) : (
                                                                        <Star className='w-6 h-6 fill-current' />
                                                                    )}
                                                                </div>

                                                                <div className='space-y-1'>
                                                                    <div className='flex items-center gap-2'>
                                                                        <h4 className='text-lg font-bold text-white group-hover:text-yellow-400 transition-colors'>
                                                                            {
                                                                                title
                                                                            }
                                                                        </h4>
                                                                        {isSubscription && (
                                                                            <Badge className='bg-purple-500/20 text-purple-300 border-purple-500/20 text-[10px] font-bold'>
                                                                                {(intervalBadge ??
                                                                                    t(
                                                                                        "subscription"
                                                                                    )).toUpperCase()}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className='flex items-center gap-3 text-sm text-gray-500'>
                                                                        <span className='flex items-center gap-1'>
                                                                            <CalendarIcon className='w-3 h-3' />
                                                                            {
                                                                                date
                                                                            }
                                                                        </span>
                                                                        <span className='w-1 h-1 rounded-full bg-gray-700' />
                                                                        <span className='flex items-center gap-1'>
                                                                            <Clock className='w-3 h-3' />
                                                                            {
                                                                                time
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className='flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 border-white/5 pt-4 md:pt-0'>
                                                                <div className='text-right space-y-2'>
                                                                    <p className='text-xs text-gray-500 font-medium uppercase tracking-wider mb-1'>
                                                                        Amount
                                                                    </p>
                                                                    <p className='text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent group-hover:from-yellow-200 group-hover:to-yellow-500 transition-all'>
                                                                        {transaction.currency ===
                                                                        "THB"
                                                                            ? "฿"
                                                                            : "$"}
                                                                        {amount.toFixed(
                                                                            2
                                                                        )}
                                                                    </p>
                                                                    {transaction.status ===
                                                                    "refunded" ? (
                                                                        <span className='inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200'>
                                                                            {t(
                                                                                "refunded"
                                                                            )}
                                                                        </span>
                                                                    ) : isRefundable(
                                                                          transaction
                                                                      ) ? (
                                                                        <button
                                                                            type='button'
                                                                            className='inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-200 hover:bg-red-500/20'
                                                                            onClick={(
                                                                                event
                                                                            ) => {
                                                                                event.preventDefault()
                                                                                event.stopPropagation()
                                                                                setRefundTarget(
                                                                                    transaction
                                                                                )
                                                                            }}
                                                                        >
                                                                            {t(
                                                                                "refund"
                                                                            )}
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                                <div className='w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-yellow-400 group-hover:text-black transition-all duration-300'>
                                                                    <ArrowRight className='w-5 h-5' />
                                                                </div>
                                                            </div>

                                                            {/* Animated Hover Stripe */}
                                                            <div className='absolute left-0 top-0 bottom-0 w-1 bg-yellow-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300' />
                                                        </Card>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Cancel Subscription Confirmation */}
            <AlertDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
            >
                <AlertDialogContent className='bg-zinc-900 border-white/10 text-white rounded-[2rem] p-8'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='text-2xl font-serif'>
                            {t("confirmCancel") || "Cancel Subscription?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='text-zinc-400'>
                            {t("cancelWarning") ||
                                "Your subscription will remain active until the end of your current billing period. After that, you will lose your unlimited stars access."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className='gap-3 mt-6'>
                        <AlertDialogCancel className='rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white'>
                            No, keep it
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelSubscription}
                            className='rounded-full bg-red-500 hover:bg-red-600 text-white border-none'
                        >
                            {cancelling ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                            ) : null}
                            Yes, cancel subscription
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Remove Add-on Confirmation */}
            <AlertDialog
                open={Boolean(addonRemoveTarget)}
                onOpenChange={(open) => {
                    if (!open) setAddonRemoveTarget(null)
                }}
            >
                <AlertDialogContent className='bg-zinc-900 border-white/10 text-white rounded-[2rem] p-8'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='text-2xl font-serif'>
                            {t("confirmRemoveAddon")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='text-zinc-400'>
                            {t("removeAddonWarning")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className='gap-3 mt-6'>
                        <AlertDialogCancel className='rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white'>
                            {t("keepAddon")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveAddon}
                            className='rounded-full bg-red-500 hover:bg-red-600 text-white border-none'
                            disabled={addonRemoving}
                        >
                            {addonRemoving ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                            ) : null}
                            {t("confirmRemoveAddonAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Refund Confirmation */}
            <AlertDialog
                open={Boolean(refundTarget)}
                onOpenChange={(open) => {
                    if (!open) setRefundTarget(null)
                }}
            >
                <AlertDialogContent className='bg-zinc-900 border-white/10 text-white rounded-[2rem] p-8'>
                    <AlertDialogHeader>
                        <AlertDialogTitle className='text-2xl font-serif'>
                            {t("confirmRefund")}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='text-zinc-400'>
                            {t("refundWarning")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className='gap-3 mt-6'>
                        <AlertDialogCancel className='rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white'>
                            {t("keepPurchase")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRefund}
                            className='rounded-full bg-red-500 hover:bg-red-600 text-white border-none'
                            disabled={refundLoading}
                        >
                            {refundLoading ? (
                                <Loader2 className='w-4 h-4 animate-spin mr-2' />
                            ) : null}
                            {t("confirmRefundAction")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
