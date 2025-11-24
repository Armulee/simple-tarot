"use client"

import { useState } from "react"
import { useCompletion } from "@ai-sdk/react" // Corrected import for Next.js app router usually @ai-sdk/react but checking package.json it was @ai-sdk/openai.
// Wait, in components/tarot/interpretation/index.tsx it was import { useCompletion } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Sparkles, Send, Loader2 } from "lucide-react"

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-serif font-semibold text-white">
                    Ask about your Chart
                </h2>
            </div>

            <div className="space-y-4">
                {(answer || completion) && (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 animate-fade-in">
                        <p className="text-white whitespace-pre-wrap leading-relaxed">
                            {completion || answer}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="relative">
                    <Textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question about your love life, career, or personality..."
                        className="min-h-[100px] bg-black/20 border-white/10 text-white placeholder:text-white/40 resize-none pr-12 focus:ring-primary/50"
                    />
                    <Button
                        type="submit"
                        disabled={!question.trim() || isLoading}
                        size="icon"
                        className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </form>
            </div>
        </Card>
    )
}
