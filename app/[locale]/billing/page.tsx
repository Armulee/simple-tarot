"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
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
    CreditCard,
    Smartphone,
    Wallet,
} from "lucide-react"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"

type Tx = {
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
}

export default function BillingPage() {
    const { user } = useAuth()
    const [txs, setTxs] = useState<Tx[]>([])
    const [loading, setLoading] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

    useEffect(() => {
        let mounted = true
        if (!user) return
        ;(async () => {
            setLoading(true)
            const { data } = await supabase
                .from("billing_transactions")
                .select(
                    "id,type,amount_cents,currency,reference,provider,created_at"
                )
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
            if (!mounted) return
            setTxs((data as Tx[]) || [])
            setLoading(false)
        })()
        return () => {
            mounted = false
        }
    }, [user])

    // Helper function to extract stars from reference
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
        }
    }

    // Get payment method display
    const getPaymentMethodDisplay = (tx: Tx) => {
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
                text: "Payment",
                type: "unknown",
            }
        }
    }

    // Group transactions by month/year
    const groupTransactionsByPeriod = () => {
        const currentYear = new Date().getFullYear()
        const filteredTxs = txs.filter((tx) => {
            const txDate = new Date(tx.created_at)

            // Apply date range filter
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

            let key: string
            if (year === currentYear) {
                // Current year: group by month
                key = `${year}-${month}`
            } else {
                // Previous years: group by year only
                key = `${year}`
            }

            if (!grouped[key]) {
                grouped[key] = []
            }
            grouped[key].push(tx)
        })

        // Sort groups by date (most recent first)
        return Object.entries(grouped).sort(([a], [b]) => {
            const aDate = new Date(a.includes("-") ? `${a}-01` : `${a}-01-01`)
            const bDate = new Date(b.includes("-") ? `${b}-01` : `${b}-01-01`)
            return bDate.getTime() - aDate.getTime()
        })
    }

    // Format period header
    const formatPeriodHeader = (key: string) => {
        const currentYear = new Date().getFullYear()
        const [year, month] = key.split("-").map(Number)

        if (year === currentYear && month !== undefined) {
            // Current year month
            const monthNames = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ]
            return monthNames[month] + " " + year
        } else {
            // Previous year
            return year.toString()
        }
    }

    return (
        <div className='min-h-screen p-6 relative'>
            {/* Background decorative elements */}
            <div className='absolute inset-0 overflow-hidden pointer-events-none'>
                <div className='absolute -top-40 -right-40 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl'></div>
                <div className='absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/5 rounded-full blur-3xl'></div>
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/3 rounded-full blur-3xl'></div>
            </div>

            <div className='max-w-4xl mx-auto space-y-8 pt-10 relative z-10'>
                {/* Header */}
                <div className='text-center'>
                    <h1 className='text-4xl font-serif font-bold drop-shadow-lg'>
                        Transaction History
                    </h1>
                    <p className='text-gray-300 font-light text-sm mt-2'>
                        View your purchase records and billing information
                    </p>
                </div>

                {/* Date Filter */}
                {txs.length > 0 && (
                    <div className='flex justify-center'>
                        <div className='flex items-center space-x-6'>
                            {/* Date Range Filter */}
                            <div className='flex items-center space-x-3'>
                                <span className='font-semibold'>
                                    Filter by Date:
                                </span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant='outline'
                                            className='w-64 bg-black/50 border-yellow-400/30 text-yellow-300 hover:border-yellow-400/50 hover:bg-black/70 transition-all duration-300 justify-start text-left font-normal'
                                        >
                                            <CalendarIcon className='mr-2 h-4 w-4' />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(
                                                            dateRange.from,
                                                            "LLL dd, y"
                                                        )}{" "}
                                                        -{" "}
                                                        {format(
                                                            dateRange.to,
                                                            "LLL dd, y"
                                                        )}
                                                    </>
                                                ) : (
                                                    format(
                                                        dateRange.from,
                                                        "LLL dd, y"
                                                    )
                                                )
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className='w-auto p-0 bg-black/95 border-yellow-400/30 backdrop-blur-md'
                                        align='start'
                                    >
                                        <Calendar
                                            mode='range'
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            className='bg-transparent'
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Clear Filters */}
                            {(dateRange?.from || dateRange?.to) && (
                                <Button
                                    variant='outline'
                                    onClick={() => {
                                        setDateRange(undefined)
                                    }}
                                    className='bg-red-500/20 border-red-400/30 text-red-300 hover:bg-red-500/30 hover:border-red-400/50 transition-all duration-300'
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Transactions List */}
                <div className='space-y-6'>
                    {loading && (
                        <Card className='bg-gradient-to-r from-black/40 to-black/20 border-yellow-400/20 p-12 shadow-xl shadow-black/20 backdrop-blur-sm'>
                            <div className='flex items-center justify-center space-x-3'>
                                <div className='w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50'></div>
                                <div
                                    className='w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50'
                                    style={{ animationDelay: "0.2s" }}
                                />
                                <div
                                    className='w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse shadow-lg shadow-yellow-400/50'
                                    style={{ animationDelay: "0.4s" }}
                                />
                                <span className='text-yellow-300 ml-4 text-lg font-medium'>
                                    Loading your magical history...
                                </span>
                            </div>
                        </Card>
                    )}

                    {!loading && txs.length === 0 && (
                        <Card className='bg-gradient-to-r from-black/40 to-black/20 border-yellow-400/20 p-16 text-center shadow-xl shadow-black/20 backdrop-blur-sm'>
                            <div className='text-8xl mb-6 drop-shadow-lg'>
                                ✨
                            </div>
                            <h3 className='text-2xl font-bold text-yellow-300 mb-3'>
                                No purchases yet
                            </h3>
                            <p className='text-gray-300 text-lg font-light'>
                                Your magical journey starts with your first star
                                purchase
                            </p>
                        </Card>
                    )}

                    {!loading &&
                        groupTransactionsByPeriod().map(
                            ([periodKey, periodTxs]) => (
                                <div key={periodKey} className='space-y-4'>
                                    {/* Period Header */}
                                    <div className='flex items-center space-x-4'>
                                        <div className='relative'>
                                            <h2 className='font-bold text-yellow-300 px-6 py-1 bg-gradient-to-r from-black/50 to-black/30 rounded-full border border-yellow-400/40 shadow-lg shadow-yellow-400/20 backdrop-blur-sm'>
                                                {formatPeriodHeader(periodKey)}
                                            </h2>
                                            <div className='absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-full blur-md' />
                                        </div>
                                        <div className='h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent flex-1' />
                                    </div>

                                    {/* Transactions for this period */}
                                    <div className='space-y-3'>
                                        {periodTxs.map((t) => {
                                            const amount =
                                                (t.amount_cents ?? 0) / 100
                                            const { date, time } = formatDate(
                                                t.created_at
                                            )
                                            const stars = getStarsFromReference(
                                                t.reference
                                            )
                                            const isSubscription =
                                                t.type.startsWith(
                                                    "subscription"
                                                )

                                            const paymentMethod =
                                                getPaymentMethodDisplay(t)

                                            return (
                                                <Link
                                                    href={`/billing/transactions/${t.id}`}
                                                    key={t.id}
                                                >
                                                    <Card className='bg-gradient-to-r from-black/40 to-black/20 border-yellow-400/20 hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/20 relative pt-6 pb-0 backdrop-blur-sm group cursor-pointer'>
                                                        {/* Date and Time badges positioned at top left */}
                                                        <div className='absolute top-3 left-3 flex space-x-2'>
                                                            <Badge
                                                                variant='outline'
                                                                className='bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-yellow-200 border-yellow-400/40 text-xs font-medium shadow-lg shadow-yellow-400/20 backdrop-blur-sm hover:from-yellow-400/30 hover:to-orange-500/30 transition-all duration-300'
                                                            >
                                                                {date}
                                                            </Badge>
                                                            <Badge
                                                                variant='outline'
                                                                className='bg-gradient-to-r from-purple-400/20 to-pink-500/20 text-purple-200 border-purple-400/40 text-xs font-medium shadow-lg shadow-purple-400/20 backdrop-blur-sm hover:from-purple-400/30 hover:to-pink-500/30 transition-all duration-300'
                                                            >
                                                                {time}
                                                            </Badge>
                                                        </div>

                                                        {/* Payment Method badge positioned at top right */}
                                                        <div className='absolute top-3 right-3'>
                                                            <Badge
                                                                variant='outline'
                                                                className='bg-gradient-to-r from-blue-400/20 to-cyan-500/20 text-blue-200 border-blue-400/40 text-xs font-medium shadow-lg shadow-blue-400/20 backdrop-blur-sm hover:from-blue-400/30 hover:to-cyan-500/30 transition-all duration-300 flex items-center space-x-1'
                                                            >
                                                                {
                                                                    paymentMethod.icon
                                                                }
                                                                <span>
                                                                    {
                                                                        paymentMethod.text
                                                                    }
                                                                </span>
                                                            </Badge>
                                                        </div>

                                                        <div className='p-6'>
                                                            <div className='flex items-center justify-between'>
                                                                <div className='flex items-center space-x-4'>
                                                                    {/* Icon */}
                                                                    <div className='flex items-center justify-center'>
                                                                        {isSubscription ? (
                                                                            <div className='w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-all duration-300'>
                                                                                <span className='text-2xl'>
                                                                                    🔄
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <Star className='w-8 h-8 fill-yellow-400 text-yellow-400 group-hover:text-yellow-300 transition-colors duration-300' />
                                                                        )}
                                                                    </div>

                                                                    {/* Details */}
                                                                    <div className='flex items-center space-x-3'>
                                                                        <h3 className='text-xl font-bold text-white group-hover:text-yellow-300 transition-colors duration-300'>
                                                                            {stars
                                                                                ? `${stars} Stars`
                                                                                : "Purchase"}
                                                                        </h3>
                                                                        {isSubscription && (
                                                                            <Badge
                                                                                variant='secondary'
                                                                                className='bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-200 border-purple-400/50 shadow-lg shadow-purple-500/20 backdrop-blur-sm'
                                                                            >
                                                                                Subscription
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Amount */}
                                                                <div className='text-right'>
                                                                    <div className='text-xl font-bold bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent group-hover:from-yellow-200 group-hover:to-orange-300 transition-all duration-300'>
                                                                        $
                                                                        {amount.toFixed(
                                                                            2
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        )}
                </div>
            </div>
        </div>
    )
}
