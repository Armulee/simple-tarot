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
    Hash,
    Shield,
} from "lucide-react"
import { format } from "date-fns"

type Transaction = {
    id: string
    type: string
    amount_cents: number
    currency: string
    reference: string | null
    provider: string
    created_at: string
    provider_payment_id?: string
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
    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [loading, setLoading] = useState(true)

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
                icon: <CreditCard className='w-5 h-5' />,
                text: `${brand.toUpperCase()} •••• ${
                    tx.payment_method.last_four
                }`,
                type: "card",
            }
        } else if (tx.payment_method?.type === "digital_wallet") {
            return {
                icon: <Smartphone className='w-5 h-5' />,
                text: "Digital Wallet",
                type: "digital_wallet",
            }
        } else {
            return {
                icon: <Wallet className='w-5 h-5' />,
                text: "Payment",
                type: "unknown",
            }
        }
    }

    const getStarsFromReference = (reference: string | null) => {
        if (!reference) return null
        const match = reference.match(/(\d+)\s*stars?/i)
        return match ? parseInt(match[1]) : null
    }

    if (loading) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d0b1f] to-[#0a0a1a] p-6 relative overflow-hidden'>
                <div className='max-w-4xl mx-auto pt-10 relative z-10'>
                    <Card className='bg-gradient-to-r from-black/40 to-black/20 border-yellow-400/20 p-12 shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='flex items-center justify-center space-x-3'>
                            <div className='w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50'></div>
                            <div
                                className='w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50'
                                style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                                className='w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50'
                                style={{ animationDelay: "0.4s" }}
                            ></div>
                            <span className='text-yellow-300 ml-4 text-lg font-medium'>
                                Loading transaction details...
                            </span>
                        </div>
                    </Card>
                </div>
            </div>
        )
    }

    if (!transaction) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d0b1f] to-[#0a0a1a] p-6 relative overflow-hidden'>
                <div className='max-w-4xl mx-auto pt-10 relative z-10'>
                    <Card className='bg-gradient-to-r from-black/40 to-black/20 border-red-400/20 p-16 text-center shadow-xl shadow-black/20 backdrop-blur-sm'>
                        <div className='text-8xl mb-6 drop-shadow-lg'>❌</div>
                        <h3 className='text-2xl font-bold text-red-300 mb-3'>
                            Transaction Not Found
                        </h3>
                        <p className='text-gray-300 text-lg font-light mb-6'>
                            The transaction you&apos;re looking for doesn&apos;t
                            exist or you don&apos;t have permission to view it.
                        </p>
                        <Link href='/billing'>
                            <Button className='bg-yellow-400/20 border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/30 hover:border-yellow-400/50 transition-all duration-300'>
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

    return (
        <div className='min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d0b1f] to-[#0a0a1a] p-6 relative overflow-hidden'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute -top-40 -right-40 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl'></div>
                <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl'></div>
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/3 rounded-full blur-3xl'></div>
            </div>

            <div className='max-w-4xl mx-auto space-y-8 relative z-10'>
                {/* Header */}
                <div className='space-y-4'>
                    <Link href='/billing'>
                        <Button
                            variant='outline'
                            className='bg-black/50 border-yellow-400/30 text-yellow-300 hover:border-yellow-400/50 hover:bg-black/70 transition-all duration-300'
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            Back
                        </Button>
                    </Link>
                    <div className='pt-4'>
                        <h1 className='text-3xl font-bold text-white'>
                            Transaction Details
                        </h1>
                        <p className='text-gray-400 text-sm'>
                            {transaction.id}
                        </p>
                    </div>
                </div>

                {/* Transaction Card */}
                <Card className='bg-gradient-to-r from-black/40 to-black/20 border-yellow-400/20 p-8 shadow-xl shadow-black/20 backdrop-blur-sm'>
                    <div className='space-y-6'>
                        {/* Main Transaction Info */}
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-4'>
                                {/* Icon */}
                                <div className='flex items-center justify-center'>
                                    {isSubscription ? (
                                        <div className='w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 shadow-lg shadow-purple-500/30'>
                                            <span className='text-3xl'>🔄</span>
                                        </div>
                                    ) : (
                                        <Star className='w-8 h-8 text-yellow-400 fill-yellow-400' />
                                    )}
                                </div>

                                {/* Details */}
                                <div>
                                    <h2 className='text-2xl font-bold text-white mb-1'>
                                        {stars ? `${stars} Stars` : "Purchase"}
                                    </h2>
                                    <div className='flex items-center space-x-2'>
                                        <Badge
                                            variant='secondary'
                                            className='bg-green-500/20 text-green-300 border-green-400/30'
                                        >
                                            {transaction.status.toUpperCase()}
                                        </Badge>
                                        {isSubscription && (
                                            <Badge
                                                variant='secondary'
                                                className='bg-purple-500/20 text-purple-300 border-purple-400/30'
                                            >
                                                Subscription
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className='text-right'>
                                <div className='text-2xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent'>
                                    ${amount.toFixed(2)}
                                </div>
                                <div className='text-sm text-gray-300 font-medium uppercase'>
                                    {transaction.currency || "USD"}
                                </div>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10'>
                            {/* Date & Time */}
                            <div className='space-y-3'>
                                <div className='flex items-center space-x-2 text-gray-400'>
                                    <Calendar className='w-4 h-4' />
                                    <span className='text-sm font-medium'>
                                        Date & Time
                                    </span>
                                </div>
                                <div className='text-white'>
                                    <div className='font-semibold'>
                                        {format(
                                            createdDate,
                                            "EEEE, MMMM do, yyyy"
                                        )}
                                    </div>
                                    <div className='text-sm text-gray-300'>
                                        {format(createdDate, "h:mm a")}
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className='space-y-3'>
                                <div className='flex items-center space-x-2 text-gray-400'>
                                    {paymentMethod.icon}
                                    <span className='text-sm font-medium'>
                                        Payment Method
                                    </span>
                                </div>
                                <div className='text-white font-semibold'>
                                    {paymentMethod.text}
                                </div>
                            </div>

                            {/* Transaction ID */}
                            <div className='space-y-3'>
                                <div className='flex items-center space-x-2 text-gray-400'>
                                    <Hash className='w-4 h-4' />
                                    <span className='text-sm font-medium'>
                                        Transaction ID
                                    </span>
                                </div>
                                <div className='text-white font-mono text-sm'>
                                    {transaction.provider_payment_id || "N/A"}
                                </div>
                            </div>

                            {/* Provider */}
                            <div className='space-y-3'>
                                <div className='flex items-center space-x-2 text-gray-400'>
                                    <Shield className='w-4 h-4' />
                                    <span className='text-sm font-medium'>
                                        Provider
                                    </span>
                                </div>
                                <div className='text-white font-semibold'>
                                    {transaction.provider.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Reference */}
                        {transaction.reference && (
                            <div className='pt-6 border-t border-white/10'>
                                <div className='space-y-3'>
                                    <div className='flex items-center space-x-2 text-gray-400'>
                                        <DollarSign className='w-4 h-4' />
                                        <span className='text-sm font-medium'>
                                            Reference
                                        </span>
                                    </div>
                                    <div className='text-white font-semibold'>
                                        {transaction.reference}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
