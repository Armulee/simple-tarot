import { generateObject } from "ai"

import { situationSchema } from "@/lib/chat/situation-schema"
import { supabaseAdmin } from "@/lib/supabase"
import type { TarotCodexRow } from "@/lib/tarot/rag"
import { getBaseCardName, isReversed } from "@/lib/tarot/rag"

const MODEL = "openai/gpt-4o-mini"

const USER_SITUATION_PROMPT = `
Extract the user's situation from the message.

Return JSON only:

{
"topic": "",
"intent": "",
"emotion": "",
"focus": ""
}

topic examples:
career, relationship, money, project, decision

intent examples:
reconciliation, success, change, uncertainty

emotion examples:
hope, anxiety, confusion, curiosity
`

const LOVE_TOPICS = ["relationship", "love", "dating", "romance", "marriage", "partner", "ex"]
const CAREER_TOPICS = ["career", "job", "work", "project", "business", "promotion"]
const FINANCIAL_TOPICS = ["money", "financial", "finance", "wealth", "investment", "debt"]

function pickMeaning(row: TarotCodexRow, topic: string, reversed: boolean): string {
    const t = topic.toLowerCase()

    if (LOVE_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_love : row.meaning_love
        if (val) return val
    }
    if (CAREER_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_career : row.meaning_career
        if (val) return val
    }
    if (FINANCIAL_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_financial : row.meaning_financial
        if (val) return val
    }

    return reversed ? row.reversed_meaning_general : row.meaning_general
}

function splitIntoSentences(text: string): string[] {
    return text
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean)
}

export async function POST(req: Request) {
    try {
        let body: { question?: string; cards?: string[] }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid or empty request body", {
                status: 400,
            })
        }

        const { question, cards } = body ?? {}
        if (!question) {
            return new Response("Question is required", { status: 400 })
        }

        const { object: situation } = await generateObject({
            model: MODEL,
            schema: situationSchema,
            system: USER_SITUATION_PROMPT,
            prompt: question,
        })

        console.log("[situation] extracted:", situation)

        let cardMeanings: string[][] = []

        if (cards && cards.length > 0 && supabaseAdmin) {
            const baseNames = [...new Set(cards.map(getBaseCardName))]
            const { data, error } = await supabaseAdmin
                .from("tarot_codex")
                .select("*")
                .in("card_name", baseNames)

            if (error) {
                console.error("[situation] tarot_codex fetch error:", error)
            }

            const codexMap = new Map<string, TarotCodexRow>()
            for (const row of data ?? []) {
                codexMap.set(row.card_name, row as TarotCodexRow)
            }

            cardMeanings = cards.map((cardDisplay) => {
                const baseName = getBaseCardName(cardDisplay)
                const reversed = isReversed(cardDisplay)
                const row = codexMap.get(baseName)
                if (!row) return []
                const meaning = pickMeaning(row, situation.topic, reversed)
                return splitIntoSentences(meaning)
            })
        }

        return Response.json({ ...situation, cardMeanings })
    } catch (error) {
        console.error("Error extracting situation:", error)
        return new Response("Failed to extract situation", { status: 500 })
    }
}
