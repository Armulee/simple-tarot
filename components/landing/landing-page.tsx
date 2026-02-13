"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import {
    MessageCircle,
    Lock,
    Heart,
    DollarSign,
    Briefcase,
    Compass,
    Sparkles,
    Globe,
    FileCheck,
    ChevronRight,
} from "lucide-react"

const HOOKS = [
    "Will he/she come back to you?",
    "Why are they acting distant lately?",
    "When will they text you again?",
    "Are you on the right path right now?",
    "Should you let go… or wait?",
]

const HOOK_INTERVAL_MS = 4000

type CategoryId = "love" | "money" | "career" | "life"

interface CategoryExample {
    question: string
    answer: string
}

const CATEGORY_EXAMPLES: Record<CategoryId, CategoryExample> = {
    love: {
        question: "Will he text me again?",
        answer:
            "There is a strong indication of reconnection within 7–14 days…",
    },
    money: {
        question: "Will this investment pay off?",
        answer:
            "The cards suggest cautious optimism—steady progress is likely within 2–3 months.",
    },
    career: {
        question: "Should I take this job offer?",
        answer:
            "There are positive signs of growth; align with your long-term goals before deciding.",
    },
    life: {
        question: "Am I on the right path right now?",
        answer:
            "You are being guided toward your true purpose; trust the signs appearing around you.",
    },
}

const CATEGORIES: {
    id: CategoryId
    label: string
    icon: React.ReactNode
}[] = [
    { id: "love", label: "Love", icon: <Heart className='w-4 h-4' /> },
    { id: "money", label: "Money", icon: <DollarSign className='w-4 h-4' /> },
    { id: "career", label: "Career", icon: <Briefcase className='w-4 h-4' /> },
    { id: "life", label: "Life", icon: <Compass className='w-4 h-4' /> },
]

export default function LandingPage() {
    const [hookIndex, setHookIndex] = useState(0)
    const [selectedCategory, setSelectedCategory] =
        useState<CategoryId>("love")

    useEffect(() => {
        const timer = setInterval(() => {
            setHookIndex((prev) => (prev + 1) % HOOKS.length)
        }, HOOK_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [])

    const example = CATEGORY_EXAMPLES[selectedCategory]

    return (
        <div className='w-full min-h-[calc(100dvh-64px)] flex flex-col overflow-x-hidden relative'>
            {/* Ambient gradient orbs - background decoration */}
            <div className='fixed inset-0 pointer-events-none overflow-hidden -z-10'>
                <div className='absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-500/20 via-purple-500/10 to-transparent blur-3xl animate-landing-glow-pulse' />
                <div className='absolute top-1/3 -left-32 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl animate-landing-float' />
                <div className='absolute top-2/3 -right-32 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl animate-landing-float' style={{ animationDelay: '-2s' }} />
                <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[500px] h-[300px] rounded-full bg-emerald-500/10 blur-3xl' />
            </div>

            {/* Section 1: Hero - Most prominent section */}
            <section className='relative z-10 min-h-[70vh] flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center overflow-hidden'>
                {/* Hero-exclusive ambient glow - more intense than rest of page */}
                <div className='absolute inset-0 pointer-events-none -z-10'>
                    <div className='absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,rgba(139,92,246,0.25),rgba(99,102,241,0.12)_40%,transparent_70%)]' />
                    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-violet-500/30 via-purple-500/15 to-transparent blur-3xl' />
                    <div className='absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-emerald-500/15 blur-3xl' />
                </div>

                {/* Floating star particles - hero only */}
                <div className='absolute inset-0 pointer-events-none overflow-hidden'>
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className='absolute w-1 h-1 rounded-full bg-white/60 hero-star-float'
                            style={{
                                left: `${10 + (i * 7) % 80}%`,
                                top: `${15 + (i * 11) % 70}%`,
                                animationDelay: `${i * 0.4}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Logo - refined with glow ring */}
                <div className='mb-12 flex items-center justify-center gap-3 animate-landing-fade-up'>
                    <div className='relative group'>
                        <div className='absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-500/40 to-purple-500/30 blur-md opacity-70 group-hover:opacity-100 transition-opacity' />
                        <div className='relative rounded-xl p-1.5 bg-white/5 ring-1 ring-white/20 backdrop-blur-sm'>
                            <Image
                                src='/assets/logo.png'
                                alt='AskingFate'
                                width={48}
                                height={48}
                                className='rounded-lg object-contain'
                            />
                        </div>
                    </div>
                    <span className='font-playfair text-2xl sm:text-3xl font-bold tracking-tight'>
                        <span className='bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent'>
                            AskingFate
                        </span>
                    </span>
                </div>

                <div className='max-w-3xl mx-auto space-y-8 animate-landing-fade-up' style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                    {/* Main headline - shimmer gradient, larger, more dramatic */}
                    <h1
                        key={HOOKS[hookIndex]}
                        className='font-playfair font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.1] animate-fade-swap px-2 [filter:drop-shadow(0_0_40px_rgba(255,255,255,0.15))]'
                    >
                        <span className='hero-shimmer'>
                            {HOOKS[hookIndex]}
                        </span>
                    </h1>

                    {/* "Find out in 30 seconds" - glowing badge */}
                    <div className='inline-flex items-center gap-2 px-5 py-2.5 rounded-full hero-badge-glow bg-white/10 border border-white/20 backdrop-blur-md'>
                        <Sparkles className='w-4 h-4 text-amber-400' />
                        <span className='text-white/95 font-semibold text-base sm:text-lg tracking-tight'>
                            Find out in 30 seconds
                        </span>
                        <Sparkles className='w-4 h-4 text-amber-400' />
                    </div>

                    <p className='text-sm sm:text-base text-white/50 max-w-md mx-auto'>
                        AI analyzes your unique astrological chart
                    </p>

                    {/* CTA - larger, with pulse glow */}
                    <Link href='/chat' className='inline-block mt-4 group'>
                        <span className='hero-cta-pulse inline-flex items-center justify-center gap-3 px-12 py-5 text-lg font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white hover:shadow-[0_8px_48px_rgba(16,185,129,0.6)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300'>
                            Ask your free question now
                            <ChevronRight className='w-6 h-6 group-hover:translate-x-1 transition-transform' />
                        </span>
                    </Link>
                </div>

                {/* Decorative bottom gradient fade */}
                <div className='absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--background)] to-transparent pointer-events-none' />
            </section>

            {/* Section 2: Quick Categories */}
            <section className='px-6 py-12 animate-landing-fade-up' style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                <h2 className='text-center text-white/95 font-semibold text-lg sm:text-xl mb-10'>
                    What do you want to know today?
                </h2>
                <div className='flex flex-wrap justify-center gap-3 max-w-2xl mx-auto'>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type='button'
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                                selectedCategory === cat.id
                                    ? "bg-gradient-to-r from-violet-500/60 to-purple-500/50 text-white border border-white/20 shadow-[0_0_24px_rgba(139,92,246,0.35)]"
                                    : "bg-white/5 text-white/90 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
                            }`}
                        >
                            <span className={selectedCategory === cat.id ? "text-white" : "text-white/80"}>
                                {cat.icon}
                            </span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Section 3: Example Response */}
            <section className='px-6 py-12 animate-landing-fade-up' style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                <div className='flex items-center justify-center gap-2.5 mb-8'>
                    <Sparkles className='w-5 h-5 text-amber-400/95' />
                    <h2 className='text-white/95 font-semibold text-lg sm:text-xl'>
                        Real prediction example
                    </h2>
                    <Sparkles className='w-5 h-5 text-amber-400/95' />
                </div>
                <div className='relative max-w-2xl mx-auto group'>
                    {/* Gradient border effect */}
                    <div className='absolute -inset-px rounded-3xl bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-amber-500/10 opacity-60 blur-sm group-hover:opacity-80 transition-opacity' />
                    <div className='relative rounded-3xl border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.04] backdrop-blur-xl p-6 sm:p-10 shadow-[0_8px_40px_rgba(0,0,0,0.4)]'>
                        {/* Corner sparkles */}
                        <div className='absolute top-4 left-4 w-2 h-2 rounded-full bg-amber-400/60' />
                        <div className='absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400/60' />
                        <div className='absolute bottom-4 left-4 w-2 h-2 rounded-full bg-amber-400/40' />
                        <div className='absolute bottom-4 right-4 w-2 h-2 rounded-full bg-amber-400/40' />
                        <div className='space-y-6'>
                            <div>
                                <p className='text-xs uppercase tracking-[0.2em] text-white/50 mb-3 flex items-center gap-2'>
                                    <MessageCircle className='w-3.5 h-3.5' />
                                    Example question
                                </p>
                                <p className='text-white/98 font-medium text-lg sm:text-xl leading-relaxed'>
                                    &ldquo;{example.question}&rdquo;
                                </p>
                            </div>
                            <div>
                                <p className='text-xs uppercase tracking-[0.2em] text-white/50 mb-3'>
                                    Example answer
                                </p>
                                <p className='text-white/90 italic leading-relaxed text-base sm:text-lg'>
                                    &ldquo;{example.answer}&rdquo;
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: How It Works */}
            <section className='px-6 py-14 animate-landing-fade-up' style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <div className='flex items-center justify-center gap-2.5 mb-12'>
                    <Sparkles className='w-5 h-5 text-amber-400/95' />
                    <h2 className='text-white/95 font-semibold text-lg sm:text-xl'>
                        How it works
                    </h2>
                    <Sparkles className='w-5 h-5 text-amber-400/95' />
                </div>
                <div className='max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-10 sm:gap-4'>
                    <div className='flex flex-col items-center gap-4 flex-1'>
                        <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/40 to-purple-500/30 border border-white/20 flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300'>
                            <MessageCircle className='w-8 h-8 text-white/95' />
                        </div>
                        <p className='text-white/90 text-sm font-medium text-center'>Type your question</p>
                    </div>
                    <ChevronRight className='w-6 h-6 text-white/30 rotate-90 sm:rotate-0 flex-shrink-0' />
                    <div className='flex flex-col items-center gap-4 flex-1'>
                        <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/40 to-purple-500/30 border border-white/20 flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300'>
                            <Globe className='w-8 h-8 text-white/95' />
                        </div>
                        <p className='text-white/90 text-sm font-medium text-center'>Analyze the stars</p>
                    </div>
                    <ChevronRight className='w-6 h-6 text-white/30 rotate-90 sm:rotate-0 flex-shrink-0' />
                    <div className='flex flex-col items-center gap-4 flex-1'>
                        <div className='w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/40 to-teal-500/30 border border-white/20 flex items-center justify-center shadow-lg hover:scale-105 transition-transform duration-300'>
                            <FileCheck className='w-8 h-8 text-white/95' />
                        </div>
                        <p className='text-white/90 text-sm font-medium text-center'>Get immediate answer</p>
                    </div>
                </div>
            </section>

            {/* Section 5: Free Hooks and Pricing */}
            <section className='px-6 py-16 animate-landing-fade-up' style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
                <div className='max-w-2xl mx-auto text-center space-y-10'>
                    <div className='space-y-4'>
                        <p className='text-white/95 text-lg sm:text-xl'>
                            One question for anonymous.
                        </p>
                        <p className='text-white/95 text-lg sm:text-xl'>
                            Ask 2 more questions free for sign in.
                        </p>
                        <p className='text-white/85 text-base'>
                            Then if you still want to know more,{" "}
                            <span className='font-bold text-white bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent'>
                                $2.83/month
                            </span>{" "}
                            for 20 more questions.
                        </p>
                    </div>
                    <Link href='/chat' className='inline-block group'>
                        <span className='inline-flex items-center justify-center gap-2.5 px-10 py-4 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-[0_4px_24px_rgba(16,185,129,0.45)] hover:shadow-[0_8px_40px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300'>
                            Start asking now
                            <ChevronRight className='w-5 h-5 group-hover:translate-x-0.5 transition-transform' />
                        </span>
                    </Link>
                    <p className='text-white/70 text-sm sm:text-base max-w-md mx-auto leading-relaxed font-medium'>
                        The answer you are waiting for might change your decision today.
                    </p>
                    <div className='flex flex-wrap justify-center gap-10 pt-4 text-sm text-white/55'>
                        <span className='flex items-center gap-2'>
                            <Lock className='w-4 h-4 text-emerald-400/80' />
                            100% Secure
                        </span>
                        <span className='flex items-center gap-2'>
                            <Sparkles className='w-4 h-4 text-amber-400/80' />
                            Trusted by 50,000+ users
                        </span>
                    </div>
                </div>
            </section>

            {/* Footer links */}
            <footer className='px-6 py-12 border-t border-white/5 mt-auto'>
                <div className='max-w-2xl mx-auto flex flex-col items-center gap-6 text-center'>
                    <div className='flex flex-wrap justify-center gap-5 text-sm'>
                        <Link
                            href='/about'
                            className='text-white/55 hover:text-white transition-colors'
                        >
                            About
                        </Link>
                        <span className='text-white/25'>|</span>
                        <Link
                            href='/articles/faq'
                            className='text-white/55 hover:text-white transition-colors'
                        >
                            FAQ
                        </Link>
                        <span className='text-white/25'>|</span>
                        <Link
                            href='/contact'
                            className='text-white/55 hover:text-white transition-colors'
                        >
                            Contact
                        </Link>
                    </div>
                    <p className='text-xs text-white/35'>
                        © {new Date().getFullYear()} AskingFate. All rights reserved
                    </p>
                    <div className='flex flex-wrap justify-center gap-5 text-xs'>
                        <Link
                            href='/terms-of-service'
                            className='text-white/40 hover:text-white/60 transition-colors'
                        >
                            Terms & Conditions
                        </Link>
                        <Link
                            href='/privacy-policy'
                            className='text-white/40 hover:text-white/60 transition-colors'
                        >
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
