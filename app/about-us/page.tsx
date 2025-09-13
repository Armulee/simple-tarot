"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Brain, Heart, Sparkles, Users, Zap, Shield } from "lucide-react"

export default function AboutPage() {
    return (
        <div className='min-h-screen relative overflow-hidden'>
            <main className='relative z-10 max-w-4xl mx-auto px-6 py-16'>
                {/* Hero Section */}
                <div className='text-center space-y-8 mb-12'>
                    <div className='space-y-4'>
                        <h1 className='font-serif font-bold text-4xl md:text-5xl text-balance'>
                            Where Ancient Wisdom
                            <span className='block text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                                Meets Modern AI
                            </span>
                        </h1>
                        <p className='text-xl text-muted-foreground max-w-2xl mx-auto text-pretty'>
                            Discover how we blend centuries-old tarot traditions
                            with cutting-edge artificial intelligence to provide
                            you with personalized cosmic guidance.
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
                                AI-Powered Insights
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                                Advanced AI interprets your cards with
                                personalized, meaningful guidance
                            </p>
                        </div>
                    </Card>

                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20 hover:bg-card/20 transition-all duration-300'>
                        <div className='text-center space-y-3'>
                            <div className='w-12 h-12 mx-auto rounded-full bg-secondary/20 flex items-center justify-center'>
                                <span className='text-2xl'>✨</span>
                            </div>
                            <h3 className='font-serif font-semibold text-lg'>
                                Cosmic Experience
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                                Immerse yourself in a beautiful galaxy-themed
                                interface with smooth animations
                            </p>
                        </div>
                    </Card>

                    <Card className='p-6 bg-card/10 backdrop-blur-sm border-border/20 hover:bg-card/20 transition-all duration-300'>
                        <div className='text-center space-y-3'>
                            <div className='w-12 h-12 mx-auto rounded-full bg-accent/20 flex items-center justify-center'>
                                <span className='text-2xl'>🌟</span>
                            </div>
                            <h3 className='font-serif font-semibold text-lg'>
                                Personal Journey
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                                Each reading is tailored to your unique
                                questions and spiritual path
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
                                    Our Spiritual Journey
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Asking Fate was born from a deep reverence for
                                    the mystical arts and a vision to make
                                    ancient wisdom accessible to everyone. We
                                    believe that the universe speaks to us
                                    through symbols, and tarot cards have been
                                    humanity&apos;s way of interpreting these
                                    cosmic messages for centuries.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our journey began with a simple question:
                                    How can we honor the sacred tradition of
                                    tarot while making it more accessible and
                                    insightful for modern seekers?
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
                                    Advanced AI Technology
                                </h2>
                                <p className='text-muted-foreground leading-relaxed'>
                                    Our AI system has been trained on thousands
                                    of traditional tarot interpretations,
                                    symbolic meanings, and archetypal patterns.
                                    It doesn&apos;t just provide generic
                                    readings—it analyzes your specific question,
                                    considers the unique combination of cards
                                    drawn, and generates personalized insights.
                                </p>
                                <p className='text-muted-foreground leading-relaxed'>
                                    The AI understands the nuanced relationships
                                    between cards, their positions, and the
                                    context of your inquiry to deliver guidance
                                    that feels both authentic and deeply
                                    personal.
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Values Section */}
                    <div className='grid md:grid-cols-3 gap-6'>
                        {[
                            {
                                icon: Shield,
                                title: "Respectful Tradition",
                                description:
                                    "We honor the sacred origins of tarot while making it accessible to modern seekers on their spiritual journey.",
                            },
                            {
                                icon: Sparkles,
                                title: "Personalized Guidance",
                                description:
                                    "Every reading is unique to you, your question, and your current life circumstances for meaningful insights.",
                            },
                            {
                                icon: Users,
                                title: "Inclusive Community",
                                description:
                                    "We welcome seekers from all backgrounds and beliefs, creating a safe space for spiritual exploration.",
                            },
                        ].map((value) => {
                            const IconComponent = value.icon
                            return (
                                <Card
                                    key={value.title}
                                    className='p-6 bg-card/10 backdrop-blur-sm border-border/20 text-center'
                                >
                                    <div className='space-y-4'>
                                        <div className='w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
                                            <IconComponent className='w-6 h-6 text-primary' />
                                        </div>
                                        <h3 className='font-serif font-semibold text-lg'>
                                            {value.title}
                                        </h3>
                                        <p className='text-muted-foreground text-sm leading-relaxed'>
                                            {value.description}
                                        </p>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>

                    {/* CTA Section */}
                    <Card className='p-8 bg-card/10 backdrop-blur-sm border-border/20 text-center'>
                        <div className='space-y-6'>
                            <div className='space-y-3'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    Ready to Begin Your Journey?
                                </h2>
                                <p className='text-muted-foreground max-w-2xl mx-auto'>
                                    Join thousands of seekers who have
                                    discovered deeper insights about their path
                                    through our AI-powered tarot readings.
                                </p>
                            </div>
                            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                                <Button
                                    asChild
                                    size='lg'
                                    className='bg-primary hover:bg-primary/90 text-primary-foreground px-8 card-glow'
                                >
                                    <Link href='/reading'>
                                        Start Your First Reading
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant='outline'
                                    size='lg'
                                    className='border-border/30 hover:bg-card/20 bg-transparent px-8'
                                >
                                    <Link href='/reading'>Start Reading</Link>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
