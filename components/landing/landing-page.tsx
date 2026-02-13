"use client"

import { useState, useEffect } from "react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageCircle, User, Lock } from "lucide-react"

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

const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
    { id: "love", label: "Love", emoji: "💘" },
    { id: "money", label: "Money", emoji: "💰" },
    { id: "career", label: "Career", emoji: "💼" },
    { id: "life", label: "Life", emoji: "🧭" },
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
        <div className='w-full min-h-[calc(100dvh-64px)] flex flex-col'>
            {/* Section 1: Niche Hook */}
            <section className='relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center'>
                <div className='max-w-2xl mx-auto space-y-4'>
                    <h1
                        key={HOOKS[hookIndex]}
                        className='font-playfair font-bold text-3xl sm:text-4xl md:text-5xl text-white animate-fade-swap'
                    >
                        {HOOKS[hookIndex]}
                    </h1>
                    <p className='text-lg sm:text-xl text-white/80'>
                        Find out in 30 seconds
                    </p>
                    <p className='text-sm sm:text-base text-white/60 uppercase tracking-widest'>
                        AI Fortune Teller
                    </p>
                    <Link href='/chat'>
                        <Button
                            size='lg'
                            className='mt-6 px-8 py-6 text-base sm:text-lg font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 transition-all'
                        >
                            Ask your free question now
                            <ArrowRight className='ml-2 w-5 h-5' />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Section 2: Quick Categories */}
            <section className='px-6 py-8'>
                <h2 className='text-center text-white/90 font-medium text-lg mb-6'>
                    What do you want to know about?
                </h2>
                <div className='flex flex-wrap justify-center gap-3 max-w-2xl mx-auto'>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            type='button'
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                                selectedCategory === cat.id
                                    ? "bg-primary/40 text-white border-2 border-primary/60"
                                    : "bg-white/10 text-white/80 border border-white/20 hover:bg-white/15 hover:text-white"
                            }`}
                        >
                            <span>{cat.emoji}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Section 3: Example Response */}
            <section className='px-6 py-8'>
                <div className='max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8 space-y-6'>
                    <div>
                        <p className='text-xs uppercase tracking-wider text-white/50 mb-2 flex items-center gap-2'>
                            <MessageCircle className='w-3.5 h-3.5' />
                            Example question:
                        </p>
                        <p className='text-white/90 font-medium'>
                            &ldquo;{example.question}&rdquo;
                        </p>
                    </div>
                    <div>
                        <p className='text-xs uppercase tracking-wider text-white/50 mb-2 flex items-center gap-2'>
                            <User className='w-3.5 h-3.5' />
                            Example answer:
                        </p>
                        <p className='text-white/80 italic'>
                            &ldquo;{example.answer}&rdquo;
                        </p>
                    </div>
                </div>
            </section>

            {/* Section 4: Free Hooks and Pricing */}
            <section className='px-6 py-10'>
                <div className='max-w-2xl mx-auto text-center space-y-6'>
                    <div className='space-y-2'>
                        <p className='text-white/90'>
                            One question for anonymous.
                        </p>
                        <p className='text-white/90'>
                            Ask 2 more questions free for sign in.
                        </p>
                        <p className='text-white/80 text-sm'>
                            Then if you still want to know more,{" "}
                            <span className='font-semibold text-white'>
                                $2.83/month
                            </span>{" "}
                            for 20 more questions.
                        </p>
                    </div>
                    <Link href='/chat'>
                        <Button
                            size='lg'
                            className='px-8 py-6 text-base font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 transition-all'
                        >
                            Get My Predictions
                            <ArrowRight className='ml-2 w-5 h-5' />
                        </Button>
                    </Link>
                    <div className='flex flex-wrap justify-center gap-6 pt-6 text-xs text-white/50'>
                        <span className='flex items-center gap-1.5'>
                            <Lock className='w-3.5 h-3.5' />
                            100% Secure
                        </span>
                        <span>Trusted by 50,000+ users</span>
                    </div>
                </div>
            </section>

            {/* Footer links */}
            <footer className='px-6 py-8 border-t border-white/5'>
                <div className='max-w-2xl mx-auto flex flex-col items-center gap-4 text-center'>
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
