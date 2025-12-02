// app/[locale]/success/page.tsx

import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Sparkles, Star, ArrowRight, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { stripe } from "@/lib/stripe"
import { getTranslations } from "next-intl/server"

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

    if (status === "open") {
        return redirect("/")
    }

    if (status === "complete") {
        return (
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
                                {t("description")}
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
                                <p className='text-sm text-white/60 mt-4 text-center'>
                                    {t("emailNote")}
                                </p>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className='flex flex-col gap-3 sm:flex-row sm:justify-center sm:items-center pt-4'>
                            <Link href='/stars' className='w-full sm:w-auto'>
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
        )
    }

    return null
}
