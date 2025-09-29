// server component
import { Card } from "@/components/ui/card"
import { Star, Crown, Gift, Shield, Lock, CreditCard, CheckCircle2, Sparkles, Sparkle } from "lucide-react"
import { PricingCTA } from "@/components/pricing/pricing-cta"
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
        description: "Choose a star pack or subscribe monthly to support Simple Tarot.",
    }
}

export default async function PricingPage() {
    const basePerDollar = 60
    const packs: Pack[] = [
        { id: "pack-1", priceUsd: 0.99, stars: 60, bonus: 0 },
        { id: "pack-3", priceUsd: 2.99, stars: 200, bonus: 200 - 3 * basePerDollar, label: "Popular" },
        { id: "pack-5", priceUsd: 4.99, stars: 350, bonus: 350 - 5 * basePerDollar, label: "Best value" },
    ]

    const packStyles = (id: string) => {
        switch (id) {
            case "pack-1":
                return {
                    bg: "bg-gradient-to-br from-yellow-400/5 via-amber-400/4 to-orange-500/5",
                    border: "border-yellow-400/25",
                }
            case "pack-3":
                return {
                    bg: "bg-gradient-to-br from-pink-400/5 via-rose-400/4 to-red-500/5",
                    border: "border-pink-400/25",
                }
            case "pack-5":
                return {
                    bg: "bg-gradient-to-br from-cyan-400/5 via-sky-400/4 to-indigo-500/5",
                    border: "border-cyan-400/25",
                }
            default:
                return { bg: "bg-card/10", border: "border-border/20" }
        }
    }

    const badgeStyles = (id: string) => {
        switch (id) {
            case "pack-3":
                return "bg-gradient-to-r from-pink-500 to-red-600 text-white shadow-md"
            case "pack-5":
                return "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md"
            default:
                return "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
        }
    }

    const packAura = (id: string) => {
        switch (id) {
            case "pack-1":
                return "from-yellow-400/25 via-amber-400/20 to-orange-500/25"
            case "pack-3":
                return "from-pink-500/25 via-rose-500/20 to-red-500/25"
            case "pack-5":
                return "from-cyan-400/25 via-sky-400/20 to-indigo-500/25"
            default:
                return "from-white/10 to-white/5"
        }
    }

    const renderPackIcon = (id: string) => {
        // Darker inner background matched to pack color, with Lucide icons
        const bgByPack = {
            "pack-1": "linear-gradient(135deg, oklch(0.16_0.06_70), oklch(0.10_0.04_260))",
            "pack-3": "linear-gradient(135deg, oklch(0.16_0.08_20), oklch(0.10_0.04_260))",
            "pack-5": "linear-gradient(135deg, oklch(0.16_0.08_230), oklch(0.10_0.04_260))",
        } as const

        return (
            <div className='relative w-14 h-14 mx-auto rounded-full overflow-hidden border border-white/25 shadow-[0_0_24px_rgba(255,255,255,0.08)]'>
                <div className='absolute inset-0' style={{ background: bgByPack[id as keyof typeof bgByPack] }} />
                <div className='absolute inset-0 grid place-items-center'>
                    {id === "pack-1" && (
                        <Star className='w-6 h-6 text-yellow-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' />
                    )}
                    {id === "pack-3" && (
                        <Sparkle className='w-7 h-7 text-yellow-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]' />
                    )}
                    {id === "pack-5" && (
                        <div className='relative w-full h-full'>
                            <Sparkles className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' />
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const packCircleClasses = (id: string) => {
        switch (id) {
            case "pack-1":
                return "bg-yellow-500/15 border-yellow-500/30"
            case "pack-3":
                return "bg-pink-500/15 border-pink-500/30"
            case "pack-5":
                return "bg-cyan-500/15 border-cyan-500/30"
            default:
                return "bg-white/10 border-white/20"
        }
    }

    const packIconColor = (id: string) => {
        switch (id) {
            case "pack-1":
                return "text-yellow-300"
            case "pack-3":
                return "text-pink-300"
            case "pack-5":
                return "text-cyan-300"
            default:
                return "text-white/80"
        }
    }

    const packBadgeClasses = (id: string) => {
        switch (id) {
            case "pack-1":
                return "bg-yellow-400/15 border-yellow-400/30 text-yellow-300"
            case "pack-3":
                return "bg-pink-400/15 border-pink-400/30 text-pink-300"
            case "pack-5":
                return "bg-cyan-400/15 border-cyan-400/30 text-cyan-300"
            default:
                return "bg-white/10 border-white/20 text-white/80"
        }
    }

    const renderCenterIcon = (id: string) => (
        <div className={`w-16 h-16 mx-auto rounded-full ${packCircleClasses(id)} flex items-center justify-center`}>
            {id === "pack-1" && (
                <Star className={`w-8 h-8 ${packIconColor(id)}`} />
            )}
            {id === "pack-3" && (
                <Sparkle className={`w-8 h-8 ${packIconColor(id)}`} />
            )}
            {id === "pack-5" && (
                <Sparkles className={`w-8 h-8 ${packIconColor(id)}`} />
            )}
        </div>
    )

    return (
        <section className='relative z-10 max-w-6xl mx-auto px-6 py-14 space-y-12'>
            {/* Background accents removed per request */}

            {/* Hero */}
            <div className='text-center space-y-4'>
                <h1 className='font-serif font-bold text-4xl md:text-5xl'>
                    Choose your stars, unlock deeper insights
                </h1>
                <p className='text-muted-foreground text-balance max-w-2xl mx-auto'>
                    Flexible one-time packs and a simple monthly plan. Instant delivery. Cancel anytime.
                </p>
                <div className='text-xs text-white/70'>Prices in USD. Stars deliver instantly after purchase.</div>
            </div>

            {/* Divider: Suggest deals */}
            <div className='flex items-center gap-3 mt-6'>
                <span className='h-px flex-1 bg-white/10'></span>
                <span className='text-xs tracking-wider uppercase text-white/70'>—— Suggest deals ——</span>
                <span className='h-px flex-1 bg-white/10'></span>
            </div>

            {/* Subscription with tabs (Monthly/Annual) */}
            <Card className='relative overflow-hidden p-6 rounded-xl bg-card/10 border-border/20 hover:brightness-110 transition'>
                <Tabs defaultValue='monthly' className='w-full'>
                    <div className='flex items-center justify-between flex-wrap gap-4'>
                        <div className='order-2 md:order-1 space-y-1'>
                            <TabsList>
                                <TabsTrigger value='monthly'>Monthly</TabsTrigger>
                                <TabsTrigger value='annual'>Annual</TabsTrigger>
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
                                    Monthly subscription
                                </div>
                                <div className='text-3xl font-bold'>$9.99</div>
                                <div className='text-sm text-muted-foreground'>per month · auto-renew · cancel anytime</div>
                            </div>
                            <div className='order-3 space-y-3'>
                                <ul className='mt-2 text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-violet-300' /> Ongoing support for new features</li>
                                    <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-violet-300' /> Occasional bonus stars & perks</li>
                                    <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-violet-300' /> Cancel anytime from your account</li>
                                </ul>
                                <PricingCTA mode='subscribe' />
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value='annual'>
                        {/* Annual colored background overlay */}
                        <div className='pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500/12 via-cyan-500/10 to-blue-500/12' />
                        <div className='grid md:grid-cols-3 gap-6 items-center mt-4 relative z-10'>
                            <div className='order-1 md:order-2 text-center'>
                                <div className='w-16 h-16 mx-auto rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center'>
                                    <Crown className='w-8 h-8 text-sky-300' />
                                </div>
                            </div>
                            <div className='order-2 md:order-1 space-y-2'>
                                <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300'>
                                    <Crown className='w-4 h-4' />
                                    Annual subscription
                                </div>
                                <div className='inline-flex items-baseline gap-2'>
                                    <div className='text-3xl font-bold'>$8.33</div>
                                    <div className='text-sm text-white/70 line-through'>$9.99</div>
                                    <span className='text-xs px-2 py-0.5 rounded border bg-sky-400/15 border-sky-400/30 text-sky-300 font-semibold'>
                                        Save 17%
                                    </span>
                                </div>
                                <div className='text-sm text-muted-foreground'>per month · billed $100/year</div>
                            </div>
                            <div className='order-3 space-y-3'>
                                <ul className='mt-2 text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-sky-300' /> Best value yearly plan</li>
                                    <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-sky-300' /> Same perks as monthly</li>
                                    <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-sky-300' /> Cancel renewal anytime</li>
                                </ul>
                                <PricingCTA mode='subscribe' />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </Card>

            {/* Infinity one-time pack (one month duration, no subscription) */}
            <Card className='p-6 rounded-xl bg-gradient-to-br from-slate-500/12 via-slate-600/10 to-slate-700/12 border-slate-400/25 hover:brightness-110 transition'>
                <div className='grid md:grid-cols-3 gap-6 items-center'>
                    <div className='order-2 md:order-1 space-y-2'>
                        <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-slate-400/15 border border-slate-400/30 text-slate-200'>
                            <Star className='w-4 h-4' />
                            One-time purchase
                        </div>
                        <div className='text-3xl font-bold'>$9.99</div>
                        <div className='text-sm text-muted-foreground'>one month · no subscription · instant delivery</div>
                    </div>
                    <div className='order-1 md:order-2 text-center'>
                        <div className='w-16 h-16 mx-auto rounded-full bg-slate-500/15 border border-slate-500/30 flex items-center justify-center'>
                            <span className='text-5xl text-slate-200 leading-none'>∞</span>
                        </div>
                    </div>
                    <div className='order-3 space-y-3'>
                        <ul className='mt-2 text-sm text-white/80 space-y-1'>
                            <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-slate-200' /> Infinity stars (30 days)</li>
                            <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-slate-200' /> Instant delivery</li>
                            <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-slate-200' /> One-time payment, no auto-renew</li>
                        </ul>
                        <PricingCTA mode='pack' packId='pack-infinity' />
                    </div>
                </div>
            </Card>

            {/* Divider: Our deals */}
            <div className='flex items-center gap-3 mt-8'>
                <span className='h-px flex-1 bg-white/10'></span>
                <span className='text-xs tracking-wider uppercase text-white/70'>—— Our deals ——</span>
                <span className='h-px flex-1 bg-white/10'></span>
            </div>

            {/* Packs */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {packs.map((p) => (
                    <Card
                        key={p.id}
                        className={`relative p-6 rounded-xl ${packStyles(p.id).bg} ${packStyles(p.id).border} hover:brightness-110 transition`}
                    >
                        <div className='grid grid-cols-1 gap-6 items-center'>
                            <div className='space-y-2 text-left'>
                                <div className={`inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full border ${packBadgeClasses(p.id)} absolute -top-3 left-2`}>
                                    {p.id === 'pack-1' && <Star className={`w-4 h-4 ${packIconColor(p.id)}`} />}
                                    {p.id === 'pack-3' && <Sparkle className={`w-4 h-4 ${packIconColor(p.id)}`} />}
                                    {p.id === 'pack-5' && <Sparkles className={`w-4 h-4 ${packIconColor(p.id)}`} />}
                                    <span>{p.label || 'One-time pack'}</span>
                                </div>
                                {/* Stars amount first (above price) with bonus badge at top-right */}
                                <div className='relative inline-flex items-center gap-2'>
                                    <span className={`inline-flex items-center gap-3 px-5 py-2 rounded-full border ${packBadgeClasses(p.id)}`}>
                                        <Star className={`w-7 h-7 ${packIconColor(p.id)}`} fill='currentColor' />
                                        <span className={`text-3xl font-extrabold leading-none ${packIconColor(p.id)}`}>{p.stars}</span>
                                        <span className='text-base font-semibold tracking-wide text-white/90'>stars</span>
                                    </span>
                                    {p.bonus > 0 && (
                                        <span className='absolute -top-2 -right-10 rotate-6 text-xs px-2 py-0.5 rounded border bg-emerald-400/15 border-emerald-400/30 text-emerald-300 font-semibold'>
                                            +{p.bonus} bonus
                                        </span>
                                    )}
                                </div>
                                <div className='text-3xl font-bold'>${p.priceUsd.toFixed(2)}</div>
                                <div className='text-sm text-muted-foreground'>one-time · instant delivery</div>
                            </div>
                            <div className='space-y-3 text-left'>
                                <ul className='text-sm text-white/80 space-y-1'>
                                    <li className='flex items-center gap-2'><CheckCircle2 className={`w-4 h-4 ${packIconColor(p.id)}`} /> Instant delivery</li>
                                    <li className='flex items-center gap-2'><CheckCircle2 className={`w-4 h-4 ${packIconColor(p.id)}`} /> Secure checkout</li>
                                    {p.bonus > 0 && (
                                        <li className='flex items-center gap-2'><CheckCircle2 className={`w-4 h-4 ${packIconColor(p.id)}`} /> Includes bonus stars</li>
                                    )}
                                </ul>
                                <div>
                                    <PricingCTA mode='pack' packId={p.id} />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Subscription */}
            <Card className='p-6 rounded-xl bg-gradient-to-br from-violet-500/12 via-fuchsia-500/10 to-purple-500/12 border-violet-400/25 hover:brightness-110 transition'>
                <div className='grid md:grid-cols-3 gap-6 items-center'>
                    <div className='order-2 md:order-1 space-y-2'>
                        <div className='inline-flex items-center gap-2 text-sm px-2 py-1 rounded-full bg-violet-400/15 border border-violet-400/30 text-violet-300'>
                            <Crown className='w-4 h-4' />
                            Monthly subscription
                        </div>
                        <div className='text-3xl font-bold'>$9.99</div>
                        <div className='text-sm text-muted-foreground'>per month · auto-renew · cancel anytime</div>
                    </div>
                    <div className='order-1 md:order-2 text-center'>
                        <div className='w-16 h-16 mx-auto rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center'>
                            <Crown className='w-8 h-8 text-violet-300' />
                        </div>
                    </div>
                    <div className='order-3 space-y-3'>
                        <ul className='mt-2 text-sm text-white/80 space-y-1'>
                            <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-violet-300' /> Ongoing support for new features</li>
                            <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-violet-300' /> Occasional bonus stars & perks</li>
                            <li className='flex items-center gap-2'><CheckCircle2 className='w-4 h-4 text-violet-300' /> Cancel anytime from your account</li>
                        </ul>
                        <PricingCTA mode='subscribe' />
                    </div>
                </div>
            </Card>

            {/* How it works */}
            <div className='grid md:grid-cols-4 gap-4'>
                {[{
                    icon: <Lock className='w-5 h-5 text-primary' />, title: 'Sign in', desc: 'Create or sign in to your account'
                },{
                    icon: <Star className='w-5 h-5 text-yellow-300' />, title: 'Pick a pack', desc: '$1=60 stars, larger packs include bonus'
                },{
                    icon: <CreditCard className='w-5 h-5 text-emerald-300' />, title: 'Pay securely', desc: 'Processed by trusted providers'
                },{
                    icon: <CheckCircle2 className='w-5 h-5 text-emerald-300' />, title: 'Instant delivery', desc: 'Stars appear right after payment'
                }].map((step) => (
                    <Card key={step.title} className='p-4 bg-card/10 border-border/20'>
                        <div className='flex items-start gap-3'>
                            <div className='w-9 h-9 rounded-full bg-white/10 flex items-center justify-center'>
                                {step.icon}
                            </div>
                            <div>
                                <div className='font-semibold'>{step.title}</div>
                                <div className='text-sm text-muted-foreground'>{step.desc}</div>
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
                            <div className='font-semibold'>Trusted & transparent</div>
                            <div className='text-sm text-muted-foreground'>Clear pricing. No hidden fees. Stars are for readings.</div>
                        </div>
                    </div>
                </Card>
                <Card className='p-5 bg-card/10 border-border/20'>
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
                            <Lock className='w-5 h-5 text-white/90' />
                        </div>
                        <div>
                            <div className='font-semibold'>Secure checkout</div>
                            <div className='text-sm text-muted-foreground'>Payments handled by reputable processors with encryption.</div>
                        </div>
                    </div>
                </Card>
                <Card className='p-5 bg-card/10 border-border/20'>
                    <div className='flex items-start gap-3'>
                        <div className='w-10 h-10 rounded-full bg-white/10 flex items-center justify-center'>
                            <Sparkles className='w-5 h-5 text-white/90' />
                        </div>
                        <div>
                            <div className='font-semibold'>Ongoing improvements</div>
                            <div className='text-sm text-muted-foreground'>Your support helps us ship better AI readings and features.</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* FAQ */}
            <div className='grid md:grid-cols-2 gap-6'>
                <Card className='p-6 bg-card/10 border-border/20'>
                    <h3 className='font-serif font-semibold text-lg mb-2'>How fast do stars arrive?</h3>
                    <p className='text-sm text-muted-foreground'>
                        Instantly after payment. If you don&apos;t see them, refresh the stars page.
                    </p>
                </Card>
                <Card className='p-6 bg-card/10 border-border/20'>
                    <h3 className='font-serif font-semibold text-lg mb-2'>What is the bonus?</h3>
                    <p className='text-sm text-muted-foreground'>
                        $1 always equals 60 stars. Bigger packs include extra bonus stars on top of the base amount.
                    </p>
                </Card>
            </div>
        </section>
    )
}

