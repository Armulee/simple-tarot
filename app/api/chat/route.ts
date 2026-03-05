import { streamObject } from "ai"

import { chatDecisionSchema } from "@/lib/chat/decision-schema"

const MODEL = "openai/gpt-4o-mini"

const CHAT_DECISION_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

Classify the user's message into ONE type:

chat
draw
horoscope

Definitions:

chat
- explanations
- definitions
- knowledge questions
- general conversation

draw
- questions about the user's life situation
- relationship, career, decisions
- "what will happen"
- "is this good"
- "how will this go"
- updates about their situation

horoscope
- timing questions
- today / tomorrow / this month / this year
- astrology timing

Important rule:

If the user is talking about their own situation or asking how something will go,
choose "draw" even if the question is vague.

Return JSON only:

{
"type":"chat"|"draw"|"horoscope",
"assistantText":"response to the user"
}

assistantText rules:

If draw → invite the user to draw tarot cards.
If horoscope → invite horoscope reading.
Use the same language as the user.
1–2 sentences only.
`

function getChatDecisionPrompt({
    question,
    history,
}: {
    question: string
    history?: Array<{ role: "user" | "assistant"; text: string }>
}) {
    const historyText =
        history && history.length
            ? history
                  .slice(-4)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    return `
Conversation:
${historyText}

User message:
${question}

Classify the intent and return JSON.
`
}

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
        const { question, history } = body ?? {}
        const normalizedHistory = normalizeHistory(history)

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamObject({
            model: MODEL,
            schema: chatDecisionSchema,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({
                question,
                history: normalizedHistory,
            }),
        })

        result.object.then((obj) => {
            console.log("[chat/decision] type:", obj.type)
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
