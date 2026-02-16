import { streamText } from "ai"

import { MODEL } from "@/lib/ai-model"
import {
    CHAT_DECISION_SYSTEM_PROMPT,
    getChatDecisionPrompt,
} from "@/lib/prompts"

export async function POST(req: Request) {
    try {
        const { question, history } = await req.json()

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamText({
            model: MODEL,
            maxOutputTokens: 2000,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({ question, history }),
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
