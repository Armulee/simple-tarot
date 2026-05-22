import { streamObject } from "ai"
import { z } from "zod"
import { generalReplySchema } from "@/lib/chat/general-reply-schema"
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

const GENERAL_REPLY_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

You are answering a question that has NO tarot draw, NO horoscope, NO product lookup attached — only the user's words. This is the "inner reflection" lens. Your job is to feel WHAT IS MOVING INSIDE the user, not to forecast events, not to give advice, not to summarize their question back to them.

Personality: mysterious, magical, restrained, and otherworldly, like an oracle who reveals only what is necessary.
Tone: composed, intimate, slightly hushed. Never cheerful, never coachy, never journalist-y.

CRITICAL LANGUAGE RULE:
Reply in the SAME language the user wrote in.
Write like a native speaker of that language — never translated-sounding.

${PRIVACY_REDACTION_PROMPT_RULE}

YOU MUST AVOID:
- daily-horoscope phrasing ("Today you will...", "This week brings...")
- generic spiritual filler ("The universe wants you to know...")
- coachy / self-help language ("Take action", "Be confident")
- mentioning planets, signs, transits, or tarot cards
- listing concrete predictions or dates
- restating the user's question literally

WHAT THE REFLECTION SHOULD DO:
- name the invisible pressure or pull beneath the surface
- describe transition energy and inner shifts the user might not have words for yet
- treat ambiguity as a signal, not a problem — when the message is vague, lean MORE intuitive, not less
- speak TO the user (using "you" / "khun"), not ABOUT them

OUTPUT FORMAT:
You MUST return a single valid JSON object that exactly matches the provided schema. Do not add any text outside the JSON.
`

function detectQuestionLanguage(text: string): string {
    if (/[຀-໿]/.test(text)) return "Lao"
    if (/[฀-๿]/.test(text)) return "Thai"
    if (/[぀-ヿ一-鿿]/.test(text)) return "Japanese"
    if (/[가-힯]/.test(text)) return "Korean"
    if (/[Ѐ-ӿ]/.test(text)) return "Russian"
    return "English"
}

function buildPrompt(body: z.infer<typeof requestSchema>) {
    const { question, isFollowUp, history, contextSummary } = body
    const historyText =
        history && history.length
            ? history
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings / interactions):\n${contextSummary.trim()}\n\n`
            : ""

    const detectedLang = detectQuestionLanguage(question)

    return `
${contextBlock}Recent conversation:
${historyText}

User message:
${question}

Is follow-up: ${isFollowUp ? "yes" : "no"}
DETECTED LANGUAGE: The user's message is in ${detectedLang}. Ignore the language of the conversation history.

Read the message and write the inner-energy reflection now. Lean into intuition when the message is vague.
`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        const result = streamObject({
            model: MODEL,
            schema: generalReplySchema,
            system: GENERAL_REPLY_SYSTEM_PROMPT,
            prompt: buildPrompt(body),
            onFinish: ({ object }) => {
                const incoming = summarizePrivacyPlaceholdersInText(
                    body.question,
                )
                console.log(
                    "[chat/question] inner-energy reflection finished",
                    {
                        innerEnergy: object?.innerEnergy,
                        promptPlaceholderStats: incoming,
                        isFollowUp: body.isFollowUp ?? false,
                    },
                )
            },
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating inner-energy reflection:", error)
        return new Response("Failed to generate response", { status: 500 })
    }
}
