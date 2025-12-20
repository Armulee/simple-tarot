"use client"

import { useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import { useTranslations } from "next-intl"
import BirthChartQuestionInput from "./question-input"

interface BirthChartQuestionProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}

export default function BirthChartQuestion({
    houses,
    planets,
}: BirthChartQuestionProps) {
    const t = useTranslations("BirthChart")
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")

    const { complete, completion, isLoading } = useCompletion({
        api: "/api/birth-chart/question",
        onFinish: (_prompt, result) => {
            setAnswer(result)
        },
    })

    const handleSubmit = async () => {
        if (!question.trim() || isLoading) return

        // Construct prompt with context
        const context = `
Birth Chart Data:
Planets: ${JSON.stringify(planets, null, 2)}
Houses: ${JSON.stringify(houses, null, 2)}

User Question: ${question}
`
        await complete(context)
    }

    return (
        <div className='space-y-6'>
            {(answer || completion) && (
                <div className='p-4 rounded-lg bg-white/5 border border-white/10 animate-fade-in'>
                    <p className='text-white whitespace-pre-wrap leading-relaxed'>
                        {completion || answer}
                    </p>
                </div>
            )}

            <BirthChartQuestionInput
                value={question}
                onChange={setQuestion}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                placeholder={t("questionPlaceholder")}
                label={t("questionLabel")}
            />
        </div>
    )
}
