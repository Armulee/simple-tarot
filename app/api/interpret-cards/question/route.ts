import { streamText } from "ai"

const MODEL = "openai/gpt-4o-mini"

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
            maxOutputTokens: 512,
            system: `You are an expert tarot reader.

        Your task: Answer the user's question directly and succinctly. Start with the direct answer in the first sentence. Avoid detours, disclaimers, or describing your process.

        Style: Clear, groundedม answer directly to the question. Use 2–5 short sentences (max ~90 words).

        Constraints (default): Do not explain card symbolism, numerology, suits, spreads, upright/reversed meanings, or imagery. Do not list deep details of the cards. Mention cards only if essential and keep it brief.

        Override rule: If—and only if—the user explicitly requests those specifics in their question (e.g., asks for symbolism, spread mechanics, or card meanings in detail), you may include them briefly and only to the extent requested.

        Silent reasoning step (do not show):
        1) Classify the user's question intent into one of: love/relationships, work/career, finances, health/wellbeing, personal growth, spiritual, general/other.
        2) Map the provided cards to that intent and prioritize facets that are relevant to the classified intent.

        Important: Do not fetch or cite external sources. Do not reference websites. Do not reveal your classification or internal steps; output only the final answer paragraph.

        Language: You MUST respond entirely in the dominant language of the user's input.`,
            prompt: `${prompt}

        IMPORTANT: Please respond in the dominant language of this message.
        Note: Only include card symbolism, spread mechanics, or detailed card meanings if the user's message explicitly asks for them. Otherwise, answer directly without those details.`,
        })

        // 3) If the mapping is weak or ambiguous, do not force symbolism; provide grounded, practical guidance that still answers the question.

        // Log cost calculation immediately without waiting
        console.log(
            "Cost calculation:",
            costPerUsage(undefined, undefined, MODEL)
        )

        // Log actual usage asynchronously without blocking streaming
        result.usage
            .then((usage) => {
                const inputTokens = usage?.inputTokens
                const outputTokens = usage?.outputTokens
                const estimatedCost = costPerUsage(
                    inputTokens,
                    outputTokens,
                    MODEL
                )
                console.log("AI usage", {
                    model: MODEL,
                    inputTokens,
                    outputTokens,
                    estimatedCostUSD: estimatedCost,
                })
            })
            .catch(() => {})

        return result.toUIMessageStreamResponse()
    } catch (error) {
        console.error("Error generating interpretation:", error)
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
    if (model === "openai/gpt-5-nano" && input && output) {
        return {
            input,
            output,
            cost: input * (0.05 / 1000000) + output * (0.4 / 1000000),
        }
    }
    if (model === "openai/gpt-4.1-mini" && input && output) {
        return input * (0.4 / 1000000) + output * (1.6 / 1000000)
    }
    if (model === "openai/gpt-5-mini" && input && output) {
        return input * (0.25 / 1000000) + output * (2 / 1000000)
    }
    if (model === "openai/gpt-5" && input && output) {
        return input * (1.25 / 1000000) + output * (10.0 / 1000000)
    }
    if (model === "openai/gpt-4o-mini" && input && output) {
        return input * (0.15 / 1000000) + output * (0.6 / 1000000)
    }
}
