import { streamObject } from "ai"
import { getTarotReadingPrompt, TAROT_SYSTEM_PROMPT } from "@/lib/prompts"
import { tarotInterpretationSchema } from "@/lib/tarot/schema"
import {
    fetchTarotCodexForCards,
    extractTopicsFromQuestion,
    buildRagContext,
} from "@/lib/tarot/rag"
import {
    buildConversationContextPromptBlock,
    normalizeConversationContext,
} from "@/lib/astrology/question-context"

const MODEL = "openai/gpt-4o-mini"

function detectQuestionLanguage(text: string): string {
    if (/[\u0E00-\u0E7F]/.test(text)) return "Thai"
    if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "Japanese"
    if (/[\uAC00-\uD7AF]/.test(text)) return "Korean"
    if (/[\u0400-\u04FF]/.test(text)) return "Russian"
    return "English"
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            question?: string
            cards?: string[]
            readingType?: string | null
            isFollowUp?: boolean
            previousQuestion?: string | null
            previousInterpretation?: string | null
            conversationContext?: unknown
            locale?: string
            situation?: {
                topic: string
                intent: string
                emotion: string
                focus: string
                cardReadingDirection?: string
            }
            cardEnergies?: string[][]
        }

        const {
            question,
            cards,
            readingType,
            isFollowUp,
            previousQuestion,
            previousInterpretation,
            conversationContext: rawContext,
            situation,
            cardEnergies,
        } = body

        if (!question || !Array.isArray(cards) || cards.length === 0) {
            return new Response("Question and cards are required", {
                status: 400,
            })
        }

        let prompt = getTarotReadingPrompt({
            question,
            cards: cards.join(", "),
            readingType: readingType ?? null,
            isFollowUp: Boolean(isFollowUp),
            previousQuestion: previousQuestion ?? null,
            previousInterpretation: previousInterpretation ?? null,
        })
        const conversationContext = normalizeConversationContext(rawContext)
        const contextBlock =
            buildConversationContextPromptBlock(conversationContext)
        if (contextBlock && !prompt.includes("<session_context>")) {
            prompt = `${contextBlock}

---

${prompt}`
        }

        if (situation && cardEnergies && cardEnergies.length > 0) {
            const situationBlock = `<user_situation>
Topic: ${situation.topic}
Intent: ${situation.intent}
Emotion: ${situation.emotion}
Focus: ${situation.focus}
</user_situation>`

            const directionBlock = situation.cardReadingDirection
                ? `\n<reading_direction>\n${situation.cardReadingDirection}\n</reading_direction>`
                : ""

            const energyLines = cards
                .map((card, i) => {
                    const sentences = cardEnergies[i] ?? []
                    return `${card}: ${sentences.join(". ")}`
                })
                .join("\n")

            const energyBlock = `<card_energies>
${energyLines}
</card_energies>`

            prompt = `${situationBlock}
${directionBlock}

${energyBlock}

---

${prompt}`
        } else {
            const codexMap = await fetchTarotCodexForCards(cards)
            const topics = extractTopicsFromQuestion(question)
            const ragContext = buildRagContext(cards, codexMap, topics)

            if (ragContext) {
                prompt = `${ragContext}
---

${prompt}`
            }
        }

        const lang = detectQuestionLanguage(question)

        const result = await streamObject({
            model: MODEL,
            temperature: 0.6,
            schema: tarotInterpretationSchema,
            system: TAROT_SYSTEM_PROMPT,
            prompt: `${prompt}

LANGUAGE: The user's question is in ${lang}. You MUST write ALL output fields (cardInsights, keywords, interpretation, conclusion, suggestions) in ${lang}. The card_energies and reading_direction are English internal data — translate them into ${lang}. NEVER output English when the question is in ${lang}.

CRITICAL NARRATOR RULE: If a <reading_direction> is provided, you MUST follow it exactly as your answer skeleton.
- The reading_direction contains the verdict, card-by-card reasoning, and advice that a stronger reasoning model already determined.
- Your ONLY job is to translate that reasoning into a warm, natural narrative in ${lang}.
- Start with the verdict from reading_direction as your first sentence.
- Weave each card's reasoning into the narrative without mentioning card names.
- End with the practical advice from reading_direction.
- Do NOT add your own reasoning. Do NOT contradict the reading_direction. Do NOT soften the verdict. Do NOT be more vague than the direction.
- If reading_direction says "no", your answer says "no". If it says "warning", your answer warns clearly.`,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
    }
}
