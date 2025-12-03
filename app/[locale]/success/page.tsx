// app/[locale]/success/page.tsx

import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Sparkles, Star, ArrowRight, Mail } from "lucide-react"
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
        expand: ["line_items", "payment_intent"],
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

    // Add stars to user balance after successful purchase (only for pack mode)
    if (status === "complete" && mode === "pack" && userId && supabaseAdmin) {
        try {
            // Check if stars have already been granted for this session
            const { data: existingTransaction } = await supabaseAdmin
                .from("billing_transactions")
                .select("id")
                .eq("provider", "stripe")
                .eq("provider_payment_id", session_id)
                .eq("user_id", userId)
                .eq("type", "one_time")
                .maybeSingle()

            // Get price ID from line items for description
            const lineItems = session.line_items?.data || []
            const priceId = lineItems[0]?.price?.id

            if (priceId) {
                // Get pack info to determine stars amount
                const pack = getPackById(priceId)

                if (pack) {
                    if (pack.stars === "infinity") {
                        starsDescription = t("descriptionInfinity", {
                            defaultValue:
                                "Your payment has been processed successfully. You now have unlimited stars and are ready to use them.",
                        })
                    } else if (typeof pack.stars === "number") {
                        const starsAmount = pack.stars + pack.bonus
                        starsDescription = t("descriptionWithStars", {
                            stars: starsAmount,
                            defaultValue: `Your payment has been processed successfully. ${starsAmount} stars have been added to your account and are ready to use.`,
                        })
                    }

                    // Only grant stars if transaction doesn't already exist
                    if (!existingTransaction) {
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
                            const currency = (
                                session.currency || "usd"
                            ).toUpperCase()

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
                                            expiresAt.getUTCMonth() + 1
                                        )
                                    } else {
                                        // Current expiration is past, start from now (UTC)
                                        expiresAt = new Date()
                                        expiresAt.setUTCMonth(
                                            expiresAt.getUTCMonth() + 1
                                        )
                                    }
                                } else {
                                    // New infinity purchase, start from now (UTC)
                                    expiresAt = new Date()
                                    expiresAt.setUTCMonth(
                                        expiresAt.getUTCMonth() + 1
                                    )
                                }

                                // Use direct update for infinity (RPC function may have signature mismatch)
                                const { data: updateData, error: updateError } =
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
                                        .select()

                                if (updateError) {
                                    console.error(
                                        "Failed to set infinity stars:",
                                        updateError
                                    )
                                    // Log the error but don't block the success page
                                } else {
                                    console.log(
                                        "Infinity stars set successfully:",
                                        updateData
                                    )
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

                            // Record the transaction to prevent duplicate grants
                            const amountTotal = session.amount_total || 0
                            await supabaseAdmin
                                .from("billing_transactions")
                                .insert({
                                    user_id: userId,
                                    type: "one_time",
                                    provider: "stripe",
                                    provider_payment_id: session_id,
                                    amount_cents: amountTotal,
                                    currency: currency,
                                    reference: `Checkout session: ${session_id}`,
                                    status: "succeeded",
                                })
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
                <div className='relative min-h-screen'>
                    {/* Animated background elements */}
                    <div className='absolute inset-0 overflow-hidden'>
                        <div className='absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse' />
                        <div className='absolute top-40 right-16 w-24 h-24 bg-gradient-to-r from-yellow-400/15 to-amber-500/15 rounded-full blur-2xl animate-pulse delay-1000' />
                        <div className='absolute bottom-20 left-1/4 w-40 h-40 bg-gradient-to-r from-purple-400/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000' />
                    </div>

                    <section className='relative z-10 max-w-3xl mx-auto px-6 py-16'>
                        <div className='text-center space-y-8'>
                            {/* Success Icon */}
                            <div className='flex justify-center'>
                                <div className='relative'>
                                    <div className='mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-green-500/40 bg-gradient-to-br from-green-500/20 via-emerald-500/20 to-green-600/20 shadow-lg shadow-green-500/20'>
                                        <CheckCircle2 className='w-12 h-12 text-green-300' />
                                    </div>
                                    {/* Orbiting sparkles */}
                                    <div className='absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 animate-ping' />
                                    <div className='absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-gradient-to-r from-green-300 to-emerald-400 animate-pulse' />
                                </div>
                            </div>

                            {/* Badge */}
                            <div className='inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-400/20 to-emerald-500/20 border border-green-500/30 text-green-200 text-sm font-medium'>
                                <Sparkles className='w-4 h-4 animate-pulse' />
                                <span>{t("badge")}</span>
                            </div>

                            {/* Title */}
                            <div className='space-y-4'>
                                <h1 className='font-serif text-4xl md:text-5xl font-bold text-white'>
                                    {t("title")}
                                </h1>
                                <p className='text-base text-white/80 leading-relaxed max-w-2xl mx-auto'>
                                    {starsDescription}
                                </p>
                            </div>

                            {/* Email Confirmation Card */}
                            {customerEmail && (
                                <Card className='p-6 bg-gradient-to-br from-white/5 via-white/3 to-transparent border-white/10 backdrop-blur-sm'>
                                    <div className='flex items-center gap-4'>
                                        <div className='flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center'>
                                            <Mail className='w-6 h-6 text-blue-300' />
                                        </div>
                                        <div className='flex-1 text-left'>
                                            <p className='text-sm text-white/60 mb-1'>
                                                {t("emailLabel")}
                                            </p>
                                            <p className='text-white font-semibold'>
                                                {customerEmail}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Action Buttons */}
                            <div className='flex flex-col gap-3 sm:flex-row sm:justify-center sm:items-center pt-4'>
                                <Link
                                    href='/stars'
                                    className='w-full sm:w-auto'
                                >
                                    <Button className='w-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-black hover:from-yellow-300 hover:via-amber-400 hover:to-orange-400 transition-all duration-300 font-semibold'>
                                        <Star className='w-4 h-4 mr-2' />
                                        {t("viewStars")}
                                        <ArrowRight className='w-4 h-4 ml-2' />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </section>
                </div>
            </>
        )
    }

    return null
}
