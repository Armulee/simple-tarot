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

const MODEL = "openai/gpt-4.1-mini"

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
        }

        const {
            question,
            cards,
            readingType,
            isFollowUp,
            previousQuestion,
            previousInterpretation,
            conversationContext: rawContext,
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

        const codexMap = await fetchTarotCodexForCards(cards)
        const topics = extractTopicsFromQuestion(question)
        const ragContext = buildRagContext(cards, codexMap, topics)

        if (ragContext) {
            prompt = `${ragContext}
---

${prompt}`
        }

        const result = await streamObject({
            model: MODEL,
            temperature: 0.8,
            schema: tarotInterpretationSchema,
            system: TAROT_SYSTEM_PROMPT,
            prompt: `${prompt}

IMPORTANT: Write EVERY field (cardInsights, keywords, interpretation, conclusion, suggestions) in the SAME language as the user's question. Infer the language ONLY from the question text—English question = English response, Thai = Thai, Spanish = Spanish, etc. Support any language. Use the reference meanings above to ground your interpretation.`,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
    }
}
