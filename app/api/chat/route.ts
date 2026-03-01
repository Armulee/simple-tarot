import { streamText } from "ai"

import {
    CHAT_DECISION_SYSTEM_PROMPT,
    getChatDecisionPrompt,
} from "@/lib/prompts"

const MODEL = "openai/gpt-4o-mini"

function normalizeHistory(
    history: unknown,
): Array<{ role: "user" | "assistant"; text: string }> | undefined {
    if (!Array.isArray(history)) return undefined
    const normalized = history
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const role =
                (item as { role?: unknown }).role === "user" ||
                (item as { role?: unknown }).role === "assistant"
                    ? ((item as { role: "user" | "assistant" }).role as
                          | "user"
                          | "assistant")
                    : null
            const text = (item as { text?: unknown }).text
            if (!role || typeof text !== "string") return null
            return { role, text }
        })
        .filter((item): item is { role: "user" | "assistant"; text: string } =>
            Boolean(item),
        )
    return normalized.length > 0 ? normalized : undefined
}

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
        const normalizedHistory = normalizeHistory(history)

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamText({
            model: MODEL,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({
                question,
                history: normalizedHistory,
                savedBirthInfo: savedBirthInfo ?? null,
            }),
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
