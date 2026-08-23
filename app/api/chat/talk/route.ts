import { streamObject } from "ai"
import { z } from "zod"

import { talkReplySchema } from "@/lib/chat/talk-schema"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"
import { deepseekThinking } from "@/lib/chat/model-options"
import { buildAstraSystemPrompt } from "@/lib/prompts/astra"
import { resolveResponseLanguage } from "@/lib/i18n/ai-language"

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

/**
 * Route-specific instructions only. The voice — short bubbles, no hedging, no
 * lists, verdict before mechanism, never an AI — comes from the shared persona
 * in `lib/prompts/astra.ts` and is not restated here.
 */
const TALK_TASK = `The person is TALKING to you, not asking for a reading: no draw, no horoscope, no prediction this turn. Receive what they said, answer it, and keep the conversation moving.

MODERN REGISTER (binding): the fortune-teller presence lives in the tone, never in archaic grammar. In Thai always use modern spoken Thai with ฉัน/คุณ — never ข้า, เจ้า, ดั่ง, เยี่ยง, or any costume-drama register. The same rule holds in every language.

${PRIVACY_REDACTION_PROMPT_RULE}

WHAT TO DO:
- Answer what they actually said, and name the feeling under it when there is one.
- When they refer back to something earlier, answer from the conversation history you were given.
- Keep the whole reply to 2-4 short sentences. Break a paragraph only when it genuinely helps.
- Offer a couple of things they could ask next in the \`suggestions\` field — tappable, short, in their language.

WHAT NOT TO DO:
- No reading, fortune, daily energy, or prediction this turn.
- No astrology or tarot jargon: no planets, signs, houses, cards, or aspects.
- No product, plan, pricing, or sign-up talk.
- Never invent facts about them that are not in the conversation.

OUTPUT: one JSON object matching the schema (reply + suggestions). Nothing else.`

const TALK_SYSTEM_PROMPT = buildAstraSystemPrompt({ task: TALK_TASK })

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
    const detectedLang = resolveResponseLanguage(body.locale, question)

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
            // 'json' mode streams partial fields token-by-token; the default
            // 'auto' often resolves to tool-call mode for DeepSeek, which
            // buffers the whole object and makes the reply "pop in" at once.
            mode: "json",
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
