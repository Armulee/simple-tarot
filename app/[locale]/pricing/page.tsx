// server component
import { Card } from "@/components/ui/card"
import { Star, Crown, Gift, Shield, Lock, CreditCard, CheckCircle2, Sparkles, Sparkle } from "lucide-react"
import { PricingCTA } from "@/components/pricing/pricing-cta"
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
        { id: "pack-1", priceUsd: 1, stars: 60, bonus: 0 },
        { id: "pack-3", priceUsd: 3, stars: 200, bonus: 200 - 3 * basePerDollar, label: "Popular" },
        { id: "pack-5", priceUsd: 5, stars: 350, bonus: 350 - 5 * basePerDollar, label: "Best value" },
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

    return (
        <section className='relative z-10 max-w-6xl mx-auto px-6 py-14 space-y-12'>
            {/* Background accents */}
            <div className='pointer-events-none absolute -z-10 inset-0 overflow-hidden'>
                <div className='absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-yellow-400/10 to-orange-500/10 blur-3xl' />
                <div className='absolute -bottom-32 -right-28 w-96 h-96 rounded-full bg-gradient-to-tr from-violet-500/10 to-fuchsia-500/10 blur-3xl' />
            </div>

            {/* Hero */}
            <div className='text-center space-y-4'>
                <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm'>
                    <Sparkles className='w-4 h-4' />
                    Fair and simple pricing
                </div>
                <h1 className='font-serif font-bold text-4xl md:text-5xl'>
                    Choose your stars, unlock deeper insights
                </h1>
                <p className='text-muted-foreground text-balance max-w-2xl mx-auto'>
                    $1 = 60 stars. Bigger packs come with bonus stars. Monthly plan available—cancel anytime.
                </p>
                <div className='text-xs text-white/70'>Prices in USD. Stars deliver instantly after purchase.</div>
            </div>

            {/* Packs */}
            <div className='grid md:grid-cols-3 gap-6'>
                {packs.map((p) => (
                    <Card
                        key={p.id}
                        className={`relative p-6 rounded-xl ${packStyles(p.id).bg} ${packStyles(p.id).border} ring-1 ring-white/10 hover:brightness-110 transition group overflow-visible`}
                    >
                        {/* Aura styled similar to interpretation cards but with pack color */}
                        <div className={`pointer-events-none absolute -inset-4 z-0 rounded-[22px] blur-[36px] opacity-85 mix-blend-screen bg-gradient-to-br ${packAura(p.id)}`} />
                        <div className='pointer-events-none absolute inset-0 z-0 opacity-8 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.10),transparent_35%),radial-gradient(120%_120%_at_100%_100%,rgba(255,255,255,0.10),transparent_35%)]' />
                        {p.label && (
                            <div className={`absolute -top-2 right-4 text-xs px-2 py-1 rounded-full ${badgeStyles(p.id)}`}>
                                {p.label}
                            </div>
                        )}
                        <div className='space-y-4 text-center relative z-10'>
                            {renderPackIcon(p.id)}
                            <div className='space-y-1'>
                                <div className='text-3xl font-bold'>${p.priceUsd.toFixed(0)}</div>
                                <div className='text-sm text-muted-foreground'>one-time</div>
                            </div>
                            <div className='space-y-1'>
                                <div className='text-xl font-semibold'>{p.stars} stars</div>
                                {p.bonus > 0 && (() => {
                                    const bonusUsd = p.bonus / basePerDollar
                                    return (
                                        <div className='flex items-center justify-center gap-2'>
                                            <div className='text-xs inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/30 text-emerald-300'>
                                                <Gift className='w-3.5 h-3.5' />
                                                +{p.bonus} bonus
                                            </div>
                                            <div className='text-[11px] text-emerald-300/90'>≈ ${bonusUsd.toFixed(2)} value</div>
                                        </div>
                                    )
                                })()}
                                <div className='text-xs text-white/60'>${(p.priceUsd / (p.stars / basePerDollar)).toFixed(2)} per 60 stars</div>
                            </div>
                            <div>
                                <PricingCTA mode='pack' packId={p.id} />
                            </div>
                            <div className='text-xs text-muted-foreground'>
                                Secure checkout. Stars deliver instantly after payment.
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

