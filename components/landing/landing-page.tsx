"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Link } from "@/i18n/navigation"
import {
    ArrowRight,
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

const CTA_BUTTON_CLASS =
    "inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:via-green-400 hover:to-emerald-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:shadow-[0_6px_28px_rgba(16,185,129,0.5)] transition-all duration-300"

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
        <div className='w-full min-h-[calc(100dvh-64px)] flex flex-col overflow-x-hidden'>
            {/* Section 1: Niche Hook with Logo */}
            <section className='relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-16 text-center'>
                {/* Logo */}
                <div className='mb-8 flex items-center justify-center gap-2'>
                    <Image
                        src='/assets/logo.png'
                        alt='AskingFate'
                        width={40}
                        height={40}
                        className='rounded-lg object-contain'
                    />
                    <span className='font-playfair text-2xl font-bold text-white'>
                        AskingFate
                    </span>
                </div>

                <div className='max-w-2xl mx-auto space-y-5'>
                    <h1
                        key={HOOKS[hookIndex]}
                        className='font-playfair font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-tight animate-fade-swap'
                    >
                        {HOOKS[hookIndex]}
                    </h1>
                    <p className='text-lg sm:text-xl text-white/90 font-medium'>
                        Find out in 30 seconds
                    </p>
                    <p className='text-sm sm:text-base text-white/60'>
                        AI analyzes your unique astrological chart
                    </p>
                    <Link href='/chat' className='inline-block mt-4'>
                        <span className={CTA_BUTTON_CLASS}>
                            Ask your free question now
                            <ChevronRight className='w-5 h-5' />
                        </span>
                    </Link>
                </div>
            </section>

            {/* Section 2: Quick Categories */}
            <section className='px-6 py-10'>
                <h2 className='text-center text-white/95 font-semibold text-lg sm:text-xl mb-8'>
                    What do you want to know today?
                </h2>
                <div className='flex flex-wrap justify-center gap-3 max-w-2xl mx-auto'>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type='button'
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                                selectedCategory === cat.id
                                    ? "bg-primary/50 text-white border-2 border-primary shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                                    : "bg-white/10 text-white/85 border border-white/15 hover:bg-white/15 hover:text-white hover:border-white/25"
                            }`}
                        >
                            <span
                                className={
                                    selectedCategory === cat.id
                                        ? "text-white"
                                        : "text-white/80"
                                }
                            >
                                {cat.icon}
                            </span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Section 3: Example Response */}
            <section className='px-6 py-10'>
                <div className='flex items-center justify-center gap-2 mb-6'>
                    <Sparkles className='w-4 h-4 text-amber-400/90' />
                    <h2 className='text-center text-white/95 font-semibold text-lg sm:text-xl'>
                        Real prediction example
                    </h2>
                    <Sparkles className='w-4 h-4 text-amber-400/90' />
                </div>
                <div className='relative max-w-2xl mx-auto'>
                    {/* Sparkle accents */}
                    <div className='absolute -left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-400/10 blur-xl' />
                    <div className='absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-amber-400/10 blur-xl' />
                    <div className='relative rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]'>
                        <div className='space-y-5'>
                            <div>
                                <p className='text-xs uppercase tracking-wider text-white/50 mb-2 flex items-center gap-2'>
                                    <MessageCircle className='w-3.5 h-3.5' />
                                    Example question
                                </p>
                                <p className='text-white/95 font-medium text-lg'>
                                    &ldquo;{example.question}&rdquo;
                                </p>
                            </div>
                            <div>
                                <p className='text-xs uppercase tracking-wider text-white/50 mb-2 flex items-center gap-2'>
                                    Example answer
                                </p>
                                <p className='text-white/85 italic leading-relaxed'>
                                    &ldquo;{example.answer}&rdquo;
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: How It Works */}
            <section className='px-6 py-12'>
                <div className='flex items-center justify-center gap-2 mb-10'>
                    <Sparkles className='w-4 h-4 text-amber-400/90' />
                    <h2 className='text-center text-white/95 font-semibold text-lg sm:text-xl'>
                        How it works
                    </h2>
                    <Sparkles className='w-4 h-4 text-amber-400/90' />
                </div>
                <div className='max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-8 sm:gap-4'>
                    <div className='flex flex-col items-center gap-3 flex-1'>
                        <div className='w-14 h-14 rounded-2xl bg-primary/30 border border-primary/40 flex items-center justify-center'>
                            <MessageCircle className='w-7 h-7 text-primary' />
                        </div>
                        <p className='text-white/90 text-sm font-medium text-center'>
                            Type your question
                        </p>
                    </div>
                    <ChevronRight className='w-6 h-6 text-white/40 rotate-90 sm:rotate-0 flex-shrink-0' />
                    <div className='flex flex-col items-center gap-3 flex-1'>
                        <div className='w-14 h-14 rounded-2xl bg-primary/30 border border-primary/40 flex items-center justify-center'>
                            <Globe className='w-7 h-7 text-primary' />
                        </div>
                        <p className='text-white/90 text-sm font-medium text-center'>
                            Analyze the stars
                        </p>
                    </div>
                    <ChevronRight className='w-6 h-6 text-white/40 rotate-90 sm:rotate-0 flex-shrink-0' />
                    <div className='flex flex-col items-center gap-3 flex-1'>
                        <div className='w-14 h-14 rounded-2xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center'>
                            <FileCheck className='w-7 h-7 text-emerald-400' />
                        </div>
                        <p className='text-white/90 text-sm font-medium text-center'>
                            Get immediate answer
                        </p>
                    </div>
                </div>
            </section>

            {/* Section 5: Free Hooks and Pricing */}
            <section className='px-6 py-14'>
                <div className='max-w-2xl mx-auto text-center space-y-8'>
                    <div className='space-y-3'>
                        <p className='text-white/95 text-lg'>
                            One question for anonymous.
                        </p>
                        <p className='text-white/95 text-lg'>
                            Ask 2 more questions free for sign in.
                        </p>
                        <p className='text-white/85'>
                            Then if you still want to know more,{" "}
                            <span className='font-bold text-white'>
                                $2.83/month
                            </span>{" "}
                            for 20 more questions.
                        </p>
                    </div>
                    <Link href='/chat'>
                        <span className={CTA_BUTTON_CLASS}>
                            Start asking now
                            <ChevronRight className='w-5 h-5' />
                        </span>
                    </Link>
                    <p className='text-white/70 text-sm max-w-md mx-auto leading-relaxed'>
                        The answer you are waiting for might change your
                        decision today.
                    </p>
                    <div className='flex flex-wrap justify-center gap-8 pt-6 text-sm text-white/50'>
                        <span className='flex items-center gap-2'>
                            <Lock className='w-4 h-4' />
                            100% Secure
                        </span>
                        <span>Trusted by 50,000+ users</span>
                    </div>
                </div>
            </section>

            {/* Footer links */}
            <footer className='px-6 py-10 border-t border-white/5 mt-auto'>
                <div className='max-w-2xl mx-auto flex flex-col items-center gap-5 text-center'>
                    <div className='flex flex-wrap justify-center gap-4 text-sm'>
                        <Link
                            href='/about'
                            className='text-white/60 hover:text-white transition-colors'
                        >
                            About
                        </Link>
                        <span className='text-white/30'>|</span>
                        <Link
                            href='/articles/faq'
                            className='text-white/60 hover:text-white transition-colors'
                        >
                            FAQ
                        </Link>
                        <span className='text-white/30'>|</span>
                        <Link
                            href='/contact'
                            className='text-white/60 hover:text-white transition-colors'
                        >
                            Contact
                        </Link>
                    </div>
                    <p className='text-xs text-white/40'>
                        © {new Date().getFullYear()} AskingFate. All rights
                        reserved
                    </p>
                    <div className='flex flex-wrap justify-center gap-4 text-xs'>
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
