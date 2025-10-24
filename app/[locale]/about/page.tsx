import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Brain, Heart, Zap, Target, Eye, Shield, Globe } from "lucide-react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.About")
    return {
        title: t("title"),
        description: t("description"),
        keywords: t("keywords"),
        openGraph: {
            title: t("ogTitle"),
            description: t("ogDescription"),
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: t("twitterTitle"),
            description: t("twitterDescription"),
        },
    }
}

export default function AboutPage() {
    const t = useTranslations("About")
    return (
        <div className='min-h-screen relative overflow-hidden'>
            <main className='relative z-10 max-w-4xl mx-auto px-6 py-16'>
                {/* Hero Section */}
                <div className='text-center space-y-8 mb-12'>
                    <div className='space-y-4'>
                        <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>
                            {t("hero.title1")}
                            <span className='block text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                                {t("hero.title2")}
                            </span>
                        </h1>
                        <p className='text-xl text-muted-foreground max-w-2xl mx-auto text-pretty'>
                            {t("hero.subtitle")}
                        </p>
                    </div>
                </div>

                {/* Features Grid */}
                <div className='grid md:grid-cols-3 gap-6 max-w-4xl mx-auto'>
                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20 hover:bg-card/20 transition-all duration-300'>
                        <div className='text-center space-y-3'>
                            <div className='w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
                                <span className='text-2xl'>🔮</span>
                            </div>
                            <h3 className='font-serif font-semibold text-lg'>
                                {t("features.ai.title")}
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                                {t("features.ai.desc")}
                            </p>
                        </div>
                    </Card>

                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20 hover:bg-card/20 transition-all duration-300'>
                        <div className='text-center space-y-3'>
                            <div className='w-12 h-12 mx-auto rounded-full bg-secondary/20 flex items-center justify-center'>
                                <span className='text-2xl'>✨</span>
                            </div>
                            <h3 className='font-serif font-semibold text-lg'>
                                {t("features.cosmic.title")}
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                                {t("features.cosmic.desc")}
                            </p>
                        </div>
                    </Card>

                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20 hover:bg-card/20 transition-all duration-300'>
                        <div className='text-center space-y-3'>
                            <div className='w-12 h-12 mx-auto rounded-full bg-accent/20 flex items-center justify-center'>
                                <span className='text-2xl'>🌟</span>
                            </div>
                            <h3 className='font-serif font-semibold text-lg'>
                                {t("features.personal.title")}
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                                {t("features.personal.desc")}
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Story Section */}
                <div className='space-y-16'>
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='grid md:grid-cols-2 gap-8 items-center'>
                            <div className='space-y-4'>
                                <div className='w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center'>
                                    <Heart className='w-8 h-8 text-primary' />
                                </div>
                                <h2 className='font-serif font-bold text-2xl'>
                                    {t("story.title")}
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    {t("story.p1")}
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    {t("story.p2")}
                                </p>
                            </div>
                            <div className='relative'>
                                <div className='grid grid-cols-3 gap-4'>
                                    {Array.from({ length: 6 }).map(
                                        (_, index) => (
                                            <div
                                                key={index}
                                                className='w-16 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm rounded-lg border border-border/30 flex items-center justify-center float-animation'
                                                style={{
                                                    animationDelay: `${
                                                        index * 0.5
                                                    }s`,
                                                }}
                                            >
                                                <span className='text-2xl'>
                                                    ✦
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* AI Technology Section */}
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='grid md:grid-cols-2 gap-8 items-center'>
                            <div className='relative order-2 md:order-1'>
                                <div className='space-y-4'>
                                    <div className='flex items-center space-x-4'>
                                        <div className='w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center'>
                                            <Brain className='w-6 h-6 text-secondary' />
                                        </div>
                                        <div className='w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center'>
                                            <Zap className='w-6 h-6 text-accent' />
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-2 gap-3'>
                                        {[
                                            "Neural Networks",
                                            "Pattern Recognition",
                                            "Symbolic Analysis",
                                            "Contextual Understanding",
                                        ].map((tech, index) => (
                                            <div
                                                key={tech}
                                                className='p-3 bg-card/20 backdrop-blur-sm rounded-lg border border-border/30 text-center text-sm float-animation'
                                                style={{
                                                    animationDelay: `${
                                                        index * 0.3
                                                    }s`,
                                                }}
                                            >
                                                {tech}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className='space-y-4 order-1 md:order-2'>
                                <div className='w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center'>
                                    <Brain className='w-8 h-8 text-secondary' />
                                </div>
                                <h2 className='font-serif font-bold text-2xl'>
                                    {t("aiSection.title")}
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    {t("aiSection.p1")}
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    {t("aiSection.p2")}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Mission & Vision */}
                    <div className='grid md:grid-cols-2 gap-6'>
                        <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                            <div className='space-y-4'>
                                <div className='w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center'>
                                    <Target className='w-7 h-7 text-primary' />
                                </div>
                                <h3 className='font-serif font-bold text-xl'>
                                    {t("mission.title")}
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    {t("mission.p")}
                                </p>
                            </div>
                        </Card>
                        <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                            <div className='space-y-4'>
                                <div className='w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center'>
                                    <Eye className='w-7 h-7 text-secondary' />
                                </div>
                                <h3 className='font-serif font-bold text-xl'>
                                    {t("vision.title")}
                                </h3>
                                <p className='text-muted-foreground leading-relaxed'>
                                    {t("vision.p")}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Values */}
                    <div className='space-y-4'>
                        <h3 className='font-serif font-bold text-2xl text-center'>
                            {t("valuesSection.title")}
                        </h3>
                        <div className='grid md:grid-cols-3 gap-6'>
                            {[{
                                icon: Shield,
                                title: t("valuesSection.privacyFirst.title"),
                                desc: t("valuesSection.privacyFirst.desc"),
                            }, {
                                icon: Heart,
                                title: t("valuesSection.clarity.title"),
                                desc: t("valuesSection.clarity.desc"),
                            }, {
                                icon: Globe,
                                title: t("valuesSection.inclusive.title"),
                                desc: t("valuesSection.inclusive.desc"),
                            }].map((item, idx) => {
                                const Icon = item.icon
                                return (
                                    <Card key={idx} className='p-6 bg-card/10 backdrop-blur-sm border-border/20 text-center'>
                                        <div className='space-y-4'>
                                            <div className='w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
                                                <Icon className='w-6 h-6 text-primary' />
                                            </div>
                                            <div className='font-serif font-semibold text-lg'>
                                                {item.title}
                                            </div>
                                            <p className='text-muted-foreground text-sm'>
                                                {item.desc}
                                            </p>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>

                    {/* Quick stats */}
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='space-y-6'>
                            <h3 className='font-serif font-bold text-2xl text-center'>
                                {t("quickStatsSection.title")}
                            </h3>
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
                                <div>
                                    <div className='text-3xl font-bold text-primary'>~500</div>
                                    <div className='text-muted-foreground text-sm'>
                                        {t("quickStatsSection.users")}
                                    </div>
                                </div>
                                <div>
                                    <div className='text-3xl font-bold text-primary'>Thousands</div>
                                    <div className='text-muted-foreground text-sm'>
                                        {t("quickStatsSection.cards")}
                                    </div>
                                </div>
                                <div>
                                    <div className='text-3xl font-bold text-primary'>Weekly</div>
                                    <div className='text-muted-foreground text-sm'>
                                        {t("quickStatsSection.updates")}
                                    </div>
                                </div>
                                <div>
                                    <div className='text-3xl font-bold text-primary'>24/7</div>
                                    <div className='text-muted-foreground text-sm'>
                                        {t("quickStatsSection.availability")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Press & Contact */}
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20'>
                        <div className='md:flex items-center justify-between gap-6'>
                            <div className='space-y-2 max-w-2xl'>
                                <h3 className='font-serif font-bold text-xl'>
                                    {t("pressSection.title")}
                                </h3>
                                <p className='text-muted-foreground'>
                                    {t("pressSection.desc")}
                                </p>
                            </div>
                            <div className='flex flex-col sm:flex-row gap-3 mt-6 md:mt-0'>
                                <Button asChild className='px-6'>
                                    <Link href='/demo'>{t("pressSection.primary")}</Link>
                                </Button>
                                <Button asChild variant='outline' className='px-6'>
                                    <Link href='/contact'>{t("pressSection.secondary")}</Link>
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* CTA Section */}
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 text-center'>
                        <div className='space-y-6'>
                            <div className='space-y-3'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    {t("cta.title")}
                                </h2>
                                <p className='text-muted-foreground max-w-2xl mx-auto'>
                                    {t("cta.desc")}
                                </p>
                            </div>
                            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                                <Button
                                    asChild
                                    size='lg'
                                    className='bg-primary hover:bg-primary/90 text-primary-foreground px-8 card-glow'
                                >
                                    <Link href='/tarot'>{t("cta.primary")}</Link>
                                </Button>
                                <Button
                                    asChild
                                    variant='outline'
                                    size='lg'
                                    className='border-border/30 hover:bg-card/20 bg-transparent px-8'
                                >
                                    <Link href='/about'>{t("cta.secondary")}</Link>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
