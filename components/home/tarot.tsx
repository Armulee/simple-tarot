"use client"

import { TypewriterText } from "../typewriter-text"
import { Suspense, useState } from "react"
import { Button } from "../ui/button"
import Question from "./question"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { ChevronUp } from "lucide-react"

export default function Tarot() {
    const t = useTranslations("Home")
    const [inputValue, setInputValue] = useState("")
    
    const scrollToAbout = () => {
        // This will be handled by the parent swiper
        const event = new CustomEvent('scrollToAbout')
        window.dispatchEvent(event)
    }
    
    return (
        <>
            {/* Main Heading */}
            <div className='space-y-4'>
                <h1 className='font-serif font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-balance h-20 sm:h-24 md:h-28 lg:h-32'>
                    <TypewriterText
                        text={t("hero.line1")}
                        speed={60}
                        className='text-white'
                    />
                    <br />
                    <TypewriterText
                        text={t("hero.line2")}
                        speed={60}
                        delay={60 * t("hero.line1").length}
                        className='text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text'
                    />
                </h1>
            </div>

            {/* Question Input */}
            <div className='flex flex-col gap-6 justify-center items-center pt-8'>
                <Suspense fallback={<div className='h-20' />}>
                    <div className='w-full space-y-4'>
                        <Question
                            inputValue={inputValue}
                            setInputValue={setInputValue}
                        />
                    </div>
                </Suspense>

                <div className="flex flex-col items-center space-y-3">
                    <div className="text-center">
                        <p className="text-sm font-medium text-white">Discover more about our platform</p>
                        <p className="text-xs text-gray-400">Swipe up to learn about our services and roadmap</p>
                    </div>
                    <button 
                        onClick={scrollToAbout}
                        className="flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <span className="text-sm font-medium">Learn More</span>
                        <ChevronUp className="w-4 h-4" />
                    </button>
                </div>
            </div>

        </>
    )
}
