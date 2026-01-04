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
