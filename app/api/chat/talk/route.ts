import { streamObject } from "ai"
import { z } from "zod"

import { talkReplySchema } from "@/lib/chat/talk-schema"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"
import { deepseekThinking } from "@/lib/chat/model-options"

const MODEL = "deepseek/deepseek-v4-pro"

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

const TALK_SYSTEM_PROMPT = `
You are Astra, the oracle for AskingFate — but right now the user is just TALKING to you, not asking for a reading. They don't want a tarot draw, a horoscope, a prediction, or a mystical interpretation. They want a gentle, human conversation.

Your job: answer them warmly and naturally, like a calm, caring companion who knows them. Then gently offer a few things they could explore next.

CRITICAL LANGUAGE RULE:
Reply in the SAME language the user wrote in. Write like a native speaker — casual, warm, natural. Never translated-sounding, never formal/robotic.

${PRIVACY_REDACTION_PROMPT_RULE}

WHAT TO DO:
- Acknowledge what they actually said and meet the feeling behind it (lonely, curious, grateful, tired, playful…).
- If they refer to something from earlier in the conversation, answer from the conversation history you are given — stay on that thread.
- Keep it short and real: 2-4 short sentences. Use a blank line between paragraphs only if it genuinely helps.
- End by gently proposing a couple of things they could ask or look at next (these go in the \`suggestions\` field as tappable questions) — framed as an invitation, never pressure.

WHAT NOT TO DO:
- Do NOT give a tarot reading, horoscope, daily energy, fortune, or prediction.
- Do NOT produce a mystical "inner energy" reflection or use astrology/tarot jargon (no planets, signs, houses, cards, aspects).
- Do NOT pitch the product, plans, pricing, or sign-up. No support/marketing.
- Do NOT lecture or give a long list of advice. Stay conversational.
- Do NOT invent facts about the user that aren't in the conversation.

OUTPUT: a single JSON object matching the schema (reply + suggestions). Nothing else.
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
                  .slice(-8)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"
    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings / interactions — background for continuity):\n${contextSummary.trim()}\n\n`
            : ""
    const detectedLang = detectQuestionLanguage(question)

    return `
${contextBlock}Recent conversation:
${historyText}

Current user message (reply to THIS, gently and conversationally):
${question}

Is follow-up: ${isFollowUp ? "yes" : "no"}
DETECTED LANGUAGE: The user's message is in ${detectedLang}. Write the entire reply and all suggestions in ${detectedLang}.
ANSWER TARGET: They are just talking with you — answer warmly, lean on the conversation history if they're referring back to it, and propose a few inviting next questions. No reading, no prediction, no product talk.

Write the conversational reply now.
`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        const result = streamObject({
            model: MODEL,
            schema: talkReplySchema,
            system: TALK_SYSTEM_PROMPT,
            prompt: buildPrompt(body),
            providerOptions: deepseekThinking(false),
            onFinish: ({ object }) => {
                console.log("[chat/talk] conversational reply finished", {
                    isFollowUp: body.isFollowUp ?? false,
                    suggestionCount: object?.suggestions?.length ?? 0,
                    promptPlaceholderStats: summarizePrivacyPlaceholdersInText(
                        body.question,
                    ),
                })
            },
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating conversational reply:", error)
        return new Response("Failed to generate reply", { status: 500 })
    }
}
