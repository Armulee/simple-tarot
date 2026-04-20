import { streamText } from "ai"
import { z } from "zod"

const MODEL = "deepseek/deepseek-v3.2"

const requestSchema = z.object({
    question: z.string().trim().min(1),
    type: z.enum(["chat", "draw", "horoscope"]),
    isFollowUp: z.boolean().optional(),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                text: z.string(),
            }),
        )
        .optional(),
    contextSummary: z.string().nullable().optional(),
    savedBirthInfo: z.string().nullable().optional(),
})

const CHAT_RESPONSE_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

Return plain text only. Never return JSON, markdown, or quotes.

Personality: mysterious, magical, restrained, and otherworldly, like an oracle who reveals only what is necessary.
Tone: neutral and composed, never overly positive, warm, or reassuring.

CRITICAL LANGUAGE RULE:
You MUST reply in the SAME language the user wrote in.
If the user writes in English, reply in English. If Thai, reply in Thai. Never mix.
Write like a native speaker of that language. Avoid formal, robotic, or translated-sounding phrasing.

Mode rules:

If mode is chat:
- Answer the user's message directly.
- Be clear, concise, and natural.
- Keep it helpful, but not overly emotional or cheerful.
- Prefer 1-4 short sentences.

If mode is draw:
- Return EXACTLY ONE sentence.
- It MUST NOT exceed 60 characters.
- Invite the user to draw cards.
- If this is a follow-up, hint that the cards can reveal more.

If mode is horoscope:
- Return EXACTLY ONE sentence.
- It MUST NOT exceed 60 characters.
- If birth data is not available, ask for their birth date and mention that birth time helps.
- If birth data is already available, invite them to begin the horoscope reading naturally.
`

function detectQuestionLanguage(text: string): string {
    if (/[\u0E80-\u0EFF]/.test(text)) return "Lao"
    if (/[\u0E00-\u0E7F]/.test(text)) return "Thai"
    if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "Japanese"
    if (/[\uAC00-\uD7AF]/.test(text)) return "Korean"
    if (/[\u0400-\u04FF]/.test(text)) return "Russian"
    return "English"
}

function getChatResponsePrompt({
    question,
    type,
    isFollowUp,
    history,
    contextSummary,
    savedBirthInfo,
}: z.infer<typeof requestSchema>) {
    const historyText =
        history && history.length
            ? history
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings/interactions):\n${contextSummary.trim()}\n\n`
            : ""

    const detectedLang = detectQuestionLanguage(question)
    const savedBirthBlock = savedBirthInfo
        ? `Saved birth profile: available (${savedBirthInfo}).`
        : "Saved birth profile: not available."

    return `
${contextBlock}Recent conversation:
${historyText}

User message:
${question}

Response mode: ${type}
Is follow-up: ${isFollowUp ? "yes" : "no"}
${savedBirthBlock}
DETECTED LANGUAGE: The user's message is in ${detectedLang}. Ignore the language of conversation history.

Write the user-facing response now.
`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        const result = streamText({
            model: MODEL,
            system: CHAT_RESPONSE_SYSTEM_PROMPT,
            prompt: getChatResponsePrompt(body),
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat response:", error)
        return new Response("Failed to generate response", { status: 500 })
    }
}
