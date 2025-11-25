"use client"

import { useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Card } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import BirthChartQuestionInput from "./birth-chart-question-input"

interface BirthChartQuestionProps {
    houses?: Record<string, unknown> | null
    planets?: Record<string, unknown> | null
}

export default function BirthChartQuestion({
    houses,
    planets,
}: BirthChartQuestionProps) {
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
        <Card className="p-6 bg-card/10 backdrop-blur-sm border-border/20">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-serif font-semibold text-white">
                    Ask about your Chart
                </h2>
            </div>

            <div className="space-y-6">
                {(answer || completion) && (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 animate-fade-in">
                        <p className="text-white whitespace-pre-wrap leading-relaxed">
                            {completion || answer}
                        </p>
                    </div>
                )}

                <BirthChartQuestionInput 
                    value={question}
                    onChange={setQuestion}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    placeholder="Ask a question about your love life, career, or personality..."
                    label=""
                />
            </div>
        </Card>
    )
}
