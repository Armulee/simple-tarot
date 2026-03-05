import { generateObject, streamObject } from "ai"
import {
    getTarotNarratorPrompt,
    getSpreadPositions,
    TAROT_NARRATOR_SYSTEM_PROMPT,
    USER_SITUATION_PROMPT,
} from "@/lib/prompts"
import { userSituationSchema } from "@/lib/chat/situation-schema"
import { tarotNarratorSchema } from "@/lib/tarot/schema"
import {
    fetchTarotCodexForCards,
    getMeaningForSituation,
    getBaseCardName,
    isReversed,
} from "@/lib/tarot/rag"

const MODEL = "openai/gpt-4o-mini"

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
        } = body

        if (!question || !Array.isArray(cards) || cards.length === 0) {
            return new Response("Question and cards are required", {
                status: 400,
            })
        }

        const { object: situation } = await generateObject({
            model: MODEL,
            schema: userSituationSchema,
            system: USER_SITUATION_PROMPT,
            prompt: question,
            temperature: 0.3,
        })

        const codexMap = await fetchTarotCodexForCards(cards)
        const mappedMeanings: Array<{ card: string; meaning: string }> = []
        for (let i = 0; i < cards.length; i++) {
            const display = cards[i]
            const baseName = getBaseCardName(display)
            const reversed = isReversed(display)
            const row = codexMap.get(baseName)
            if (row) {
                const meaning = getMeaningForSituation(row, situation, reversed)
                mappedMeanings.push({ card: display, meaning })
            }
        }

        console.log("[interpret-cards] extracted situation:", JSON.stringify(situation))
        console.log("[interpret-cards] mapped meanings:", JSON.stringify(mappedMeanings, null, 2))

        const truncateMeaning = (text: string): string => {
            const first = text.split(/[.!?]/)[0]?.trim() ?? text
            return first.length > 80 ? `${first.slice(0, 77)}...` : first
        }
        const cardEnergies = `[${mappedMeanings.map((m) => truncateMeaning(m.meaning)).join(", ")}]`
        const positionsText = getSpreadPositions(readingType ?? null)

        const prompt = getTarotNarratorPrompt({
            question,
            topic: situation.topic,
            intent: situation.intent,
            emotion: situation.emotion,
            focus: situation.intent,
            cardEnergies,
            positions: positionsText,
        })

        const result = await streamObject({
            model: MODEL,
            temperature: 0.8,
            schema: tarotNarratorSchema,
            system: TAROT_NARRATOR_SYSTEM_PROMPT,
            prompt: `${prompt}

IMPORTANT: Write interpretation, insight, and advice in the SAME language as the user's question.`,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
    }
}
