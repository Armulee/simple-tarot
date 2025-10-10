// server component
import { Card } from "@/components/ui/card"
import { getTranslations } from "next-intl/server"
import {
    Star,
    Crown,
    Shield,
    Lock,
    CreditCard,
    CheckCircle2,
    Sparkles,
    Sparkle,
    Infinity as InfinityIcon,
} from "lucide-react"
import { Checkout } from "@/components/checkout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
type Pack = {
    id: string
    priceUsd: number
    stars: number
    bonus: number
    label?: string
}

export const dynamic = "force-static"

export async function generateMetadata() {
    return {
        title: "Pricing | Simple Tarot",
        description:
            "Choose a star pack or subscribe monthly to support Simple Tarot.",
    }
}

export default async function PricingPage() {
    const t = await getTranslations("Pricing")
    const basePerDollar = 60
    const packs: Pack[] = [
        { id: "pack-1", priceUsd: 35, stars: 60, bonus: 0 },
        { id: "pack-2", priceUsd: 70, stars: 130, bonus: 10 },
        {
            id: "pack-3",
            priceUsd: 105,
            stars: 200,
            bonus: 200 - 3 * basePerDollar,
            label: "Popular",
        },
        {
            id: "pack-5",
            priceUsd: 175,
            stars: 350,
            bonus: 350 - 5 * basePerDollar,
            label: "Best value",
        },
        { id: "pack-7", priceUsd: 245, stars: 500, bonus: 80 },
    ]

    // removed unused helpers (packStyles, badgeStyles, packAura)

    // removed unused renderPackIcon

    // removed unused packCircleClasses

    const packIconColor = (id: string) => {
        switch (id) {
            case "pack-1":
                return "text-yellow-300"
            case "pack-2":
                return "text-emerald-300"
            case "pack-3":
                return "text-pink-300"
            case "pack-5":
                return "text-cyan-300"
            case "pack-7":
                return "text-purple-300"
            default:
                return "text-white/80"
        }
    }

    const packBadgeClasses = (id: string) => {
        switch (id) {
            case "pack-1":
                return "bg-yellow-400/15 border-yellow-400/30 text-yellow-300"
            case "pack-2":
                return "bg-emerald-400/15 border-emerald-400/30 text-emerald-300"
            case "pack-3":
                return "bg-pink-400/15 border-pink-400/30 text-pink-300"
            case "pack-5":
                return "bg-cyan-400/15 border-cyan-400/30 text-cyan-300"
            case "pack-7":
                return "bg-purple-400/15 border-purple-400/30 text-purple-300"
            default:
                return "bg-white/10 border-white/20 text-white/80"
        }
    }

    // Gradient overlays for pack cards to visually match unlimited plan cards
    const packOverlay = (id: string) => {
        switch (id) {
            case "pack-1":
                // amber/orange palette
                return "from-amber-500/12 via-amber-600/10 to-orange-600/12"
            case "pack-2":
                // emerald/teal palette
                return "from-emerald-500/12 via-green-500/10 to-teal-600/12"
            case "pack-3":
                // rose/red palette
                return "from-rose-500/12 via-pink-600/10 to-red-600/12"
            case "pack-5":
                // cyan/indigo palette
                return "from-cyan-500/12 via-sky-500/10 to-indigo-600/12"
            case "pack-7":
                // purple/violet palette
                return "from-purple-500/12 via-violet-500/10 to-fuchsia-600/12"
            default:
                return "from-white/5 via-white/5 to-white/5"
        }
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
                <div className='text-xs text-white/70'>
                    {t("priceNote")}
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
                                <TabsTrigger value='annual'>{t("yearly")}</TabsTrigger>
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
                                <div className='text-3xl font-bold'>฿350</div>
                                <div className='text-sm text-muted-foreground'>
                                    {t("perMonth")} · {t("autoRenew")} · {t("cancelAnytime")}
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
                                        ฿292
                                    </div>
                                    <div className='text-sm text-white/70 line-through'>
                                        ฿350
                                    </div>
                                    <span className='text-xs px-2 py-0.5 rounded border bg-indigo-400/15 border-indigo-400/30 text-indigo-300 font-semibold'>
                                        {t("save17")}
                                    </span>
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    {t("perMonth")} · {t("billedYearly")}
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
                            className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${packOverlay(
                                p.id
                            )}`}
                        />
                        <div className='grid grid-cols-1 gap-6 items-center'>
                            <div className='space-y-2 text-left'>
                                <div
                                    className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border ${packBadgeClasses(
                                        p.id
                                    )
                                        .replace("/15", "/100")
                                        .replace(
                                            "/15",
                                            "/100"
                                        )} absolute -top-3 left-2`}
                                >
                                    {p.id === "pack-1" && (
                                        <Star
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />
                                    )}
                                    {p.id === "pack-2" && (
                                        <Star
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />
                                    )}
                                    {p.id === "pack-3" && (
                                        <Sparkle
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />
                                    )}
                                    {p.id === "pack-5" && (
                                        <Sparkles
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />
                                    )}
                                    {p.id === "pack-7" && (
                                        <Star
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />
                                    )}
                                    <span>{p.label || t("oneTime")}</span>
                                </div>
                                {/* Stars amount first (above price) with bonus badge at top-right */}
                                <div className='inline-flex items-center gap-2 justify-center w-full mt-2'>
                                    <span
                                        className={`relative inline-flex items-center gap-3 px-5 py-2 rounded-full border ${packBadgeClasses(
                                            p.id
                                        )}`}
                                    >
                                        <Star
                                            className={`w-7 h-7 ${packIconColor(
                                                p.id
                                            )}`}
                                            fill='currentColor'
                                        />
                                        <span
                                            className={`text-3xl font-extrabold leading-none ${packIconColor(
                                                p.id
                                            )}`}
                                        >
                                            {p.stars}
                                        </span>
                                        <span
                                            className={`text-3xl font-extrabold leading-none ${packIconColor(
                                                p.id
                                            )}`}
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
                                    ฿{p.priceUsd.toFixed(0)}
                                </div>
                                <div className='text-sm text-muted-foreground'>
                                    {t("oneTime")} · {t("instantDelivery")}
                                </div>
                            </div>
                            <div className='space-y-3 text-left'>
                                <ul className='text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />{" "}
                                        {t("instantDelivery")}
                                    </li>
                                    <li className='flex items-center gap-2'>
                                        <CheckCircle2
                                            className={`w-4 h-4 ${packIconColor(
                                                p.id
                                            )}`}
                                        />{" "}
                                        {t("secureCheckout")}
                                    </li>
                                    {p.bonus > 0 && (
                                        <li className='flex items-center gap-2'>
                                            <CheckCircle2
                                                className={`w-4 h-4 ${packIconColor(
                                                    p.id
                                                )}`}
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
                <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
                    <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/12 via-amber-600/10 to-orange-600/12' />
                    <div className='relative z-10 grid grid-cols-1 gap-6 items-center'>
                        <div className='space-y-2 text-left'>
                            <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border bg-amber-400/15 border-amber-400/30 text-amber-200 absolute -top-3 left-2'>
                                <InfinityIcon className='w-4 h-4' />
                                <span>{t("oneTime")}</span>
                            </div>
                            <div className='inline-flex items-center gap-2 justify-center w-full mt-2'>
                                <span className='relative inline-flex items-center gap-3 px-5 py-2 rounded-full border bg-amber-400/15 border-amber-400/30 text-amber-200'>
                                    <InfinityIcon className='w-7 h-7 text-amber-200' />
                                    <span className='text-3xl font-extrabold leading-none text-amber-200'>
                                        Infinity
                                    </span>
                                </span>
                            </div>
                            <div className='text-3xl font-bold'>฿350</div>
                            <div className='text-sm text-muted-foreground'>
                                {t("oneTime")} · 30 {t("days")} · {t("instantDelivery")}
                            </div>
                        </div>
                        <div className='space-y-3 text-left'>
                            <ul className='text-sm text-white/80 space-y-1'>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-amber-200' />{" "}
                                    {t("infinityStars")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-amber-200' />{" "}
                                    {t("instantDelivery")}
                                </li>
                                <li className='flex items-center gap-2'>
                                    <CheckCircle2 className='w-4 h-4 text-amber-200' />{" "}
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
            <div className='grid md:grid-cols-4 gap-4'>
                {[
                    {
                        icon: <Lock className='w-5 h-5 text-primary' />,
                        title: t("signIn"),
                        desc: t("signInDesc"),
                    },
                    {
                        icon: <Star className='w-5 h-5 text-yellow-300' />,
                        title: t("pickPack"),
                        desc: t("pickPackDesc"),
                    },
                    {
                        icon: (
                            <CreditCard className='w-5 h-5 text-emerald-300' />
                        ),
                        title: t("paySecurely"),
                        desc: t("paySecurelyDesc"),
                    },
                    {
                        icon: (
                            <CheckCircle2 className='w-5 h-5 text-emerald-300' />
                        ),
                        title: t("instantDelivery"),
                        desc: t("instantDeliveryDesc"),
                    },
                ].map((step) => (
                    <Card
                        key={step.title}
                        className='p-4 bg-card/10 border-border/20'
                    >
                        <div className='flex items-start gap-3'>
                            <div className='w-9 h-9 rounded-full bg-white/10 flex items-center justify-center'>
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
                        <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
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
                        <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
                            <Lock className='w-5 h-5 text-white/90' />
                        </div>
                        <div>
                            <div className='font-semibold'>{t("secureCheckout")}</div>
                            <div className='text-sm text-muted-foreground'>
                                {t("secureCheckoutDesc")}
                            </div>
                        </div>
                    </div>
                </Card>
                <Card className='p-5 bg-card/10 border-border/20'>
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
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
