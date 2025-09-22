import { getTranslations } from "next-intl/server"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Check,
    Crown,
    Sparkles,
    MessageSquare,
    Zap,
    Layers,
    History,
    Palette,
    Rocket,
    DollarSign,
} from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { generatePageMetadata } from "@/lib/seo"
// duplicate removed
import CosmicStars from "@/components/cosmic-stars"

const getFreeFeatures = (t: (key: string) => string) => [
    t("features.unlimitedReadings"),
    t("features.unlimitedFollowUp"),
    t("features.watchAdsToReveal"),
    t("features.shareDownload"),
    t("features.mobileDesktop"),
]

const getPremiumFeatures = (t: (key: string) => string) => [
    t("features.unlimitedReadings"),
    t("features.unlimitedFollowUp"),
    t("features.adFreeExperience"),
    t("features.instantAnswers"),
    t("features.monthlyDeepSpreads"),
    t("features.readingHistory"),
    t("features.themesDeckChoices"),
    t("features.prioritySupport"),
]

const getFeatures = (t: (key: string) => string) => [
    {
        feature: t("comparison.tarotReadings"),
        Icon: Layers,
        free: t("comparison.unlimitedWithAds"),
        premium: t("comparison.unlimitedAdFree"),
    },
    {
        feature: t("comparison.followUpQuestions"),
        Icon: MessageSquare,
        free: t("comparison.availableWithAds"),
        premium: t("comparison.unlimitedSmooth"),
    },
    {
        feature: t("comparison.speed"),
        Icon: Zap,
        free: t("comparison.standardWait"),
        premium: t("comparison.instantNoDelays"),
    },
    {
        feature: t("comparison.exclusiveSpreads"),
        Icon: Layers,
        free: "❌",
        premium: t("comparison.monthlyDeepReadings"),
    },
    {
        feature: t("comparison.tarotHistory"),
        Icon: History,
        free: "❌",
        premium: t("comparison.accessPastReadings"),
    },
    {
        feature: t("comparison.themesDeckChoices"),
        Icon: Palette,
        free: "❌",
        premium: t("comparison.customizeThemes"),
    },
    {
        feature: t("comparison.prioritySupportUpdates"),
        Icon: Rocket,
        free: "❌",
        premium: t("comparison.earlyAccessFeatures"),
    },
]

const monthlyPrice = 2.99
const annualPrice = 29.99
const monthlySavings =
    ((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100
const annualPerMonth = annualPrice / 12

export async function generateMetadata({
    params,
}: {
    params: { locale: string }
}): Promise<Metadata> {
    const t = await getTranslations({
        locale: params.locale,
        namespace: "Meta.Pricing",
    })
    return generatePageMetadata({
        title: t("title"),
        description: t("description"),
        keywords: t("keywords")
            .split(",")
            .map((k: string) => k.trim()),
        url: `/${params.locale}/pricing`,
    })
}

export default async function PricingPage({
    searchParams,
    params,
}: {
    searchParams: Promise<{ cycle?: string }>
    params: { locale: string }
}) {
    const t = await getTranslations({
        locale: params.locale,
        namespace: "Pricing",
    })
    const { cycle: billingCycle } = await searchParams
    const cycle: "monthly" | "annual" =
        billingCycle === "annual" ? "annual" : "monthly"

    return (
        <div className='min-h-screen relative'>
            {/* Cosmic background */}
            <div className='absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1020] via-[#0d0f1a] to-[#0b0e18]' />
            <CosmicStars />
            <div className='container mx-auto px-4 py-16 relative z-10'>
                {/* Header */}
                <div className='text-center mb-14 relative'>
                    <div className='pointer-events-none absolute inset-x-0 -top-8 mx-auto h-24 w-[520px] max-w-[90%] rounded-full bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-fuchsia-500/10 blur-2xl'></div>
                    <div className='flex items-center justify-center gap-2 mb-5'>
                        <DollarSign className='w-7 h-7 text-yellow-400' />
                        <h1 className='font-serif text-4xl font-bold text-white'>
                            {t("title")}
                        </h1>
                        <DollarSign className='w-7 h-7 text-yellow-400' />
                    </div>
                    <p className='text-base sm:text-lg text-gray-300 max-w-2xl mx-auto'>
                        {t("subtitle")}
                    </p>
                </div>

                {/* Billing Tabs - URL driven */}
                <div className='flex justify-center mb-10'>
                    <div className='inline-flex h-10 items-center justify-center rounded-full bg-white/10 p-1 text-white/80 backdrop-blur-sm border border-white/20'>
                        <Link
                            href={"/pricing?cycle=monthly"}
                            replace
                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2 text-sm transition-all ${
                                cycle === "monthly"
                                    ? "bg-accent text-white shadow"
                                    : "text-white/80 hover:text-white"
                            }`}
                        >
                            {t("monthly")}
                        </Link>
                        <Link
                            href={"/pricing?cycle=annual"}
                            replace
                            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2 text-sm transition-all ${
                                cycle === "annual"
                                    ? "bg-accent text-white shadow"
                                    : "text-white/80 hover:text-white"
                            }`}
                        >
                            <span className='inline-flex items-center gap-2'>
                                {t("annual")}
                                <Badge className='bg-green-500 text-white text-[10px] px-2 py-0.5'>
                                    {t("pricing.save")} {Math.round(monthlySavings)}%
                                </Badge>
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className='grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-14'>
                    {/* Free */}
                    <Card className='relative overflow-hidden p-8 bg-card/10 bg-gradient-to-br from-cyan-500/5 via-indigo-500/5 to-fuchsia-500/5 backdrop-blur-sm border border-white/10 hover:border-white/20 ring-1 ring-white/10 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.35)] transition-colors'>
                        <div className='pointer-events-none absolute -top-12 inset-x-0 h-24 bg-gradient-to-r from-cyan-400/20 via-indigo-400/10 to-fuchsia-400/0 blur-2xl'></div>
                        <div className='text-center mb-6'>
                            <h3 className='text-2xl font-bold text-white mb-2'>
                                {t("free")}
                            </h3>
                            <p className='text-gray-400 mb-4'>
                                {t("freeDescription")}
                            </p>
                            <div className='mb-4'>
                                <span className='text-4xl font-bold text-white'>
                                    $0
                                </span>
                                <span className='text-gray-400 ml-2'>
                                    {t("pricing.perMonth")}
                                </span>
                            </div>
                        </div>
                        <div className='space-y-4 mb-8'>
                            {getFreeFeatures(t).map((feature, i) => (
                                <div
                                    key={i}
                                    className='flex items-center gap-3'
                                >
                                    <Check className='w-5 h-5 text-green-400 flex-shrink-0' />
                                    <span className='text-gray-300'>
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Button
                            className='w-full py-3 text-lg font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20'
                            disabled
                        >
                            {t("currentPlan")}
                        </Button>
                    </Card>

                    {/* Premium */}
                    <Card className='relative p-8 bg-card/10 bg-gradient-to-br from-orange-500/20 via-amber-400/15 to-orange-600/10 backdrop-blur-sm border border-orange-300/30 hover:border-orange-300/50 ring-2 ring-orange-400/60 shadow-[0_20px_60px_-12px_rgba(251,146,60,0.45)] transition-colors'>
                        {/* Ambient glows */}
                        <div className='pointer-events-none absolute -inset-24 rounded-[40%] bg-orange-400/10 blur-3xl' />
                        <div className='pointer-events-none absolute -top-10 -right-10 inset-x-0 h-20 bg-gradient-to-r from-orange-400/10 via-amber-300/10 to-transparent blur-2xl -z-10' />
                        <div className='pointer-events-none absolute -top-24 -right-10 -left-24 w-72 h-72 rounded-full bg-orange-400/5 blur-3xl -z-10' />
                        <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 z-10'>
                            <Badge className='bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold px-4 py-1'>
                                {t("mostPopular")}
                            </Badge>
                        </div>
                        <div className='text-center mb-6'>
                            <h3 className='text-2xl font-bold text-white mb-2'>
                                {t("premium")}
                            </h3>
                            <p className='text-gray-400 mb-4'>
                                {t("premiumDescription")}
                            </p>
                            <div className='mb-4'>
                                <span className='text-4xl font-bold text-white'>
                                    $
                                    {cycle === "monthly"
                                        ? monthlyPrice.toFixed(2)
                                        : annualPerMonth.toFixed(2)}
                                </span>
                                <span className='text-gray-400 ml-2'>
                                    {t("pricing.perMonth")}
                                </span>
                            </div>
                            {cycle === "annual" && (
                                <div className='text-sm mt-1'>
                                        <span className='line-through text-gray-400'>
                                            $2.99{t("pricing.perMonth")}
                                        </span>
                                        <span className='mx-2 text-gray-400'>
                                            →
                                        </span>
                                        <span className='text-green-400 font-semibold'>
                                            ${annualPerMonth.toFixed(2)}{t("pricing.perMonth")}
                                        </span>
                                    <span className='ml-2 text-green-400'>
                                        {t("pricing.save")} {Math.round(monthlySavings)}%
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className='space-y-4 mb-8'>
                            {getPremiumFeatures(t).map((feature, i) => (
                                <div
                                    key={i}
                                    className='flex items-center gap-3'
                                >
                                    <Check className='w-5 h-5 text-green-400 flex-shrink-0' />
                                    <span className='text-gray-300'>
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Link href={`/checkout?cycle=${cycle}`}>
                            <Button className='w-full py-3 text-lg font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-black hover:from-yellow-500 hover:to-orange-500'>
                                <Crown className='w-5 h-5 mr-2' />
                                {cycle === "annual" ? (
                                    <span>
                                        Start Premium for $
                                        {annualPerMonth.toFixed(2)}{t("pricing.perMonth")}
                                    </span>
                                ) : (
                                    <span>
                                        Start Premium for $
                                        {monthlyPrice.toFixed(2)}{t("pricing.perMonth")}
                                    </span>
                                )}
                            </Button>
                        </Link>
                        {cycle === "annual" && (
                            <p className='text-center text-xs text-gray-400 mt-2'>
                                {t("pricing.billed")} ${annualPrice.toFixed(2)}{t("pricing.perYear")}
                            </p>
                        )}
                    </Card>
                </div>

                {/* Comparison */}
                <div className='max-w-5xl mx-auto'>
                    {/* Desktop table */}
                    <Card className='hidden md:block bg-card/10 backdrop-blur-sm border border-white/10 overflow-hidden'>
                        <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead>
                                    <tr className='border-b border-white/10'>
                                        <th className='text-left p-6 text-white font-semibold'>
                                            {t("comparison.features")}
                                        </th>
                                        <th className='text-center p-6'>
                                            <span className='text-[11px] uppercase tracking-wide text-gray-400 block'>
                                                {t("comparison.free")}
                                            </span>
                                            <span className='sr-only'>
                                                {t("comparison.free")} (with Ads)
                                            </span>
                                        </th>
                                        <th className='text-center p-6'>
                                            <span className='text-[11px] uppercase tracking-wide text-gray-400 block'>
                                                {t("comparison.premium")}
                                            </span>
                                            <span className='sr-only'>
                                                {t("comparison.premium")} ($2.99/month)
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFeatures(t).map((row, i) => (
                                        <tr
                                            key={i}
                                            className='border-b border-white/5'
                                        >
                                            <td className='p-6 text-white font-semibold text-lg'>
                                                <span className='inline-flex items-center gap-2'>
                                                    <row.Icon className='w-5 h-5 text-white/80' />
                                                    {row.feature}
                                                </span>
                                            </td>
                                            <td className='p-6 text-center text-gray-400'>
                                                {row.free}
                                            </td>
                                            <td className='p-6 text-center text-orange-400 font-semibold'>
                                                {row.premium}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    {/* Mobile stacked list */}
                    <div className='md:hidden space-y-2 mt-4'>
                        {getFeatures(t).map((row, i) => (
                            <Card
                                key={i}
                                className='relative p-4 bg-card/10 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-cyan-500/5 backdrop-blur-sm border border-white/10 ring-1 ring-white/10 overflow-hidden'
                            >
                                <div className='pointer-events-none absolute -top-8 inset-x-0 h-12 bg-gradient-to-r from-indigo-400/10 via-fuchsia-400/10 to-cyan-400/0 blur-2xl'></div>
                                <div className='space-y-4 relative'>
                                    <p className='text-white font-semibold text-base text-center text-lg inline-flex items-center gap-2 justify-center w-full'>
                                        <row.Icon className='w-4 h-4 text-white/80' />
                                        {row.feature}
                                    </p>
                                    <div className='grid grid-cols-2 items-start gap-2'>
                                        <div className='text-center'>
                                            <p className='text-sm uppercase tracking-wide text-gray-400'>
                                                {t("comparison.free")}
                                            </p>
                                            <p className='text-[13px] text-gray-300'>
                                                {row.free}
                                            </p>
                                        </div>
                                        <div className='text-center'>
                                            <p className='text-sm uppercase tracking-wide text-orange-500'>
                                                {t("comparison.premium")}
                                            </p>
                                            <p className='text-[13px] text-orange-300 font-semibold'>
                                                {row.premium}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className='text-center mt-14'>
                    <Card className='relative overflow-hidden p-8 bg-card/10 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-pink-500/5 backdrop-blur-sm border border-white/10 ring-1 ring-white/10 max-w-2xl mx-auto'>
                        <div className='pointer-events-none absolute -top-10 inset-x-0 h-12 bg-gradient-to-r from-amber-400/25 via-orange-400/15 to-pink-400/0 blur-2xl'></div>
                        <div className='flex items-center justify-center gap-2 mb-4'>
                            <Sparkles className='w-6 h-6 text-yellow-400' />
                            <h3 className='text-2xl font-bold text-white'>
                                {t("cta.title")}
                            </h3>
                            <Sparkles className='w-6 h-6 text-yellow-400' />
                        </div>
                        <p className='text-gray-300 mb-6'>
                            {t("cta.description")}
                        </p>
                        <Link href={`/checkout?cycle=${cycle}`}>
                            <Button
                                size='lg'
                                className='bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-semibold px-8 py-3 hover:from-yellow-500 hover:to-orange-500'
                            >
                                <Crown className='w-5 h-5 mr-2' />
                                {t("cta.goPremium")}
                            </Button>
                        </Link>
                    </Card>
                </div>
            </div>
        </div>
    )
}
