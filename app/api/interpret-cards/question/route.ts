import { streamObject } from "ai"
import { TAROT_SYSTEM_PROMPT } from "@/lib/prompts"
import { tarotInterpretationSchema } from "@/lib/tarot/schema"
import {
    fetchMeaningsForCards,
    extractTopicsFromQuestion,
    buildArticleContext,
} from "@/lib/tarot/rag"
import {
    buildConversationContextPromptBlock,
    normalizeConversationContext,
} from "@/lib/astrology/question-context"

const MODEL = "google/gemini-2.0-flash"

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            prompt?: string
            question?: string
            cards?: string[]
            conversationContext?: unknown
            locale?: string
        }

        const {
            prompt: rawPrompt,
            question,
            cards,
            conversationContext: rawContext,
            locale = "en",
        } = body

        let prompt = rawPrompt ?? ""
        const conversationContext = normalizeConversationContext(rawContext)
        const contextBlock =
            buildConversationContextPromptBlock(conversationContext)
        if (contextBlock && !prompt.includes("Session context:")) {
            prompt = `${contextBlock}

---

${prompt}`
        }

        if (question && Array.isArray(cards) && cards.length > 0) {
            const meaningsMap = await fetchMeaningsForCards(cards, locale)
            const topics = extractTopicsFromQuestion(question)
            const articleContext = buildArticleContext(cards, meaningsMap, topics)

            if (articleContext) {
                prompt = `${articleContext}

---

${prompt}`
            }
        }

        if (!prompt.trim()) {
            return new Response("Prompt is required", { status: 400 })
        }

        const result = await streamObject({
            model: MODEL,
            temperature: 0.8,
            maxOutputTokens: 4000,
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
