"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    ArrowLeft,
    CreditCard,
    Smartphone,
    Wallet,
    Star,
    Calendar,
    DollarSign,
    Shield,
    Copy,
    Check,
    Zap,
    CheckCircle2,
    Clock,
    ExternalLink,
    AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"
import BrandLoader from "@/components/brand-loader"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

type Transaction = {
    id: string
    type: string
    amount_cents: number
    currency: string
    reference: string | null
    provider: string
    created_at: string
    provider_payment_id?: string
    stars_amount?: number | null
    pack_name?: string | null
    payment_method?: {
        type: string
        last_four?: string
        brand?: string
    }
    status: string
}

export default function TransactionDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const t = useTranslations("Billing")
    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [loading, setLoading] = useState(true)
    const [copiedId, setCopiedId] = useState(false)
    const [copiedSession, setCopiedSession] = useState(false)

    useEffect(() => {
        if (!user || !params.id) return

        const fetchTransaction = async () => {
            try {
                const { data, error } = await supabase
                    .from("billing_transactions")
                    .select("*")
                    .eq("id", params.id)
                    .eq("user_id", user.id)
                    .single()

                if (error) {
                    console.error("Error fetching transaction:", error)
                    router.push("/billing")
                    return
                }

                setTransaction(data)
            } catch (err) {
                console.error("Error:", err)
                router.push("/billing")
            } finally {
                setLoading(false)
            }
        }

        fetchTransaction()
    }, [user, params.id, router])

    const getPaymentMethodDisplay = (tx: Transaction) => {
        if (tx.payment_method?.type === "card" && tx.payment_method.last_four) {
            const brand = tx.payment_method.brand || "card"
            return {
                icon: <CreditCard className='w-4 h-4' />,
                text: `${brand.toUpperCase()} •••• ${
                    tx.payment_method.last_four
                }`,
                type: "card",
            }
        } else if (tx.payment_method?.type === "digital_wallet") {
            return {
                icon: <Smartphone className='w-4 h-4' />,
                text: "Digital Wallet",
                type: "digital_wallet",
            }
        } else {
            return {
                icon: <Wallet className='w-4 h-4' />,
                text: tx.provider?.toUpperCase() || "Payment",
                type: "unknown",
            }
        }
    }

    const getStarsFromReference = (
        reference: string | null
    ): number | "infinity" | null => {
        if (!reference) return null
        if (reference.toLowerCase().includes("infinity")) return "infinity"
        const match = reference.match(/(\d+)\s*stars?/i)
        return match ? parseInt(match[1]) : null
    }

    const copyToClipboard = async (text: string, type: "id" | "session") => {
        try {
            await navigator.clipboard.writeText(text)
            if (type === "id") {
                setCopiedId(true)
                setTimeout(() => setCopiedId(false), 2000)
            } else {
                setCopiedSession(true)
                setTimeout(() => setCopiedSession(false), 2000)
            }
            toast.success("Copied to clipboard")
        } catch {
            toast.error("Failed to copy")
        }
    }

    if (loading) {
        return <BrandLoader />
    }

    if (!transaction) {
        return (
            <div className='min-h-screen bg-transparent p-6 flex items-center justify-center relative overflow-hidden'>
                <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                    <div className='absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 rounded-full blur-[120px]' />
                </div>
                <div className='max-w-md w-full relative z-10'>
                    <Card className='bg-white/[0.03] border-white/10 p-12 text-center backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-black/50'>
                        <div className='w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20'>
                            <AlertTriangle className='w-10 h-10 text-red-400' />
                        </div>
                        <h3 className='text-2xl font-bold text-white mb-4 font-serif'>
                            {t("transactionNotFound") ||
                                "Transaction Not Found"}
                        </h3>
                        <p className='text-gray-400 font-light mb-8'>
                            The transaction you&apos;re looking for doesn&apos;t
                            exist or you don&apos;t have permission to view it.
                        </p>
                        <Link href='/billing' className='w-full'>
                            <Button className='w-full h-12 rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all duration-300'>
                                <ArrowLeft className='mr-2 h-4 w-4' />
                                Back to Billing
                            </Button>
                        </Link>
                    </Card>
                </div>
            </div>
        )
    }

    const amount = transaction.amount_cents / 100
    const stars = getStarsFromReference(transaction.reference)
    const isSubscription = transaction.type.startsWith("subscription")
    const paymentMethod = getPaymentMethodDisplay(transaction)
    const createdDate = new Date(transaction.created_at)

    const title = (() => {
        const name = transaction.pack_name ?? null
        if (name) {
            if (isSubscription) return name
            return name.toLowerCase().includes("pack") ? name : `${name} Pack`
        }
        if (stars === "infinity" || transaction.stars_amount === null)
            return "Infinity Stars Pack"
        return `${stars || transaction.stars_amount || 0} Stars Pack`
    })()

    return (
        <div className='min-h-screen pb-20 relative bg-transparent text-white selection:bg-yellow-400/30'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse' />
                <div className='absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]' />
            </div>

            <div className='max-w-4xl mx-auto px-6 pt-10 relative z-10'>
                {/* Header */}
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2'>
                    <div className='space-y-4'>
                        <Link href='/billing'>
                            <Button
                                variant='outline'
                                className='rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white transition-all duration-300'
                            >
                                <ArrowLeft className='mr-2 h-4 w-4' />
                                {t("back")}
                            </Button>
                        </Link>
                        <div className='mt-4'>
                            <div className='flex items-center gap-2 mb-2'>
                                <Badge
                                    variant='outline'
                                    className='bg-yellow-400/10 border-yellow-400/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest px-3'
                                >
                                    {t("receipt")}
                                </Badge>
                                <span className='text-xs text-gray-500 font-mono'>
                                    #{transaction.id}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                    {/* Main Transaction Info */}
                    <Card className='lg:col-span-2 overflow-hidden bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/50 m-0'>
                        <div className='space-y-5'>
                            {/* Summary Section */}
                            <div className='flex items-start gap-6'>
                                <div
                                    className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border transition-transform duration-500 hover:scale-105 ${
                                        isSubscription
                                            ? "bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30"
                                            : "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30"
                                    }`}
                                >
                                    {isSubscription ? (
                                        <Zap className='w-10 h-10 fill-current' />
                                    ) : (
                                        <Star className='w-10 h-10 fill-current' />
                                    )}
                                </div>
                                <div className='space-y-1'>
                                    <h1 className='text-2xl font-bold text-white'>
                                        {title}
                                    </h1>

                                    <div className='flex items-center gap-3 pt-3'>
                                        <Badge className='bg-green-500/20 text-green-300 border-green-500/30 font-bold'>
                                            <CheckCircle2 className='w-3 h-3 mr-1.5' />
                                            {transaction.status.toUpperCase()}
                                        </Badge>
                                        {isSubscription && (
                                            <Badge className='bg-purple-500/20 text-purple-300 border-purple-500/30 font-bold'>
                                                {t(
                                                    "subscription"
                                                )?.toUpperCase()}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className='flex flex-col'>
                                <div className='text-sm font-medium text-gray-500 uppercase tracking-widest mb-1'>
                                    {t("totalAmount")}
                                </div>
                                <div className='text-3xl font-bold bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent'>
                                    {transaction.currency === "THB" ? "฿" : "$"}
                                    {amount.toFixed(2)}
                                </div>
                            </div>

                            {/* Details Table */}
                            <div className='space-y-4 pt-6 border-t border-white/5'>
                                <h4 className='text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4'>
                                    {t("transactionDetails")}
                                </h4>
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12'>
                                    {/* Date */}
                                    <div className='space-y-1.5'>
                                        <div className='flex items-center gap-2 text-gray-500'>
                                            <Calendar className='w-3.5 h-3.5' />
                                            <span className='text-[10px] font-bold uppercase tracking-wider'>
                                                {t("date")}
                                            </span>
                                        </div>
                                        <div className='text-white font-medium'>
                                            {format(
                                                createdDate,
                                                "MMMM do, yyyy"
                                            )}
                                        </div>
                                        <div className='text-xs text-gray-500 flex items-center gap-1.5'>
                                            <Clock className='w-3 h-3' />
                                            {format(createdDate, "h:mm a")}
                                        </div>
                                    </div>

                                    {/* Payment Method */}
                                    <div className='space-y-1.5'>
                                        <div className='flex items-center gap-2 text-gray-500'>
                                            {paymentMethod.icon}
                                            <span className='text-[10px] font-bold uppercase tracking-wider'>
                                                {t("paymentMethod")}
                                            </span>
                                        </div>
                                        <div className='text-white font-medium'>
                                            {paymentMethod.text}
                                        </div>
                                        <div className='text-xs text-gray-500 capitalize'>
                                            {transaction.provider} secure
                                            payment
                                        </div>
                                    </div>

                                    {/* Currency */}
                                    <div className='space-y-1.5'>
                                        <div className='flex items-center gap-2 text-gray-500'>
                                            <DollarSign className='w-3.5 h-3.5' />
                                            <span className='text-[10px] font-bold uppercase tracking-wider'>
                                                {t("currency")}
                                            </span>
                                        </div>
                                        <div className='text-white font-medium uppercase'>
                                            {transaction.currency}
                                        </div>
                                        <div className='text-xs text-gray-500'>
                                            Market Exchange Rate
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Sidebar Info */}
                    <div className='space-y-6'>
                        <Card className='overflow-hidden bg-white/[0.03] border-white/10 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl shadow-black/50'>
                            <h4 className='text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-6'>
                                {t("identifiers")}
                            </h4>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
                                            {t("transactionId")}
                                        </span>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            className='h-6 w-6 p-0 hover:bg-white/5'
                                            onClick={() =>
                                                copyToClipboard(
                                                    transaction.id,
                                                    "session"
                                                )
                                            }
                                        >
                                            {copiedSession ? (
                                                <Check className='w-3 h-3 text-green-400' />
                                            ) : (
                                                <Copy className='w-3 h-3' />
                                            )}
                                        </Button>
                                    </div>
                                    <div className='bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-gray-400 break-all'>
                                        {transaction.id}
                                    </div>
                                </div>

                                {transaction.provider_payment_id && (
                                    <div className='space-y-2'>
                                        <div className='flex items-center justify-between'>
                                            <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
                                                {t("providerId")}
                                            </span>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                className='h-6 w-6 p-0 hover:bg-white/5'
                                                onClick={() =>
                                                    copyToClipboard(
                                                        transaction.provider_payment_id!,
                                                        "id"
                                                    )
                                                }
                                            >
                                                {copiedId ? (
                                                    <Check className='w-3 h-3 text-green-400' />
                                                ) : (
                                                    <Copy className='w-3 h-3' />
                                                )}
                                            </Button>
                                        </div>
                                        <div className='bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-gray-400 break-all'>
                                            {transaction.provider_payment_id}
                                        </div>
                                    </div>
                                )}

                                <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                        <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
                                            {t("reference")}
                                            {transaction.reference?.includes(
                                                "(Subscription)"
                                            ) && (
                                                <span className='ml-1'>
                                                    (SUBSCRIPTION)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className='bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px] text-gray-400 break-all'>
                                        {transaction.reference
                                            ? transaction.reference
                                                  .split(":")[1]
                                                  ?.trim()
                                                  .split(" ")[0]
                                            : "N/A"}
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Support Card */}
                        <Card className='relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-transparent border-white/10 backdrop-blur-xl rounded-[2rem] p-8 group transition-all duration-500 hover:border-indigo-500/30'>
                            <div className='absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity'>
                                <Shield className='w-24 h-24 text-indigo-400' />
                            </div>
                            <h3 className='text-sm font-bold text-white mb-2'>
                                {t("needHelp")}
                            </h3>
                            <p className='text-xs text-gray-500 font-light leading-relaxed mb-6'>
                                {t("supportDesc")}
                            </p>
                            <Link href='/contact'>
                                <Button className='w-full h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-xs font-bold transition-all duration-300'>
                                    {t("contactSupport")}
                                    <ExternalLink className='w-3 h-3 ml-2' />
                                </Button>
                            </Link>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
