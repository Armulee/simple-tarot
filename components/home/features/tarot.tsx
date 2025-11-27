"use client"

import { TypewriterText } from "../../typewriter-text"
import { Suspense, useState } from "react"
import Question from "../question"
import { useTranslations } from "next-intl"
// Sticky footer removed per request

export default function Tarot() {
    const t = useTranslations("Home")
    const [inputValue, setInputValue] = useState("")
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
            </div>
        </>
    )
}
