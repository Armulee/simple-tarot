import { streamObject } from "ai"
import { z } from "zod"

import { oracleReadingSchema } from "@/lib/chat/oracle-reading-schema"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"

const MODEL = "deepseek/deepseek-v3.2"

const requestSchema = z.object({
    question: z.string().trim().min(1),
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
    locale: z.string().optional(),
})

function detectQuestionLanguage(text: string): string {
    if (/[຀-໿]/.test(text)) return "Lao"
    if (/[฀-๿]/.test(text)) return "Thai"
    if (/[぀-ヿ一-鿿]/.test(text)) return "Japanese"
    if (/[가-힯]/.test(text)) return "Korean"
    if (/[Ѐ-ӿ]/.test(text)) return "Russian"
    return "English"
}

const ORACLE_SYSTEM_PROMPT = `
You are Astra, the mystical oracle voice for AskingFate. You read questions that don't fit tarot, astrology, or numerology — questions about signs, omens, energy, the universe, the higher self, intuition, soul lessons.

You are NOT a literal medium. You do NOT claim that any spirit, deceased person, ghost, angel, deity, or supernatural entity is actually communicating. You ALWAYS interpret the question symbolically and reflectively.

Tone: mystical, warm, wise, reflective, encouraging, emotionally resonant — like a candlelit reading from a trusted oracle.

CRITICAL LANGUAGE RULE: Reply in the SAME language the user wrote in. Write like a native speaker.

${PRIVACY_REDACTION_PROMPT_RULE}

FORBIDDEN PHRASES (never use these — redirect to symbolic language instead):
- "I cannot know", "There is no evidence", "I am just an AI"
- "The spirit in your room says…"
- "A ghost is present"
- "The deceased person is communicating"
- "definitely", "guaranteed", "for sure"

USE INSTEAD:
- "The symbolic message appearing through this question is…"
- "The energy surrounding this topic suggests…"
- "Symbolically…", "This may reflect…", "The reflection emerging here is…"

OUTPUT: a single oracle reading JSON object that matches the schema EXACTLY. Field order:
1) energy — one symbolic archetype.
2) energyLabel — a short decorative label in the user's language (2-6 words).
3) message — ONE powerful, quote-worthy line that delivers the heart of the reading.
4) deeperMeaning — 1-3 short paragraphs explaining the message symbolically. Plain text only.
5) guidance — 3-5 practical, empowering bullets. Each is one short sentence.
6) closing — optional final whisper. One short sentence.

Plain text only in deeperMeaning / guidance / closing — no HTML, no Markdown. The client renders the layout. Do not wrap anything in <html>, <body>, or code fences.
`

function buildPrompt(body: z.infer<typeof requestSchema>) {
    const lang = detectQuestionLanguage(body.question)
    const historyBlock =
        Array.isArray(body.history) && body.history.length > 0
            ? `\nRecent conversation (oldest first):\n${body.history
                  .slice(-10)
                  .map((m) => `- ${m.role}: ${m.text}`)
                  .join("\n")}\n`
            : ""
    const contextBlock = body.contextSummary?.trim()
        ? `\nSession context summary:\n${body.contextSummary.trim()}\n`
        : ""
    const followUpHint = body.isFollowUp
        ? "\nThis is a follow-up to the previous turn — let the new reading dance with what was just said, not repeat it.\n"
        : ""

    return `User language detected: ${lang}. Reply in ${lang}.

User question:
"""
${body.question.trim()}
"""
${historyBlock}${contextBlock}${followUpHint}
Return ONLY the oracle reading JSON.`
}

export async function POST(req: Request) {
    try {
        const raw = await req.json().catch(() => null)
        const parsed = requestSchema.safeParse(raw)
        if (!parsed.success) {
            return new Response("Invalid request body", { status: 400 })
        }
        const body = parsed.data

        const result = streamObject({
            model: MODEL,
            schema: oracleReadingSchema,
            system: ORACLE_SYSTEM_PROMPT,
            prompt: buildPrompt(body),
            onFinish: ({ object }) => {
                const incoming = summarizePrivacyPlaceholdersInText(
                    body.question,
                )
                console.log("[chat/oracle] oracle reading finished", {
                    energy: object?.energy,
                    promptPlaceholderStats: incoming,
                    isFollowUp: body.isFollowUp ?? false,
                })
            },
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating oracle reading:", error)
        return new Response("Failed to generate oracle reading", { status: 500 })
    }
}
