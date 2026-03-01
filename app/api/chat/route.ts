import { streamText } from "ai"

import {
    CHAT_DECISION_SYSTEM_PROMPT,
    getChatDecisionPrompt,
} from "@/lib/prompts"

const MODEL = "openai/gpt-4o-mini"

export async function POST(req: Request) {
    try {
        let body: {
            question?: string
            history?: unknown
            savedBirthInfo?: string | null
        }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid or empty request body", {
                status: 400,
            })
        }
        const { question, history, savedBirthInfo } = body ?? {}

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamText({
            model: MODEL,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({
                question,
                history,
                savedBirthInfo: savedBirthInfo ?? null,
            }),
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
