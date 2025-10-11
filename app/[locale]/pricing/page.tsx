"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
    Star,
    Crown,
    Shield,
    Lock,
    CreditCard,
    CheckCircle2,
    Sparkles,
    Infinity as InfinityIcon,
} from "lucide-react"
import { Checkout } from "@/components/checkout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"

type Pack = {
    id: string
    priceThb: number
    priceUsd: number
    stars: number
    bonus: number
    label?: string
}

type Currency = "THB" | "USD"

export default function PricingPage() {
    const t = useTranslations("Pricing")
    const params = useParams()
    const locale = params.locale as string

    // Default currency based on locale
    const defaultCurrency: Currency = locale === "th" ? "THB" : "USD"
    const [currency, setCurrency] = useState<Currency>(defaultCurrency)
    const basePerDollar = 60

    // How it works
    const getCurrencySymbol = () => (currency === "THB" ? "฿" : "$")

    const howItWorks = [
        {
            icon: <Lock className='w-5 h-5 text-white' />,
            title: t("signIn"),
            desc: t("signInDesc"),
        },
        {
            icon: <Star className='w-5 h-5 text-yellow-300' />,
            title: t("pickPack"),
            desc: `${getCurrencySymbol()}1=60 stars, larger packs include bonus`,
        },
        {
            icon: <CreditCard className='w-5 h-5 text-emerald-300' />,
            title: t("paySecurely"),
            desc: t("paySecurelyDesc"),
        },
        {
            icon: <CheckCircle2 className='w-5 h-5 text-emerald-300' />,
            title: t("instantDelivery"),
            desc: t("instantDeliveryDesc"),
        },
    ]

    // Pricing constants
    const prices = {
        monthly: { thb: 349, usd: 9.99 },
        annual: { thb: 3499, usd: 99.99, monthlyThb: 292, monthlyUsd: 8.34 },
        infinity: { thb: 349, usd: 9.99 },
    }

    const packs: Pack[] = [
        { id: "pack-1", priceThb: 35, priceUsd: 0.99, stars: 60, bonus: 0 },
        { id: "pack-2", priceThb: 69, priceUsd: 1.99, stars: 130, bonus: 10 },
        {
            id: "pack-3",
            priceThb: 99,
            priceUsd: 2.99,
            stars: 200,
            bonus: 200 - 3 * basePerDollar,
            label: t("popular"),
        },
        {
            id: "pack-5",
            priceThb: 169,
            priceUsd: 4.99,
            stars: 350,
            bonus: 350 - 5 * basePerDollar,
            label: t("bestValue"),
        },
        { id: "pack-7", priceThb: 249, priceUsd: 6.99, stars: 500, bonus: 80 },
    ]

    // Format price based on currency
    const formatPrice = (thb: number, usd: number) => {
        if (currency === "THB") {
            return `฿${thb.toFixed(0)}`
        }
        return `$${usd.toFixed(usd < 10 ? 2 : 0)}`
    }

    const packIconColor = () => {
        return "text-yellow-300"
    }

    const packBadgeClasses = () => {
        return "border-yellow-400/30 text-yellow-300"
    }

    // Gradient overlays for pack cards - all using yellow/amber palette
    const packOverlay = () => {
        return "from-amber-500/12 via-amber-600/10 to-orange-600/12"
    }

    // removed unused renderCenterIcon

    return (
        <section className='relative z-10 max-w-6xl mx-auto px-6 py-14 space-y-12'>
            {/* Background accents removed per request */}

            {/* Hero */}
            <div className='text-center space-y-4'>
                <h1 className='font-serif font-bold text-4xl md:text-5xl'>
                    {t("heroTitle")}
                </h1>
                <p className='text-muted-foreground text-balance max-w-2xl mx-auto'>
                    {t("heroDescription")}
                </p>
                <div className='text-xs text-white/70'>{t("priceNote")}</div>

                {/* Currency Selector */}
                <div className='flex items-center justify-center pt-4'>
                    <span className='text-sm text-white/70 px-4 py-2 bg-white/30 border-border/30 rounded-l-md'>
                        {t("currency")}:
                    </span>
                    <Select
                        value={currency}
                        onValueChange={(value) =>
                            setCurrency(value as Currency)
                        }
                    >
                        <SelectTrigger className='w-[100px] bg-accent/30 border-border/30 rounded-r-md rounded-l-none'>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className='bg-black border-border/30'>
                            <SelectItem value='USD'>
                                <div className='flex items-center gap-2'>
                                    <span className='text-lg'>🇺🇸</span>
                                    <span>USD ($)</span>
                                </div>
                            </SelectItem>
                            <SelectItem value='THB'>
                                <div className='flex items-center gap-2'>
                                    <span className='text-lg'>🇹🇭</span>
                                    <span>THB (฿)</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Divider: Subscription plans */}
            <div className='flex items-center gap-3 mt-6'>
                <span className='h-px flex-1 bg-white/60'></span>
                <span className='text-xs tracking-wider uppercase text-white'>
                    {t("subscriptionPlans")}
                </span>
                <span className='h-px flex-1 bg-white/60'></span>
            </div>

            {/* Subscription with tabs (Monthly/Annual) */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
                <Tabs defaultValue='monthly' className='w-full'>
                    <div className='flex items-center justify-between flex-wrap gap-4'>
                        <div className='order-2 md:order-1 space-y-1'>
                            <TabsList>
                                <TabsTrigger value='monthly'>
                                    {t("monthly")}
                                </TabsTrigger>
                                <TabsTrigger value='annual'>
                                    {t("yearly")}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        {/* Crown shown per tab in content sections to allow color change */}
                    </div>
                    <TabsContent value='monthly'>
                        {/* Monthly colored background overlay */}
                        <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/12 via-fuchsia-500/10 to-purple-500/12' />
                        <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                            <div className='order-1 md:order-2 text-center'>
                                <div className='w-16 h-16 mx-auto rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center'>
                                    <Crown className='w-8 h-8 text-violet-300' />
                                </div>
                            </div>
                            <div className='order-2 md:order-1 space-y-2'>
                                <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-violet-400/15 border border-violet-400/30 text-violet-300'>
                                    <Crown className='w-4 h-4' />
                                    {t("monthlySubscription")}
                                </div>
                                <div className='text-3xl font-bold'>
                                    {formatPrice(
                                        prices.monthly.thb,
                                        prices.monthly.usd
                                    )}
                                    <span className='text-sm text-white/70'>
                                        /month
                                    </span>
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    {t("perMonth")} · {t("autoRenew")} ·{" "}
                                    {t("cancelAnytime")}
                                </div>
                            </div>
                            <div className='order-3 space-y-3'>
                                <ul className='mt-2 text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-violet-300' />{" "}
                                        {t("ongoingSupport")}
                                    </li>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-violet-300' />{" "}
                                        {t("bonusStars")}
                                    </li>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-violet-300' />{" "}
                                        {t("cancelFromAccount")}
                                    </li>
                                </ul>
                                <Checkout mode='subscribe' plan='monthly' />
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value='annual'>
                        {/* Annual colored background overlay (indigo) */}
                        <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/12 via-indigo-600/10 to-indigo-700/12' />
                        <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                            <div className='order-1 md:order-2 text-center'>
                                <div className='w-16 h-16 mx-auto rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center'>
                                    <Crown className='w-8 h-8 text-indigo-300' />
                                </div>
                            </div>
                            <div className='order-2 md:order-1 space-y-2'>
                                <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-indigo-400/15 border border-indigo-400/30 text-indigo-300'>
                                    <Crown className='w-4 h-4' />
                                    {t("annualSubscription")}
                                </div>
                                <div className='inline-flex items-baseline gap-2'>
                                    <div className='text-3xl font-bold'>
                                        {formatPrice(
                                            prices.annual.monthlyThb,
                                            prices.annual.monthlyUsd
                                        )}{" "}
                                    </div>
                                    <div className='text-sm text-white/70 line-through'>
                                        {formatPrice(
                                            prices.monthly.thb,
                                            prices.monthly.usd
                                        )}{" "}
                                    </div>
                                    <span className='text-sm text-white/70'>
                                        /month
                                    </span>
                                    <span className='text-xs px-2 py-0.5 rounded border bg-indigo-400/15 border-indigo-400/30 text-indigo-300 font-semibold'>
                                        {t("save17")}
                                    </span>
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    {t("perMonth")} · {t("billedYearly")} (
                                    {formatPrice(
                                        prices.annual.thb,
                                        prices.annual.usd
                                    )}
                                    )
                                </div>
                            </div>
                            <div className='order-3 space-y-3'>
                                <ul className='mt-2 text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-indigo-300' />{" "}
                                        {t("bestValueYearly")}
                                    </li>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-indigo-300' />{" "}
                                        {t("samePerks")}
                                    </li>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2 className='w-4 h-4 text-indigo-300' />{" "}
                                        {t("cancelRenewal")}
                                    </li>
                                </ul>
                                <Checkout mode='subscribe' plan='annual' />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Infinity one-time pack moved below packs (see below) */}

            {/* Divider: One-time star packs */}
            <div className='flex items-center gap-3 mt-8'>
                <span className='h-px flex-1 bg-white/60'></span>
                <span className='text-xs tracking-wider uppercase text-white'>
                    {t("oneTimePacks")}
                </span>
                <span className='h-px flex-1 bg-white/60'></span>
            </div>

            {/* Packs & Infinity one-time */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {packs.map((p) => (
                    <Card
                        key={p.id}
                        className={`relative overflow-visible border-0 p-6 rounded-xl bg-card/10 hover:brightness-110 transition`}
                    >
                        <div
                            className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${packOverlay()}`}
                        />
                        <div className='grid grid-cols-1 gap-6 items-center'>
                            <div className='space-y-2 text-left'>
                                <div
                                    className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border ${packBadgeClasses()} absolute -top-3 left-2`}
                                >
                                    <Star
                                        className={`w-4 h-4 ${packIconColor()}`}
                                    />
                                    <span>{p.label || t("oneTime")}</span>
                                </div>
                                {/* Stars amount first (above price) with bonus badge at top-right */}
                                <div className='inline-flex items-center gap-2 justify-center w-full mt-2'>
                                    <span
                                        className={`relative inline-flex items-center gap-3 px-5 py-2 rounded-full border ${packBadgeClasses()}`}
                                    >
                                        <Star
                                            className={`w-7 h-7 ${packIconColor()}`}
                                            fill='currentColor'
                                        />
                                        <span
                                            className={`text-3xl font-extrabold leading-none ${packIconColor()}`}
                                        >
                                            {p.stars}
                                        </span>
                                        <span
                                            className={`text-3xl font-extrabold leading-none ${packIconColor()}`}
                                        >
                                            {t("stars")}
                                        </span>
                                        {p.bonus > 0 && (
                                            <span className='absolute -top-3 -right-3 rotate-6 text-xs px-2 py-0.5 rounded border bg-emerald-400 border-emerald-500 text-emerald-950 font-semibold'>
                                                +{p.bonus} bonus
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className='text-3xl font-bold'>
                                    {formatPrice(p.priceThb, p.priceUsd)}
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    {t("oneTime")} · {t("instantDelivery")}
                                </div>
                            </div>
                            <div className='space-y-3 text-left'>
                                <ul className='text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2
                                            className={`w-4 h-4 ${packIconColor()}`}
                                        />{" "}
                                        {t("instantDelivery")}
                                    </li>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2
                                            className={`w-4 h-4 ${packIconColor()}`}
                                        />{" "}
                                        {t("secureCheckout")}
                                    </li>
                                    {p.bonus > 0 && (
                                        <li className='flex items-center gap-2'>
                                            <CheckCircle2
                                                className={`w-4 h-4 ${packIconColor()}`}
                                            />{" "}
                                            {t("includesBonus")}
                                        </li>
                                    )}
                                </ul>
                                <div>
                                    <Checkout mode='pack' packId={p.id} />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
                {/* Infinity one-time pack below packs */}
                <Card className='relative p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/12 via-amber-600/10 to-orange-600/12' />
                    <div className='z-10 grid grid-cols-1 gap-6 items-center'>
                        <div className='space-y-2 text-left'>
                            <div
                                className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border ${packBadgeClasses()} absolute -top-3 left-2`}
                            >
                                <InfinityIcon className='w-4 h-4' />
                                <span>{t("oneTime")}</span>
                            </div>
                            <div className='inline-flex items-center gap-2 justify-center w-full mt-2'>
                                <span
                                    className={`relative inline-flex items-center gap-3 px-5 py-2 rounded-full border ${packBadgeClasses()}`}
                                >
                                    <InfinityIcon
                                        className={`w-7 h-7 ${packIconColor()}`}
                                    />
                                    <span
                                        className={`text-3xl font-extrabold leading-none ${packIconColor()}`}
                                    >
                                        Infinity
                                    </span>
                                </span>
                            </div>
                            <div className='text-3xl font-bold'>
                                {formatPrice(
                                    prices.infinity.thb,
                                    prices.infinity.usd
                                )}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("oneTime")} · 30 {t("days")} ·{" "}
                                {t("instantDelivery")}
                            </div>
                        </div>
                        <div className='space-y-3 text-left'>
                            <ul className='text-sm text-white/80 space-y-1'>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2
                                        className={`w-4 h-4 ${packIconColor()}`}
                                    />{" "}
                                    {t("infinityStars")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2
                                        className={`w-4 h-4 ${packIconColor()}`}
                                    />{" "}
                                    {t("instantDelivery")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2
                                        className={`w-4 h-4 ${packIconColor()}`}
                                    />{" "}
                                    {t("oneTimePayment")}
                                </li>
                            </ul>
                            <div>
                                <Checkout
                                    mode='pack'
                                    packId='pack-infinity'
                                    infinityTerm='month'
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* How it works */}
            <h4 className='text-2xl font-bold mb-4'>
                Steps to pay for your stars
            </h4>
            <div className='grid md:grid-cols-4 gap-4'>
                {howItWorks.map((step) => (
                    <Card
                        key={step.title}
                        className='p-4 bg-primary/30 border-border/20 backdrop-blur-sm'
                    >
                        <div className='flex items-start gap-3'>
                            <div className='w-9 h-9 flex-shrink-0 rounded-full bg-accent flex items-center justify-center'>
                                {step.icon}
                            </div>
                            <div>
                                <div className='font-semibold'>
                                    {step.title}
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    {step.desc}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Trust & Guarantee */}
            <div className='grid md:grid-cols-3 gap-4'>
                <Card className='p-5 bg-card/10 border-border/20'>
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center'>
                            <Shield className='w-5 h-5 text-white/90' />
                        </div>
                        <div>
                            <div className='font-semibold'>
                                {t("trustedTransparent")}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("trustedTransparentDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className='p-5 bg-card/10 border-border/20'>
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center'>
                            <Lock className='w-5 h-5 text-white/90' />
                        </div>
                        <div>
                            <div className='font-semibold'>
                                {t("secureCheckout")}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("secureCheckoutDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className='p-5 bg-card/10 border-border/20'>
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center'>
                            <Sparkles className='w-5 h-5 text-white/90' />
                        </div>
                        <div>
                            <div className='font-semibold'>
                                {t("ongoingImprovements")}
                            </div>
                            <div className='text-sm text-muted-foreground'>
                                {t("ongoingImprovementsDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* FAQ */}
            <div className='grid md:grid-cols-2 gap-6'>
                <Card className='p-6 bg-card/10 border-border/20'>
                    <h3 className='font-serif font-semibold text-lg mb-2'>
                        {t("howFastStars")}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                        {t("howFastStarsAnswer")}
                    </p>
                </Card>
                <Card className='p-6 bg-card/10 border-border/20'>
                    <h3 className='font-serif font-semibold text-lg mb-2'>
                        {t("whatIsBonus")}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                        {t("whatIsBonusAnswer")}
                    </p>
                </Card>
            </div>
        </section>
    )
}
