import { streamText } from "ai"
import { z } from "zod"
import { resolveResponseLanguage } from "@/lib/i18n/ai-language"

import { createReasoningStreamResponse } from "@/lib/chat/reasoning-stream"
import { deepseekThinking } from "@/lib/chat/model-options"
import { PRIVACY_REDACTION_PROMPT_RULE } from "@/lib/privacy/prompt-redaction"
import {
    buildRagContext,
    extractTopicsFromQuestion,
    fetchTarotCodexForCards,
} from "@/lib/tarot/rag"

const MODEL = "deepseek/deepseek-v4-pro"

const requestSchema = z.object({
    question: z.string().trim().min(1),
    locale: z.string().optional(),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                text: z.string(),
            }),
        )
        .optional(),
    contextSummary: z.string().nullable().optional(),
    /** The question the previous tarot reading answered. */
    previousQuestion: z.string().nullable().optional(),
    /** Display names of the cards drawn, in order (e.g. "The Tower (Reversed)"). */
    cards: z.array(z.string()).optional(),
    /** Spread label used for the previous reading (simple/general/...). */
    readingType: z.string().nullable().optional(),
    /** The previous reading's user-facing conclusion (headline + body + next step). */
    previousInterpretation: z.string().nullable().optional(),
})

const EXPLAIN_SYSTEM_PROMPT = `
You are Astra, the tarot oracle for AskingFate.

The user is questioning the REASONING behind a previous tarot reading ("why did the cards say that?", "ทำไมไพ่ถึงบอกแบบนี้", "how did you conclude that?"). Your ONLY job in this call is to EXPLAIN that reading, grounded in the actual cards that were drawn and their meanings — never to do a new draw, never to invent a different verdict, never to contradict the previous reading.

Return plain text only. No JSON, no markdown, no headings, no bullet lists.

FORMAT — LIGHT, SCANNABLE PARAGRAPHS (binding):
- Break the reply into 3-5 SHORT paragraphs separated by ONE blank line.
- Each paragraph carries ONE idea in 1-3 short sentences. NEVER write a paragraph longer than 3 sentences — a wall of text is a failure.
- Natural shape: (1) the direct one-line answer to their "why"; (2) what the key card(s) contributed and why; (3) how those cards combined into the conclusion they saw; (4) one short grounding takeaway.
- Keep the whole reply compact: roughly 6-10 short sentences across all paragraphs.

UNLIKE THE READING ITSELF, NAMING THE CARDS HERE IS THE POINT:
- DO name the specific cards and their position/orientation when it explains the logic ("The Tower reversed in the outcome spot is why it leaned toward avoided disruption", "ที่ไพ่ The Lovers ออกมาเลยบอกว่า...").
- Tie each named card to the user's actual question domain (love / career / money / decision) using the reference meanings provided — do not recite generic textbook lines.
- Use at most the 2-3 cards that actually drove the conclusion; don't walk through every card mechanically.

CRITICAL LANGUAGE RULE: reply in the SAME language the user wrote in. Write like a native speaker — casual and natural, never translated-sounding. In Thai, keep sentences short and spoken-style (ประโยคสั้นๆ เหมือนพิมพ์คุยกัน), not long formal clauses.

${PRIVACY_REDACTION_PROMPT_RULE}

HOW TO REASON (silently, before writing):
- <previous_reading> is the reading the user is questioning: the question, the cards drawn (in order), and the conclusion they were given.
- <card_meanings> are the reference meanings for those exact cards (upright/reversed as drawn). Use them to justify WHY the reading landed where it did.
- Find the 1-2 cards that most decided the verdict and explain their pull honestly. If a card is ambiguous or the reading was a soft "maybe", say so — never overstate certainty to defend the verdict.
- If no card meanings are provided, explain the logic from the previous conclusion and the cards' names alone, without inventing meanings.

TONE: a knowledgeable friend explaining their thinking — warm, candid, concrete. Phrase everything as tendencies and signals ("leans", "tends to", "points toward"), never absolutes ("definitely", "guaranteed", "แน่นอน", "ฟันธง").
End with ONE short grounding takeaway sentence — what the spread, taken together, was really pointing at.
`

function buildPrompt(
    body: z.infer<typeof requestSchema>,
    ragContext: string,
) {
    const lang = resolveResponseLanguage(body.locale, body.question)
    const historyText =
        body.history && body.history.length
            ? body.history
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"
    const contextBlock = body.contextSummary?.trim()
        ? `Session context (background only):\n${body.contextSummary.trim()}\n\n`
        : ""

    const cardsList =
        body.cards && body.cards.length
            ? body.cards.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
            : "  (cards unavailable)"

    return `${contextBlock}Recent conversation (background only):
${historyText}

<previous_reading>
Question it answered: ${body.previousQuestion?.trim() || "(unknown)"}
Spread: ${body.readingType?.trim() || "(unspecified)"}
Cards drawn (in order):
${cardsList}
Conclusion the user was given:
${body.previousInterpretation?.trim() || "(summary unavailable)"}
</previous_reading>

${ragContext ? `<card_meanings>\n${ragContext}\n</card_meanings>\n\n` : ""}Current user message (ANSWER THIS — they want the WHY, explained from the cards above; history is background only):
${body.question}

DETECTED LANGUAGE: The user's message is in ${lang}. Write the entire reply in ${lang}.

Write the explanation paragraph(s) now.`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        // Ground the explanation in the real codex meanings for the exact
        // cards that were drawn (upright/reversed as drawn), filtered to the
        // domain of the original question. Failures degrade to a meaning-less
        // explanation built from the conclusion + card names.
        let ragContext = ""
        if (body.cards && body.cards.length > 0) {
            try {
                const codexMap = await fetchTarotCodexForCards(body.cards)
                const topics = extractTopicsFromQuestion(
                    body.previousQuestion || body.question,
                )
                ragContext = buildRagContext(body.cards, codexMap, topics)
            } catch (error) {
                console.error("[tarot/explain] codex fetch failed:", error)
            }
        }

        const result = streamText({
            model: MODEL,
            // The point of this route is the model REASONING over the spread
            // before answering, so thinking runs at medium effort and streams
            // on the reasoning channel.
            providerOptions: deepseekThinking(true, "medium"),
            system: EXPLAIN_SYSTEM_PROMPT,
            prompt: buildPrompt(body, ragContext),
            onFinish: () => {
                console.log("[tarot/explain] explanation finished", {
                    cardCount: body.cards?.length ?? 0,
                    groundedInCodex: Boolean(ragContext),
                })
            },
        })

        return createReasoningStreamResponse(result)
    } catch (error) {
        console.error("Error generating tarot explanation:", error)
        return new Response("Failed to generate explanation", { status: 500 })
    }
}
