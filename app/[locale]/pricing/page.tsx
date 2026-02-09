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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import type { CurrencyCode } from "@/lib/payments/currency-utils"

type PricingPageProps = {
    params: Promise<{ locale: string }>
}

export default async function PricingPage({ params }: PricingPageProps) {
    const { locale } = await params
    const t = await getTranslations("Pricing")
    const defaultCurrency: CurrencyCode = locale === "th" ? "THB" : "USD"

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
    const pricingFaq = [
        {
            id: "refill",
            question: t("pricingFaq.refillQuestion"),
            answer: t("pricingFaq.refillAnswer"),
        },
        {
            id: "changes",
            question: t("pricingFaq.changeQuestion"),
            answer: t("pricingFaq.changeAnswer"),
        },
        {
            id: "addons",
            question: t("pricingFaq.addonsQuestion"),
            answer: t("pricingFaq.addonsAnswer"),
        },
        {
            id: "delivery",
            question: t("howFastStars"),
            answer: t("howFastStarsAnswer"),
        },
        {
            id: "bonus",
            question: t("whatIsBonus"),
            answer: t("whatIsBonusAnswer"),
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
            <div className='space-y-6'>
                <h4 className='text-2xl font-bold text-center md:text-left'>
                    Steps to pay for your stars
                </h4>
                <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>
                    {howItWorks.map((step) => (
                        <Card
                            key={step.title}
                            className='p-5 bg-primary/10 border-border/20 backdrop-blur-sm hover:bg-primary/20 transition-colors h-full'
                        >
                            <div className='flex flex-col items-center text-center md:items-start md:text-left gap-4 h-full'>
                                <div className='w-12 h-12 flex-shrink-0 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30'>
                                    {step.icon}
                                </div>
                                <div className='space-y-2'>
                                    <div className='font-semibold text-lg'>
                                        {step.title}
                                    </div>
                                    <div className='text-sm text-muted-foreground leading-relaxed'>
                                        {step.desc}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Trust & Guarantee */}
            <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                <Card className='p-6 bg-card/10 border-border/20 hover:bg-card/20 transition-colors'>
                    <div className='flex flex-col items-center text-center md:items-start md:text-left gap-4'>
                        <div className='w-12 h-12 flex-shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center'>
                            <Shield className='w-6 h-6 text-blue-400' />
                        </div>
                        <div className='space-y-1'>
                            <div className='font-semibold text-lg'>
                                {t("trustedTransparent")}
                            </div>
                            <div className='text-sm text-muted-foreground leading-relaxed'>
                                {t("trustedTransparentDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className='p-6 bg-card/10 border-border/20 hover:bg-card/20 transition-colors'>
                    <div className='flex flex-col items-center text-center md:items-start md:text-left gap-4'>
                        <div className='w-12 h-12 flex-shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center'>
                            <Lock className='w-6 h-6 text-emerald-400' />
                        </div>
                        <div className='space-y-1'>
                            <div className='font-semibold text-lg'>
                                {t("secureCheckout")}
                            </div>
                            <div className='text-sm text-muted-foreground leading-relaxed'>
                                {t("secureCheckoutDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className='p-6 bg-card/10 border-border/20 hover:bg-card/20 transition-colors sm:col-span-2 lg:col-span-1'>
                    <div className='flex flex-col items-center text-center md:items-start md:text-left gap-4'>
                        <div className='w-12 h-12 flex-shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center'>
                            <Sparkles className='w-6 h-6 text-purple-400' />
                        </div>
                        <div className='space-y-1'>
                            <div className='font-semibold text-lg'>
                                {t("ongoingImprovements")}
                            </div>
                            <div className='text-sm text-muted-foreground leading-relaxed'>
                                {t("ongoingImprovementsDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* FAQ */}
            <div className='space-y-6'>
                <h3 className='text-2xl font-bold text-center md:text-left'>
                    {t("pricingFaqTitle")}
                </h3>
                <Accordion className='rounded-2xl border border-white/10 bg-card/10 p-2'>
                    {pricingFaq.map((item) => (
                        <AccordionItem
                            key={item.id}
                            className='border-white/10'
                        >
                            <AccordionTrigger className='px-4 py-3 text-left text-white hover:no-underline'>
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className='px-4 pb-4 text-sm text-muted-foreground'>
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    )
}
