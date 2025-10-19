"use client"
import SuggestionPromptCard from "../suggestion-prompt-card"
import QuestionInput from "../question-input"
import { useTranslations } from "next-intl"

export default function Question({
    inputValue,
    setInputValue,
}: {
    inputValue: string
    setInputValue: (value: string) => void
}) {
    const t = useTranslations("QuestionInput")

    const handleSuggestionClick = (suggestion: string) => {
        setInputValue(suggestion)
    }
    return (
        <>
            <QuestionInput
                id='question-input'
                value={inputValue}
                onChange={setInputValue}
                label={t("label")}
            />
            <div className='mx-6'>
                <SuggestionPromptCard
                    onSuggestionClick={handleSuggestionClick}
                />
            </div>
        </>
    )
}
