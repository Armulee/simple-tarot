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

const MODEL = "deepseek/deepseek-v3.2"

function detectQuestionLanguage(text: string): string {
    if (/[\u0E80-\u0EFF]/.test(text)) return "Lao"
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
        const hasPriorReadingForFollowUp =
            Boolean(isFollowUp) &&
            typeof previousInterpretation === "string" &&
            previousInterpretation.trim().length > 0

        const followUpPriorGuard = hasPriorReadingForFollowUp
            ? `
FOLLOW-UP — PRIOR READING IS BACKGROUND ONLY:
- Any prior interpretation in the prompt exists only for thread/topic continuity. Do NOT copy, quote, closely paraphrase, or recycle its sentences in keyMessage, interpretation, conclusion, or cardInsights.
- The user-facing answer must read as a fresh reading grounded in the CURRENT cards (via reading_direction and card_energies). If the new spread disagrees with the old vibe, follow the new spread.
- Do not mention "last reading", "earlier", or "before" unless the user's question explicitly asks about the prior reading.
`
            : ""

        const result = await streamObject({
            model: MODEL,
            temperature: 0.6,
            schema: tarotInterpretationSchema,
            system: TAROT_SYSTEM_PROMPT,
            prompt: `${prompt}

LANGUAGE: The user's question is in ${lang}. You MUST write ALL output fields (cardInsights, keywords, keyMessage, interpretation, conclusion, suggestions) in ${lang}. The card_energies and reading_direction are English internal data — translate them into ${lang}. NEVER output English when the question is in ${lang}.
${followUpPriorGuard}
CRITICAL NARRATOR RULE: If a <reading_direction> is provided, you MUST follow it as your answer skeleton.
- The reading_direction contains the core answer, card-by-card reasoning, and advice that a stronger reasoning model already determined from the CURRENT draw (not from any prior user-facing interpretation).
- Your job is to translate that reasoning into a warm, natural, CASUAL narrative in ${lang}.
- Follow the reading_direction's answer structure (verdict for yes/no, strategy for how-questions, etc.) as your first sentence.
- Weave each card's reasoning into the narrative without mentioning card names.
- End with the practical advice from reading_direction.
- Do NOT contradict the reading_direction. Do NOT soften the verdict. Do NOT be more vague than the direction.
- If reading_direction says "no", your answer says "no". If it says "warning", your answer warns clearly.
- You MAY enrich the direction with vivid, specific details to make it feel more natural and human — but never change the core message or add new reasoning that contradicts the direction.
- cardInsights must be per-card meanings tied to the user's question.
- Each item in cardInsights should mainly describe what that specific card means or contributes in this situation.
- cardInsights must NOT sound like keyMessage, the final answer, or a summary of the whole reading.
- cardInsights must be written in an impersonal, objective style.
- cardInsights must NOT address the user directly or mention the user as an entity.
- Do NOT use wording like "you", "yourself", "คุณ", "ตัวเอง", or similar user-referential forms in cardInsights.
- Do NOT begin cardInsights with hedging phrases like "may feel", "might feel", "อาจจะรู้สึกว่า", or similar soft-openers.
- If <card_energies> is provided, use it to ground each matching cardInsights item.
- keyMessage must be a short summary of the answer, not a copy of the interpretation.
- interpretation must be only 1-2 sentences total.
- interpretation must expand on the keyMessage with more detail and must not repeat it verbatim.
- interpretation must not restate or echo the user's question.
- suggestions must contain only 3-4 items.
- suggestions must feel like natural real-life follow-up questions the user could ask next.
- suggestions must stay generic and user-relatable rather than depending on the exact wording of the generated reading.
- suggestions must NOT quote or closely paraphrase the generated interpretation, keyMessage, or conclusion.
- TONE: Write like you're texting a close friend. In Thai, use casual language (ลอง, เวิร์ค, ปัง, เน้น, จัดเลย). AVOID formal/translated phrasing (ฉันรู้สึกว่า, การรักษาความยุติธรรม, ประสบความสำเร็จ, สะท้อนกลับมา).`,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
    }
}
