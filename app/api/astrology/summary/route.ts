import { streamObject } from "ai"
import { astrologySummarySchema } from "@/lib/astrology/schema"

const MODEL = "openai/gpt-4.1-mini"

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()

        if (!prompt) {
            return new Response("User prompt is required", { status: 400 })
        }

        const result = streamObject({
            model: MODEL,
            schema: astrologySummarySchema,
            system: `You are an astrology interpretation engine.

Your role is NOT to predict fate or fixed outcomes.
Your role is to ANALYZE structured astrology meaning data
and translate it into clear, grounded, decision-oriented insights.

Rules you MUST follow:
- Do NOT make absolute predictions.
- Do NOT use fear-based language.
- Do NOT say things like “you will definitely” or “cannot avoid”.
- Focus on patterns, tendencies, strengths, risks, and choices.
- Write like a calm strategic life coach, not a fortune teller.
- Base ALL analysis strictly on the provided data only.
- If data is missing, do NOT invent information.
- End the interpretation with a short invitation to continue the conversation.
- Include 1-2 concrete "what to ask next" examples naturally in the interpretation.
- Keep those next-question examples concise and practical.

Tone:
- Clear
- Grounded
- Intelligent
- Respectful
- Actionable

Goal:
Help the user understand how to USE this life pattern wisely.
`,
            prompt: `${prompt}

IMPORTANT: Respond in the language of the user's question, ignoring the English template text.
`,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating astrology summary:", error)
        return new Response("Failed to generate summary", { status: 500 })
    }
}


