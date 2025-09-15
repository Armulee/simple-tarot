"use client"

import { useState } from "react"
import { useTarot } from "@/contexts/tarot-context"
import QuestionInput from "./question-input"
import SuggestionPromptCard from "./suggestion-prompt-card"
import { useTranslations } from "next-intl"

export default function HomeQuestionWrapper() {
    const { question } = useTarot()
    const [inputValue, setInputValue] = useState(question || "")
    const t = useTranslations("QuestionInput")

    const handleSuggestionClick = (suggestion: string) => {
        setInputValue(suggestion)
    }

    return (
        <div className='w-full space-y-4'>
            <QuestionInput
                id='question-input'
                value={inputValue}
                onChange={setInputValue}
                label={t("label")}
            />
            <div className='-mx-6'>
                <SuggestionPromptCard
                    onSuggestionClick={handleSuggestionClick}
                />
            </div>
        </div>
    )
}
