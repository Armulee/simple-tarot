"use client"

import { TypewriterText } from "../../typewriter-text"
import { Suspense, useState } from "react"
import { useTranslations } from "next-intl"
import SuggestionPromptCard from "@/components/suggestion-prompt-card"
import QuestionInput from "@/components/question-input"
// Sticky footer removed per request

export default function Tarot() {
    const t = useTranslations("Home")
    const m = useTranslations("QuestionInput")

    const [inputValue, setInputValue] = useState("")

    const handleSuggestionClick = (suggestion: string) => {
        setInputValue(suggestion)
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
                    <div className='space-y-4'>
                        <QuestionInput
                            className='min-w-0 w-screen sm:w-full md:max-w-md mx-auto px-4'
                            buttonClassName='mr-4'
                            id='question-input'
                            value={inputValue}
                            onChange={setInputValue}
                            label={m("label")}
                        />
                        <div className='mx-6'>
                            <SuggestionPromptCard
                                onSuggestionClick={handleSuggestionClick}
                            />
                        </div>
                    </div>
                </Suspense>
            </div>
        </>
    )
}
