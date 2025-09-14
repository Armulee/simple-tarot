import type { Metadata } from "next"
import { TypewriterText } from "@/components/typewriter-text"
import HomeQuestionWrapper from "@/components/home-question-wrapper"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Suspense } from "react"

export const metadata: Metadata = {
    title: "AI Tarot Reading - Ask Questions About Your Destiny | Asking Fate",
    description:
        "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny and receive personalized insights from our advanced AI tarot system.",
    keywords:
        "AI tarot reading, free tarot cards, spiritual guidance, destiny questions, tarot card interpretation, AI-powered divination",
    openGraph: {
        title: "AI Tarot Reading - Ask Questions About Your Destiny",
        description:
            "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny.",
        type: "website",
        url: "https://askingfate.com",
        siteName: "Asking Fate",
    },
    twitter: {
        card: "summary_large_image",
        title: "AI Tarot Reading - Ask Questions About Your Destiny",
        description:
            "Get free AI-powered tarot card readings and spiritual guidance. Ask any question about your destiny.",
    },
}

export default function HomePage() {
    return (
        <section className='relative z-10 flex flex-col items-center justify-center h-[calc(100vh-180px)] px-6 text-center'>
            <div className='max-w-4xl w-full mx-auto space-y-8'>
                {/* Main Heading */}
                <div className='space-y-4'>
                    <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                        <TypewriterText
                            text='Ask me anything'
                            speed={60}
                            className='text-white'
                        />
                        <br />
                        <TypewriterText
                            text='about your destiny'
                            speed={60}
                            delay={60 * "Ask me anything".length}
                            className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                        />
                    </h1>
                </div>

                {/* Question Input */}
                <div className='flex flex-col gap-6 justify-center items-center pt-8 max-w-md mx-auto px-4'>
                    <div className='w-full'>
                        <Suspense fallback={<div className='h-20' />}>
                            <HomeQuestionWrapper />
                        </Suspense>
                    </div>

                    <Button
                        asChild
                        variant='ghost'
                        size='lg'
                        className='border-border/30 hover:bg-card/20 backdrop-blur-sm px-8 py-6 text-lg bg-transparent'
                    >
                        <Link href='/about'>Learn More</Link>
                    </Button>
                </div>
            </div>
        </section>
    )
}
