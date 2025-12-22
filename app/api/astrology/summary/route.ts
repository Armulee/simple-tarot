import { streamText } from "ai"

const MODEL = "openai/gpt-4.1-mini"

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()

        if (!prompt) {
            return new Response("User prompt is required", { status: 400 })
        }

        const result = streamText({
            model: MODEL,
            system: `You are an expert astrologer.

Goal: Write a transit-based horoscope using BOTH the user's birth chart snapshot and the current transit snapshot.

If the user asked a question, answer it directly using transit timing + natal themes.
If no question, give a general but specific-feeling forecast.

Length: 3–6 short paragraphs (about 120–220 words total).

Style:
- Clear, encouraging, practical
- Astrological but accessible
- Not fatalistic; provide options and guidance
- Use bullet points only if it improves clarity

Rules:
- If the prompt includes a line like "Preferred response language: <Language> (<locale>)", follow it.
- Otherwise, respond in the dominant language of the user's message.
- Ground claims in the provided chart data (planets, houses) without dumping raw JSON.
`,
            prompt: `${prompt}

IMPORTANT: Please respond in the dominant language of this message.
`,
        })

        // Log usage async (best-effort)
        result.usage
            .then((usage) => {
                const inputTokens = usage?.inputTokens
                const outputTokens = usage?.outputTokens
                const estimatedCost = costPerUsage(
                    inputTokens,
                    outputTokens,
                    MODEL
                )
                console.log("AI usage (Astrology Summary)", {
                    model: MODEL,
                    inputTokens,
                    outputTokens,
                    estimatedCostUSD: estimatedCost,
                })
            })
            .catch(() => {})

        return result.toUIMessageStreamResponse()
    } catch (error) {
        console.error("Error generating astrology summary:", error)
        return new Response("Failed to generate summary", { status: 500 })
    }
}

function costPerUsage(
    input: number | undefined,
    output: number | undefined,
    model: string = MODEL
) {
    if (model === "openai/gpt-4.1-mini" && input && output) {
        return input * (0.4 / 1000000) + output * (1.6 / 1000000)
    }
    return 0
}
