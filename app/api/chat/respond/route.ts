import { streamText } from "ai"
import { z } from "zod"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"
import { createReasoningStreamResponse } from "@/lib/chat/reasoning-stream"
import { deepseekThinking } from "@/lib/chat/model-options"

const MODEL = "deepseek/deepseek-v4-pro"

const requestSchema = z.object({
    question: z.string().trim().min(1),
    type: z.enum(["chat", "draw", "horoscope", "support"]),
    isFollowUp: z.boolean().optional(),
    supportTopic: z.string().nullable().optional(),
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

${PRIVACY_REDACTION_PROMPT_RULE}

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
- Invite them to begin the horoscope reading naturally.
- Do not ask for birth date or birth time.

If mode is support:
- The user is asking about the AskingFate website / product, NOT for a reading.
- An inline tool block (pricing, contact form, tarot card hero, article preview, etc.) will be rendered for them automatically below your reply.
- Return 1-2 short sentences (max 220 characters total) that ACKNOWLEDGE the topic and invite them to explore the block below.
- Do NOT repeat all the details that will be in the block (e.g. plan prices, full FAQ answers). Stay brief and oracle-like.
- Do NOT include URLs, markdown links, or asterisks. Plain text only.
- Examples:
  - pricing: "Our plans live below. Tap one to continue to checkout."
  - contact: "Send your message in the form below — we read every line."
  - tarot-card (seven of cups): "The Seven of Cups speaks of choices and illusion. Its full meaning waits below."
  - faq: "I gathered the common answers for you below."
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
    supportTopic,
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
${contextBlock}Recent conversation (background only):
${historyText}

Current user message (reply to THIS message only):
${question}

Response mode: ${type}
Is follow-up: ${isFollowUp ? "yes" : "no"}
${type === "support" && supportTopic ? `Support topic: ${supportTopic}\n` : ""}${savedBirthBlock}
DETECTED LANGUAGE: The user's message is in ${detectedLang}. Ignore the language of conversation history.
ANSWER TARGET: The conversation and session context above are background only — use them to understand what an ambiguous message refers to and to keep continuity. Never re-answer an older question from the history; if history and the current message conflict, the current message wins.

Write the user-facing response now.
`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        // Draw/horoscope replies are a single short "invite" sentence, so
        // thinking there only adds latency. Enable chain-of-thought (for the
        // live thinking headline) only for the substantive chat/support replies.
        const enableThinking = body.type === "chat" || body.type === "support"

        const result = streamText({
            model: MODEL,
            providerOptions: deepseekThinking(enableThinking, "low"),
            system: CHAT_RESPONSE_SYSTEM_PROMPT,
            prompt: getChatResponsePrompt(body),
            onFinish: ({ text }) => {
                const out = summarizePrivacyPlaceholdersInText(text)
                const incoming = summarizePrivacyPlaceholdersInText(
                    body.question,
                )
                console.log(
                    "[chat/respond] route → short reply finished; privacy token check",
                    {
                        type: body.type,
                        isFollowUp: body.isFollowUp ?? false,
                        promptPlaceholderStats: incoming,
                        modelOutputPlaceholderStats: out,
                    },
                )
                if (process.env.NODE_ENV === "development") {
                    console.log(
                        "[chat/respond] full reply text (dev only):",
                        text,
                    )
                }
            },
        })

        // Stream reasoning (chain-of-thought) and content on separate channels
        // so the client can render the live "thinking" headline before the
        // answer text begins.
        return createReasoningStreamResponse(result)
    } catch (error) {
        console.error("Error generating chat response:", error)
        return new Response("Failed to generate response", { status: 500 })
    }
}
