import { streamObject } from "ai"

import { chatDecisionSchema } from "@/lib/chat/decision-schema"

const MODEL = "openai/gpt-4o-mini"

const CHAT_DECISION_SYSTEM_PROMPT = `
You are Astra, a warm and intuitive oracle for AskingFate.

Your job is ONLY to classify the user's message into ONE of these types:

1. "chat"
   - explanations
   - knowledge questions
   - general conversation

2. "draw"
   - tarot reading about a situation
   - "Will this happen?"
   - "Should I do this?"
   - relationship or life outcome questions

3. "horoscope"
   - timing questions
   - astrology predictions
   - questions about today, this month, this year, or "when"

Decision rules:

Use "horoscope" if the user asks:
- when something will happen
- about today / tomorrow / this month / this year
- about astrology or birth chart predictions

Use "draw" if the user asks:
- whether something will happen
- relationship or life outcome
- advice about a situation

Use "chat" for:
- explanations
- definitions
- casual conversation

If unsure → choose "draw".

Return ONLY valid JSON:

{
"type":"chat" | "draw" | "horoscope",
"assistantText":"response to the user"
}

assistantText rules:
- same language as the user
- 1–2 sentences
- warm and natural tone

If type="draw":
invite the user to draw tarot cards.

If type="horoscope":
invite the user to check their horoscope.
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
