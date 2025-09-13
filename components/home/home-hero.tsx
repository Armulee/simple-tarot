"use client"

import { Button } from "@/components/ui/button"
import { TypewriterText } from "@/components/typewriter-text"
import Link from "next/link"
import QuestionInput from "@/components/question-input"

export default function HomeHero() {
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
                        <QuestionInput id='question-input' />
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