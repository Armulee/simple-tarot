"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Sparkles } from "lucide-react"

export default function BillingPage() {
    const t = useTranslations("Billing")
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
        "monthly"
    )

    const plans = [
        {
            name: "Free",
            price: { monthly: 0, annual: 0 },
            description: "Basic tarot readings with ads",
            features: [
                "3 free readings per day",
                "Basic card interpretations",
                "Share readings",
                "Mobile & desktop access",
                "Community support",
            ],
            limitations: [
                "Watch ads before readings",
                "Limited follow-up questions",
                "No priority support",
            ],
            popular: false,
            cta: "Current Plan",
            disabled: true,
        },
        {
            name: "Premium",
            price: { monthly: 2.99, annual: 29.99 },
            description: "Unlimited ad-free readings",
            features: [
                "Unlimited readings",
                "Ad-free experience",
                "Advanced AI interpretations",
                "Unlimited follow-up questions",
                "Priority support",
                "Reading history",
                "Export readings",
                "Exclusive card spreads",
                "Personalized insights",
            ],
            limitations: [],
            popular: true,
            cta: "Upgrade to Premium",
            disabled: false,
        },
    ]

    const monthlyPrice = plans[1].price.monthly
    const annualPrice = plans[1].price.annual
    const monthlySavings =
        ((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100

    return (
        <div className='min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'>
            <div className='container mx-auto px-4 py-16'>
                {/* Header */}
                <div className='text-center mb-16'>
                    <div className='flex items-center justify-center gap-2 mb-6'>
                        <Crown className='w-8 h-8 text-yellow-400' />
                        <h1 className='font-serif text-4xl font-bold text-white'>
                            {t("title")}
                        </h1>
                        <Crown className='w-8 h-8 text-yellow-400' />
                    </div>
                    <p className='text-xl text-gray-300 max-w-2xl mx-auto'>
                        {t("subtitle")}
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className='flex justify-center mb-12'>
                    <div className='bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20'>
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={`px-6 py-2 rounded-full transition-all duration-300 ${
                                billingCycle === "monthly"
                                    ? "bg-white text-black font-semibold"
                                    : "text-white hover:text-gray-200"
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingCycle("annual")}
                            className={`px-6 py-2 rounded-full transition-all duration-300 ${
                                billingCycle === "annual"
                                    ? "bg-white text-black font-semibold"
                                    : "text-white hover:text-gray-200"
                            }`}
                        >
                            Annual
                            <Badge className='ml-2 bg-green-500 text-white text-xs'>
                                Save {Math.round(monthlySavings)}%
                            </Badge>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className='grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16'>
                    {plans.map((plan) => (
                        <Card
                            key={plan.name}
                            className={`relative p-8 bg-card/10 backdrop-blur-sm border-border/20 ${
                                plan.popular
                                    ? "ring-2 ring-yellow-400/50 shadow-2xl shadow-yellow-400/20"
                                    : ""
                            }`}
                        >
                            {plan.popular && (
                                <div className='absolute -top-4 left-1/2 transform -translate-x-1/2'>
                                    <Badge className='bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold px-4 py-1'>
                                        Most Popular
                                    </Badge>
                                </div>
                            )}

                            <div className='text-center mb-6'>
                                <h3 className='text-2xl font-bold text-white mb-2'>
                                    {plan.name}
                                </h3>
                                <p className='text-gray-400 mb-4'>
                                    {plan.description}
                                </p>
                                <div className='mb-4'>
                                    <span className='text-4xl font-bold text-white'>
                                        $
                                        {billingCycle === "monthly"
                                            ? plan.price.monthly
                                            : plan.price.annual}
                                    </span>
                                    <span className='text-gray-400 ml-2'>
                                        /
                                        {billingCycle === "monthly"
                                            ? "month"
                                            : "year"}
                                    </span>
                                </div>
                                {billingCycle === "annual" &&
                                    plan.price.annual > 0 && (
                                        <p className='text-sm text-green-400'>
                                            ${monthlyPrice.toFixed(2)}/month
                                            billed annually
                                        </p>
                                    )}
                            </div>

                            <div className='space-y-4 mb-8'>
                                {plan.features.map((feature, featureIndex) => (
                                    <div
                                        key={featureIndex}
                                        className='flex items-center gap-3'
                                    >
                                        <Check className='w-5 h-5 text-green-400 flex-shrink-0' />
                                        <span className='text-gray-300'>
                                            {feature}
                                        </span>
                                    </div>
                                ))}
                                {plan.limitations.map(
                                    (limitation, limitIndex) => (
                                        <div
                                            key={limitIndex}
                                            className='flex items-center gap-3'
                                        >
                                            <div className='w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0'>
                                                <span className='text-red-400 text-xs'>
                                                    ×
                                                </span>
                                            </div>
                                            <span className='text-gray-500'>
                                                {limitation}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>

                            <Button
                                className={`w-full py-3 text-lg font-semibold ${
                                    plan.popular
                                        ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-500 hover:to-orange-500"
                                        : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                                }`}
                                disabled={plan.disabled}
                            >
                                {plan.disabled ? plan.cta : plan.cta}
                            </Button>
                        </Card>
                    ))}
                </div>

                {/* Feature Comparison */}
                <div className='max-w-4xl mx-auto'>
                    <h2 className='text-3xl font-bold text-white text-center mb-12'>
                        {t("comparison.title")}
                    </h2>

                    <Card className='bg-card/10 backdrop-blur-sm border-border/20 overflow-hidden'>
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b border-white/10'>
                                        <th className='text-left p-6 text-white font-semibold'>
                                            Features
                                        </th>
                                        <th className='text-center p-6 text-white font-semibold'>
                                            Free
                                        </th>
                                        <th className='text-center p-6 text-white font-semibold'>
                                            Premium
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        {
                                            feature: "Daily readings",
                                            free: "3 per day",
                                            premium: "Unlimited",
                                        },
                                        {
                                            feature: "Ad experience",
                                            free: "Watch ads",
                                            premium: "Ad-free",
                                        },
                                        {
                                            feature: "AI interpretations",
                                            free: "Basic",
                                            premium: "Advanced",
                                        },
                                        {
                                            feature: "Follow-up questions",
                                            free: "Limited",
                                            premium: "Unlimited",
                                        },
                                        {
                                            feature: "Reading history",
                                            free: "No",
                                            premium: "Yes",
                                        },
                                        {
                                            feature: "Export readings",
                                            free: "No",
                                            premium: "Yes",
                                        },
                                        {
                                            feature: "Support",
                                            free: "Community",
                                            premium: "Priority",
                                        },
                                        {
                                            feature: "Card spreads",
                                            free: "Basic",
                                            premium: "Exclusive",
                                        },
                                    ].map((row, index) => (
                                        <tr
                                            key={index}
                                            className='border-b border-white/5'
                                        >
                                            <td className='p-6 text-gray-300 font-medium'>
                                                {row.feature}
                                            </td>
                                            <td className='p-6 text-center text-gray-400'>
                                                {row.free}
                                            </td>
                                            <td className='p-6 text-center text-green-400 font-semibold'>
                                                {row.premium}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* FAQ Section */}
                <div className='max-w-3xl mx-auto mt-16'>
                    <h2 className='text-3xl font-bold text-white text-center mb-12'>
                        {t("faq.title")}
                    </h2>

                    <div className='space-y-6'>
                        {[
                            {
                                q: "Can I cancel anytime?",
                                a: "Yes, you can cancel your subscription at any time. You'll continue to have access to Premium features until the end of your billing period.",
                            },
                            {
                                q: "What payment methods do you accept?",
                                a: "We accept all major credit cards, PayPal, and Apple Pay for your convenience.",
                            },
                            {
                                q: "Is there a free trial?",
                                a: "Yes! New users get 3 free readings per day to experience our service before upgrading.",
                            },
                            {
                                q: "Can I change my plan later?",
                                a: "Absolutely! You can upgrade or downgrade your plan at any time from your account settings.",
                            },
                        ].map((faq, index) => (
                            <Card
                                key={index}
                                className='p-6 bg-card/10 backdrop-blur-sm border-border/20'
                            >
                                <h3 className='text-lg font-semibold text-white mb-2'>
                                    {faq.q}
                                </h3>
                                <p className='text-gray-300'>{faq.a}</p>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* CTA Section */}
                <div className='text-center mt-16'>
                    <Card className='p-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/20 max-w-2xl mx-auto'>
                        <div className='flex items-center justify-center gap-2 mb-4'>
                            <Sparkles className='w-6 h-6 text-yellow-400' />
                            <h3 className='text-2xl font-bold text-white'>
                                Ready to unlock your destiny?
                            </h3>
                            <Sparkles className='w-6 h-6 text-yellow-400' />
                        </div>
                        <p className='text-gray-300 mb-6'>
                            Join thousands of users who trust Asking Fate for
                            their daily guidance.
                        </p>
                        <Button
                            size='lg'
                            className='bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold px-8 py-3 hover:from-yellow-500 hover:to-orange-500'
                        >
                            <Crown className='w-5 h-5 mr-2' />
                            Start Your Premium Journey
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    )
}
