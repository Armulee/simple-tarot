import { streamText } from "ai"

const MODEL = "openai/gpt-4.1-mini"

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()

        if (!prompt) {
            return new Response("User prompt is required", {
                status: 400,
            })
        }

        const result = streamText({
            model: MODEL,
            system: `You are an expert astrologer.
            
Goal: Answer the user's question based on their birth chart details provided in the prompt.
Write 2–5 short sentences (under ~100 words). Sound insightful, encouraging, and clear.

Style: Personal, astrological but accessible.

Rules:
- Understand and respond in the same language as the user.
- Use the provided birth chart data (planets, houses) to justify your answer.
- Focus on the specific question asked.
- Do not be fatalistic; offer guidance and possibilities.
`,
            prompt: `${prompt}

            IMPORTANT: Respond in the language of the user's question, ignoring the English template text.
            `,
        })

        // Log actual usage asynchronously
        result.usage
            .then((usage) => {
                const inputTokens = usage?.inputTokens
                const outputTokens = usage?.outputTokens
                const estimatedCost = costPerUsage(
                    inputTokens,
                    outputTokens,
                    MODEL
                )
                console.log("AI usage (Birth Chart)", {
                    model: MODEL,
                    inputTokens,
                    outputTokens,
                    estimatedCostUSD: estimatedCost,
                })
            })
            .catch(() => {})

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating birth chart interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
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
    // Fallback for other models
    return 0
}
