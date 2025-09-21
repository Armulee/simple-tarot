"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, Crown, Mail, Phone, DollarSign } from "lucide-react"
import Link from "next/link"

type Step = 1 | 2 | 3

export default function CheckoutPage() {
    const [step, setStep] = useState<Step>(1)
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
        "monthly"
    )

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
                            Checkout
                        </h1>
                        <DollarSign className='w-8 h-8 text-yellow-400' />
                    </div>
                    <p className='text-gray-300'>
                        Complete your Premium upgrade in 3 steps.
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
                            Plan details
                        </h2>
                        <div className='flex flex-col md:flex-row gap-6'>
                            <div className='flex-1'>
                                <div className='bg-white/10 border border-white/20 rounded-lg p-4 flex items-center justify-between'>
                                    <div>
                                        <p className='text-white font-semibold'>
                                            Premium
                                        </p>
                                        <p className='text-sm text-gray-300'>
                                            Unlimited ad-free readings
                                        </p>
                                    </div>
                                    <Badge className='bg-yellow-400 text-black'>
                                        Most Popular
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
                                            Monthly
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
                                            Annual
                                        </button>
                                    </div>
                                </div>

                                <ul className='mt-6 space-y-2'>
                                    {[
                                        "Unlimited readings",
                                        "Unlimited follow-up questions",
                                        "Ad-free experience",
                                        "Faster access to results",
                                        "Support ongoing development",
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
                                    Your price
                                </p>
                                <p className='text-4xl text-white font-bold'>
                                    $
                                    {billingCycle === "monthly"
                                        ? monthlyPrice
                                        : annualPrice}
                                </p>
                                <p className='text-sm text-gray-400'>
                                    {billingCycle === "monthly"
                                        ? "/month"
                                        : "/year"}
                                </p>
                            </div>
                        </div>

                        <div className='flex justify-between mt-6'>
                            <Link
                                href='/pricing'
                                className='text-gray-300 hover:text-white'
                            >
                                Back to pricing
                            </Link>
                            <Button onClick={goNext} className='px-6'>
                                Continue
                            </Button>
                        </div>
                    </Card>
                )}

                {step === 2 && (
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                        <h2 className='text-xl font-semibold text-white mb-4'>
                            Your details
                        </h2>
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='name' className='text-white'>
                                    Full name
                                </Label>
                                <Input
                                    id='name'
                                    placeholder='John Doe'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                            <div>
                                <Label htmlFor='email' className='text-white'>
                                    Email
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
                                    Phone (optional)
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
                                    Country
                                </Label>
                                <Input
                                    id='country'
                                    placeholder='United States'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                        </div>

                        <h3 className='text-lg font-semibold text-white mt-6 mb-2'>
                            Payment
                        </h3>
                        <div className='grid md:grid-cols-2 gap-4'>
                            <div className='relative'>
                                <Label htmlFor='card' className='text-white'>
                                    Card number
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
                                    Name on card
                                </Label>
                                <Input
                                    id='nameOnCard'
                                    placeholder='John Doe'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                            <div>
                                <Label htmlFor='exp' className='text-white'>
                                    Expiry
                                </Label>
                                <Input
                                    id='exp'
                                    placeholder='MM / YY'
                                    className='bg-input/20 border-border/30 text-white'
                                />
                            </div>
                            <div>
                                <Label htmlFor='cvc' className='text-white'>
                                    CVC
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
                                Back
                            </Button>
                            <Button onClick={goNext} className='px-6'>
                                Review
                            </Button>
                        </div>
                    </Card>
                )}

                {step === 3 && (
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20'>
                        <h2 className='text-xl font-semibold text-white mb-4'>
                            Review & checkout
                        </h2>
                        <div className='space-y-2 text-gray-300'>
                            <p>
                                Plan:{" "}
                                <span className='text-white font-semibold'>
                                    Premium
                                </span>
                            </p>
                            <p>
                                Billing:{" "}
                                <span className='text-white font-semibold'>
                                    {billingCycle === "monthly"
                                        ? "$2.99 / month"
                                        : "$29.99 / year"}
                                </span>
                            </p>
                        </div>
                        <div className='flex justify-between mt-6'>
                            <Button
                                variant='outline'
                                onClick={goPrev}
                                className='px-6'
                            >
                                Back
                            </Button>
                            <Button className='px-6'>Pay now</Button>
                        </div>
                    </Card>
                )}

                {/* Bottom CTA */}
                <div className='text-center mt-12'>
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border border-white/20'>
                        <p className='text-gray-300'>
                            Have a coupon or need help? Contact support after
                            purchase.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    )
}
