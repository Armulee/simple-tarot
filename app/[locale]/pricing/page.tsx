import { Card } from "@/components/ui/card"
import {
    Star,
    Shield,
    Lock,
    CreditCard,
    CheckCircle2,
    Sparkles,
} from "lucide-react"
import { getTranslations } from "next-intl/server"
import PricingContent from "@/components/pricing/pricing-content"
import type { CurrencyCode } from "@/lib/payments/currency-utils"

type PricingPageProps = {
    params: Promise<{ locale: string }>
}

export default async function PricingPage({ params }: PricingPageProps) {
    const { locale } = await params
    const t = await getTranslations("Pricing")
    const defaultCurrency: CurrencyCode = "USD"

    const howItWorks = [
        {
            icon: <Lock className='w-5 h-5 text-white' />,
            title: t("signIn"),
            desc: t("signInDesc"),
        },
        {
            icon: <Star className='w-5 h-5 text-yellow-300' />,
            title: t("pickPack"),
            desc: t("pickPackDesc"),
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
            </div>

            {/* Currency Selector, Subscription, and Packs */}
            <PricingContent locale={locale} defaultCurrency={defaultCurrency} />

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
