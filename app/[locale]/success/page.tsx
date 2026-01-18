// app/[locale]/success/page.tsx

import { redirect } from "next/navigation"
import Link from "next/link"
import {
    CheckCircle2,
    Sparkles,
    Star,
    ArrowRight,
    Mail,
    History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { stripe } from "@/lib/stripe"
import { getTranslations } from "next-intl/server"
import { getPackById } from "@/lib/payments/star-products"
import { supabaseAdmin } from "@/lib/supabase"
import { RefreshStarsOnSuccess } from "@/components/stars/refresh-on-success"

export default async function Success({
    searchParams,
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    const { session_id } = await searchParams
    const t = await getTranslations("CheckoutSuccess")

    if (!session_id) {
        return redirect("/")
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ["line_items", "payment_intent", "subscription"],
    })

    const status = session.status
    const customerEmail = session.customer_details?.email
    const metadata = session.metadata || {}
    const mode = metadata.mode || "pack"
    const userId = metadata.userId

    if (status === "open") {
        return redirect("/")
    }

    // Calculate stars amount for display
    let starsDescription = t("description") // Fallback to default description

    // Add stars to user balance after successful purchase (only for pack or subscribe mode)
    if (
        status === "complete" &&
        (mode === "pack" || mode === "subscribe") &&
        userId &&
        supabaseAdmin
    ) {
        try {
            // Get price ID from line items for description
            const lineItems = session.line_items?.data || []
            const priceId = lineItems[0]?.price?.id

            if (priceId) {
                // Get pack info to determine stars amount
                const pack = getPackById(priceId)

                if (pack) {
                    let starsAmount: number | null = null
                    if (pack.stars === "infinity") {
                        starsDescription = t("descriptionInfinity", {
                            defaultValue:
                                "Your payment has been processed successfully. You now have unlimited stars and are ready to use them.",
                        })
                    } else if (typeof pack.stars === "number") {
                        starsAmount = pack.stars + pack.bonus
                        starsDescription = t("descriptionWithStars", {
                            stars: starsAmount,
                            defaultValue: `Your payment has been processed successfully. ${starsAmount} stars have been added to your account and are ready to use.`,
                        })
                    }

                    // ATOMIC FULFILLMENT START:
                    // 1. Record the subscription if applicable (upsert is safe)
                    let subscriptionId: string | null = null
                    if (mode === "subscribe" && session.subscription) {
                        let sub: unknown = session.subscription

                        // If sub is just a string (ID), fetch the full object
                        if (typeof sub === "string") {
                            try {
                                sub = await stripe.subscriptions.retrieve(sub)
                            } catch (err) {
                                console.error(
                                    "Error fetching subscription from Stripe:",
                                    err
                                )
                            }
                        }

                        const subObj = sub as {
                            id: string
                            status: string
                            current_period_start: number
                            current_period_end: number
                            cancel_at_period_end: boolean
                        }

                        const isValidSub =
                            subObj &&
                            typeof subObj === "object" &&
                            typeof subObj.id === "string"

                        if (isValidSub) {
                            const { data: subData, error: subError } =
                                await supabaseAdmin
                                    .from("billing_subscriptions")
                                    .upsert(
                                        {
                                            user_id: userId,
                                            provider: "stripe",
                                            provider_subscription_id: subObj.id,
                                            plan:
                                                pack.infinityTerm || "monthly",
                                            status: subObj.status || "active",
                                            current_period_start:
                                                subObj.current_period_start
                                                    ? new Date(
                                                          subObj.current_period_start *
                                                              1000
                                                      ).toISOString()
                                                    : new Date().toISOString(),
                                            current_period_end:
                                                subObj.current_period_end
                                                    ? new Date(
                                                          subObj.current_period_end *
                                                              1000
                                                      ).toISOString()
                                                    : new Date(
                                                          Date.now() +
                                                              30 *
                                                                  24 *
                                                                  60 *
                                                                  60 *
                                                                  1000
                                                      ).toISOString(),
                                            cancel_at_period_end:
                                                subObj.cancel_at_period_end ||
                                                false,
                                            updated_at:
                                                new Date().toISOString(),
                                        },
                                        {
                                            onConflict:
                                                "provider_subscription_id",
                                        }
                                    )
                                    .select("id")
                                    .single()

                            if (subError) {
                                console.error(
                                    "Error recording subscription:",
                                    subError
                                )
                            } else {
                                subscriptionId = subData.id
                            }
                        } else {
                        }
                    }

                    // 2. Attempt to record the transaction record FIRST.
                    // This relies on the UNIQUE constraint on provider_payment_id
                    const amountTotal = session.amount_total || 0
                    const currency = (session.currency || "usd").toUpperCase()

                    const { error: transactionError } = await supabaseAdmin
                        .from("billing_transactions")
                        .insert({
                            user_id: userId,
                            type:
                                mode === "subscribe"
                                    ? "subscription_initial"
                                    : "one_time",
                            provider: "stripe",
                            provider_payment_id: session_id,
                            amount_cents: amountTotal,
                            currency: currency,
                            reference: `Checkout session: ${session_id}${mode === "subscribe" ? " (Subscription)" : ""}`,
                            status: "succeeded",
                            stars_amount: starsAmount,
                            pack_name: pack.name,
                            subscription_id: subscriptionId,
                        })
                        .select("id")
                        .single()

                    if (transactionError) {
                        // code 23505 is unique violation in Postgres
                        if (transactionError.code === "23505") {
                            console.log(
                                "Transaction already processed for session:",
                                session_id
                            )
                            // We don't return here anymore, so the page can still render
                        } else {
                            throw transactionError
                        }
                    } else {
                        // 3. Grant the benefits (only reached if transaction record was created successfully)
                        // Get current stars balance
                        const { data: currentData, error: currentErr } =
                            await supabaseAdmin.rpc("star_get_or_create", {
                                p_anon_device_id: null,
                                p_user_id: userId,
                            })

                        if (!currentErr && currentData?.[0]) {
                            const currentStars =
                                (currentData[0] as { current_stars?: number })
                                    .current_stars || 0

                            if (pack.stars === "infinity") {
                                // Handle infinity pack purchase
                                // Save current currency before setting infinity
                                const savedCurrency = currency

                                // Check if user already has active infinity
                                const currentInfinityExpiresAt = (
                                    currentData[0] as {
                                        infinity_expires_at?: string | null
                                    }
                                )?.infinity_expires_at
                                const currentIsInfinity =
                                    (
                                        currentData[0] as {
                                            is_infinity?: boolean
                                        }
                                    )?.is_infinity || false

                                let expiresAt: Date
                                const monthsToAdd =
                                    pack.infinityTerm === "year" ? 12 : 1

                                // If user already has active infinity, extend from current expiration
                                if (
                                    currentIsInfinity &&
                                    currentInfinityExpiresAt
                                ) {
                                    const currentExpiration = new Date(
                                        currentInfinityExpiresAt
                                    )
                                    // Only extend if current expiration is in the future
                                    if (currentExpiration > new Date()) {
                                        expiresAt = new Date(currentExpiration)
                                        // Use UTC methods to ensure consistent timezone
                                        expiresAt.setUTCMonth(
                                            expiresAt.getUTCMonth() +
                                                monthsToAdd
                                        )
                                    } else {
                                        // Current expiration is past, start from now (UTC)
                                        expiresAt = new Date()
                                        expiresAt.setUTCMonth(
                                            expiresAt.getUTCMonth() +
                                                monthsToAdd
                                        )
                                    }
                                } else {
                                    // New infinity purchase, start from now (UTC)
                                    expiresAt = new Date()
                                    expiresAt.setUTCMonth(
                                        expiresAt.getUTCMonth() + monthsToAdd
                                    )
                                }

                                // We no longer update the stars table's is_infinity column.
                                // Instead, we rely on the billing_subscriptions table for recurring subs,
                                // but we might still need to store one-time infinity expiration if it's not a subscription.
                                // If this is NOT a subscription, we can still use the stars table as a backup for one-time infinity.
                                if (mode !== "subscribe") {
                                    const { error: updateError } =
                                        await supabaseAdmin
                                            .from("stars")
                                            .update({
                                                is_infinity: true,
                                                infinity_expires_at:
                                                    expiresAt.toISOString(),
                                                last_currency_before_infinity:
                                                    savedCurrency,
                                                updated_at:
                                                    new Date().toISOString(),
                                            })
                                            .eq("user_id", userId)

                                    if (updateError) {
                                        console.error(
                                            "Failed to set one-time infinity stars:",
                                            updateError
                                        )
                                    }
                                } else {
                                    // For subscriptions, ensure the stars table's is_infinity is FALSE
                                    // to avoid the "complex" the user mentioned.
                                    // The RPC will handle checking billing_subscriptions.
                                    await supabaseAdmin
                                        .from("stars")
                                        .update({
                                            is_infinity: false,
                                            infinity_expires_at: null,
                                            updated_at:
                                                new Date().toISOString(),
                                        })
                                        .eq("user_id", userId)
                                }
                            } else if (typeof pack.stars === "number") {
                                // Handle regular pack purchase
                                const newBalance =
                                    currentStars + (pack.stars + pack.bonus)

                                // Update stars balance
                                await supabaseAdmin.rpc("star_set", {
                                    p_anon_device_id: null,
                                    p_new_balance: newBalance,
                                    p_user_id: userId,
                                })
                            }
                        }
                    }
                }
            }
        } catch (error) {
            // Log error but don't block the success page
            console.error("Error adding stars after purchase:", error)
        }
    }

    if (status === "complete") {
        return (
            <>
                <RefreshStarsOnSuccess />
                <div className='relative min-h-[calc(100vh-64px)] flex items-center justify-center p-6 bg-transparent overflow-hidden'>
                    <div className='relative z-10 w-full max-w-2xl'>
                        <Card className='relative overflow-hidden border-white/10 bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-black/50 group'>
                            {/* Animated Border Glow */}
                            <div className='absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none'>
                                <div className='absolute inset-[-1px] bg-gradient-to-tr from-yellow-500/20 via-transparent to-emerald-500/20 rounded-[2.5rem]' />
                            </div>

                            <div className='relative z-10 text-center space-y-10'>
                                {/* Celebratory Icon Section */}
                                <div className='relative flex justify-center'>
                                    <div className='relative w-32 h-32'>
                                        {/* Outer spinning ring */}
                                        <div className='absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/30 animate-[spin_10s_linear_infinite]' />

                                        {/* Main Success Circle */}
                                        <div className='absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 via-green-500/10 to-transparent border border-emerald-500/20 shadow-lg shadow-emerald-500/20'>
                                            <CheckCircle2
                                                className='w-16 h-16 text-emerald-400'
                                                strokeWidth={1.5}
                                            />
                                        </div>

                                        {/* Floating Sparkles */}
                                        <Sparkles className='absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse' />
                                        <div className='absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-400 animate-ping' />
                                    </div>
                                </div>

                                {/* Badge & Title */}
                                <div className='space-y-4'>
                                    <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest animate-fade-in'>
                                        <Sparkles className='w-3 h-3' />
                                        <span>{t("badge")}</span>
                                    </div>
                                    <h1 className='font-serif text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight'>
                                        {t("title")}
                                    </h1>
                                    <p className='text-lg text-gray-400 font-light leading-relaxed max-w-lg mx-auto'>
                                        {starsDescription}
                                    </p>
                                </div>

                                {/* Magical Receipt Section */}
                                {customerEmail && (
                                    <div className='relative mx-auto max-w-md'>
                                        <div className='absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 blur-xl' />
                                        <div className='flex items-center gap-4 text-left group/receipt'>
                                            <div className='w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center transition-transform group-hover/receipt:scale-110'>
                                                <Mail className='w-6 h-6 text-blue-400' />
                                            </div>
                                            <div className='space-y-0.5'>
                                                <p className='text-[9px] text-gray-500 font-medium uppercase tracking-wider'>
                                                    {t("emailLabel")}
                                                </p>
                                                <p className='text-white font-semibold'>
                                                    {customerEmail}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Premium Action Buttons */}
                                <div className='flex flex-col sm:flex-row items-center justify-center gap-4 pt-4'>
                                    <Link
                                        href='/billing'
                                        className='w-full sm:w-auto'
                                    >
                                        <Button
                                            variant='outline'
                                            className='w-full h-14 px-8 rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold transition-all duration-300'
                                        >
                                            <History className='w-5 h-5 mr-3 text-gray-400' />
                                            {t("viewBilling")}
                                        </Button>
                                    </Link>
                                    <Link
                                        href='/stars'
                                        className='w-full sm:w-auto'
                                    >
                                        <Button className='w-full h-14 px-10 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold shadow-xl shadow-yellow-500/20'>
                                            <Star className='w-5 h-5 mr-3 fill-current' />
                                            {t("viewStars")}
                                            <ArrowRight className='w-5 h-5 ml-3' />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </>
        )
    }

    return null
}
