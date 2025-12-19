"use client"

import { TypewriterText } from "../../typewriter-text"
import { Suspense, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStarConsent } from "@/components/star-consent"

export default function Horoscope() {
    const router = useRouter()
    const [inputValue, setInputValue] = useState("")
    const [shouldStartTypewriter, setShouldStartTypewriter] = useState(false)
    const { choice, show } = useStarConsent()

    // Listen for when this slide becomes active
    useEffect(() => {
        const handleSlideChange = () => {
            setShouldStartTypewriter(true)
        }

        // Check if we're on the horoscope slide
        const checkSlide = () => {
            const event = new CustomEvent("check-horoscope-slide")
            window.dispatchEvent(event)
        }

        window.addEventListener("horoscope-slide-active", handleSlideChange)
        checkSlide()

        return () => {
            window.removeEventListener(
                "horoscope-slide-active",
                handleSlideChange
            )
        }
    }, [])

    const handleGetHoroscope = () => {
        if (inputValue.trim()) {
            // Store question in localStorage for the horoscope page
            try {
                localStorage.setItem(
                    "horoscope-question",
                    JSON.stringify({ question: inputValue.trim() })
                )
            } catch {}
        }
        router.push("/horoscope")
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
            e.preventDefault()
            if (inputValue.trim()) {
                handleGetHoroscope()
            }
        }
    }

    return (
        <>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    {shouldStartTypewriter ? (
                        <>
                            <TypewriterText
                                text="Daily "
                                speed={60}
                                className='text-white'
                            />
                            <TypewriterText
                                text="Horoscope"
                                speed={60}
                                delay={60 * "Daily ".length}
                                className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                            />
                        </>
                    ) : (
                        <>
                            <span className='text-white'>Daily </span>
                            <span className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'>
                                Horoscope
                            </span>
                        </>
                    )}
                </h1>
            </div>

            {/* Question Input */}
            <div className='flex flex-col gap-6 justify-center items-center pt-8'>
                <Suspense fallback={<div className='h-20' />}>
                    <div className='w-full space-y-4 max-w-sm md:max-w-md'>
                        <div className='w-full mb-6 text-left'>
                            <Label
                                htmlFor='horoscope-question-input'
                                className='block mb-2 text-lg'
                            >
                                Ask your horoscope question
                            </Label>
                            <div className='relative group'>
                                <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90 group-focus-within:opacity-0 transition-opacity' />
                                <AutoHeightTextarea
                                    id='horoscope-question-input'
                                    name='horoscope-question-input'
                                    placeholder="What does the cosmos reveal about my day?"
                                    className='relative z-10 w-full pl-4 pr-15 py-2 text-white placeholder:text-white/70 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/40 rounded-2xl resize-y shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] resize-none'
                                    onFocus={() => {
                                        if (choice === null || choice === "declined")
                                            show()
                                    }}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    value={inputValue}
                                    onKeyDown={handleKeyDown}
                                />
                                <Button
                                    onClick={handleGetHoroscope}
                                    disabled={!inputValue.trim()}
                                    size='lg'
                                    variant='ghost'
                                    className='absolute bottom-0 right-0 z-20 bg-transparent hover:bg-transparent border-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 hover:text-white'
                                >
                                    <span className='pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400/50 via-purple-400/50 to-cyan-400/50 opacity-80 hover:opacity-0' />
                                    <Send className='relative z-10 w-5 h-5 drop-shadow-sm' />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Suspense>
            </div>
        </>
    )
}