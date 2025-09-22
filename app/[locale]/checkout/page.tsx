"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, Mail, Phone, DollarSign } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useEffect } from "react"

type Step = 1 | 2 | 3

export default function CheckoutPage() {
    const t = useTranslations("Checkout")
    const searchParams = useSearchParams()
    const [step, setStep] = useState<Step>(1)
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
        "monthly"
    )

    // Read billing cycle from search params and set initial state
    useEffect(() => {
        const cycle = searchParams.get("cycle")
        if (cycle === "annual" || cycle === "monthly") {
            setBillingCycle(cycle)
        }
    }, [searchParams])

    const monthlyPrice = 2.99
    const annualPrice = 29.99

    const goNext = () => setStep((s) => (s < 3 ? ((s + 1) as Step) : s))
    const goPrev = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))

    return (
        <div className='min-h-screen'>
            <div className='container mx-auto px-4 py-16 max-w-4xl'>
                {/* Header */}
                <div className='text-center mb-10'>
                    <div className='flex items-center justify-center gap-2 mb-3'>
                        <DollarSign className='w-8 h-8 text-yellow-400' />
                        <h1 className='font-serif text-4xl font-bold text-white'>
                            {t('title')}
                        </h1>
                        <DollarSign className='w-8 h-8 text-yellow-400' />
                    </div>
                    <p className='text-gray-300'>
                        {t('subtitle')}
                    </p>
                </div>

                {/* Progress */}
                <div className='flex items-center justify-center gap-3 mb-8'>
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all ${
                                step >= i ? "bg-white w-24" : "bg-white/20 w-16"
                            }`}
                        />
                    ))}
                </div>

                {/* Steps */}
                {step === 1 && (
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                        <h2 className='text-xl font-semibold text-white mb-4'>
                            {t('planDetails')}
                        </h2>
                        <div className='flex flex-col md:flex-row gap-6'>
                            <div className='flex-1'>
                                <div className='bg-white/10 border border-white/20 rounded-lg p-4 flex items-center justify-between'>
                                    <div>
                                        <p className='text-white font-semibold'>
                                            {t('premium')}
                                        </p>
                                        <p className='text-sm text-gray-300'>
                                            {t('unlimitedAdFreeReadings')}
                                        </p>
                                    </div>
                                    <Badge className='bg-yellow-400 text-black'>
                                        {t('mostPopular')}
                                    </Badge>
                                </div>

                                <div className='mt-4'>
                                    <div className='bg-white/10 border border-white/20 rounded-full inline-flex p-1'>
                                        <button
                                            className={`px-4 py-2 rounded-full ${
                                                billingCycle === "monthly"
                                                    ? "bg-white text-black"
                                                    : "text-white"
                                            }`}
                                            onClick={() =>
                                                setBillingCycle("monthly")
                                            }
                                        >
                                            {t('monthly')}
                                        </button>
                                        <button
                                            className={`px-4 py-2 rounded-full ${
                                                billingCycle === "annual"
                                                    ? "bg-white text-black"
                                                    : "text-white"
                                            }`}
                                            onClick={() =>
                                                setBillingCycle("annual")
                                            }
                                        >
                                            {t('annual')}
                                        </button>
                                    </div>
                                </div>

                                <ul className='mt-6 space-y-2'>
                                    {[
                                        t('features.unlimitedReadings'),
                                        t('features.unlimitedFollowUp'),
                                        t('features.adFreeExperience'),
                                        t('features.fasterAccess'),
                                        t('features.supportDevelopment'),
                                    ].map((f) => (
                                        <li
                                            key={f}
                                            className='flex items-center gap-2 text-gray-300'
                                        >
                                            <Check className='w-4 h-4 text-green-400' />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className='w-full md:w-64 bg-white/5 border border-white/10 rounded-lg p-4'>
                                <p className='text-white font-semibold mb-2'>
                                    {t('yourPrice')}
                                </p>
                                <p className='text-4xl text-white font-bold'>
                                    $
                                    {billingCycle === "monthly"
                                        ? monthlyPrice
                                        : annualPrice}
                                </p>
                                <p className='text-sm text-gray-400'>
                                    {billingCycle === "monthly"
                                        ? t('perMonth')
                                        : t('perYear')}
                                </p>
                            </div>
                        </div>

                        <div className='flex justify-between mt-6'>
                            <Link
                                href={`/pricing?cycle=${billingCycle}`}
                                className='text-gray-300 hover:text-white'
                            >
                                {t('backToPricing')}
                            </Link>
                            <Button onClick={goNext} className='px-6'>
                                {t('continue')}
                            </Button>
                        </div>
                    </Card>
                )}

                {step === 2 && (
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                        <h2 className='text-xl font-semibold text-white mb-4'>
                            {t('yourDetails')}
                        </h2>
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='name' className='text-white'>
                                    {t('fullName')}
                                </Label>
                                <Input
                                    id='name'
                                    placeholder='John Doe'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                            <div>
                                <Label htmlFor='email' className='text-white'>
                                    {t('email')}
                                </Label>
                                <div className='relative'>
                                    <Input
                                        id='email'
                                        placeholder='you@example.com'
                                        className='bg-input/20 border-border/30 text-white pr-10'
                                    />
                                    <Mail className='w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/60' />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor='phone' className='text-white'>
                                    {t('phoneOptional')}
                                </Label>
                                <div className='relative'>
                                    <Input
                                        id='phone'
                                        placeholder='+1 555 000 0000'
                                        className='bg-input/20 border-border/30 text-white pr-10'
                                    />
                                    <Phone className='w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/60' />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor='country' className='text-white'>
                                    {t('country')}
                                </Label>
                                <Input
                                    id='country'
                                    placeholder='United States'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                        </div>

                        <h3 className='text-lg font-semibold text-white mt-6 mb-2'>
                            {t('payment')}
                        </h3>
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div className='relative'>
                                <Label htmlFor='card' className='text-white'>
                                    {t('cardNumber')}
                                </Label>
                                <Input
                                    id='card'
                                    placeholder='4242 4242 4242 4242'
                                    className='bg-input/20 border-border/30 text-white pr-10'
                                />
                                <CreditCard className='w-4 h-4 absolute right-3 top-10 text-white/60' />
                            </div>
                            <div>
                                <Label
                                    htmlFor='nameOnCard'
                                    className='text-white'
                                >
                                    {t('nameOnCard')}
                                </Label>
                                <Input
                                    id='nameOnCard'
                                    placeholder='John Doe'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                            <div>
                                <Label htmlFor='exp' className='text-white'>
                                    {t('expiry')}
                                </Label>
                                <Input
                                    id='exp'
                                    placeholder='MM / YY'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                            <div>
                                <Label htmlFor='cvc' className='text-white'>
                                    {t('cvc')}
                                </Label>
                                <Input
                                    id='cvc'
                                    placeholder='123'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                        </div>

                        <div className='flex justify-between mt-6'>
                            <Button
                                variant='outline'
                                onClick={goPrev}
                                className='px-6'
                            >
                                {t('back')}
                            </Button>
                            <Button onClick={goNext} className='px-6'>
                                {t('review')}
                            </Button>
                        </div>
                    </Card>
                )}

                {step === 3 && (
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                        <h2 className='text-xl font-semibold text-white mb-4'>
                            {t('reviewCheckout')}
                        </h2>
                        <div className='space-y-2 text-gray-300'>
                            <p>
                                {t('plan')}{" "}
                                <span className='text-white font-semibold'>
                                    {t('premium')}
                                </span>
                            </p>
                            <p>
                                {t('billing')}{" "}
                                <span className='text-white font-semibold'>
                                    {billingCycle === "monthly"
                                        ? `$2.99 ${t('perMonth')}`
                                        : `$29.99 ${t('perYear')}`}
                                </span>
                            </p>
                        </div>
                        <div className='flex justify-between mt-6'>
                            <Button
                                variant='outline'
                                onClick={goPrev}
                                className='px-6'
                            >
                                {t('back')}
                            </Button>
                            <Button className='px-6'>{t('payNow')}</Button>
                        </div>
                    </Card>
                )}

                {/* Bottom CTA */}
                <div className='text-center mt-12'>
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border border-white/20'>
                        <p className='text-gray-300'>
                            {t('supportMessage')}
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}
