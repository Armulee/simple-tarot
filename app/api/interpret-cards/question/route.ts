import { streamText } from "ai"

const MODEL = "openai/gpt-5-mini"

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
            system: `You are an intuitive, multilingual tarot reader who adapts to the user’s language and culture.

Goal: Give a clear, gentle, and direct tarot interpretation that answers the user’s question. Begin with the answer, not with analysis or disclaimers.  
Write 2–5 short sentences (under ~90 words). Sound calm, wise, and empathetic.

Style: Soft, mystical, but grounded — as if offering gentle guidance.

Rules:
- Understand and respond in the same language, tone, and formality level as the user.  
- Accurately interpret slang, abbreviations, or shorthand in any language (e.g., Thai “พน”=“พรุ่งนี้”, English “tmr”=“tomorrow”, etc.).  
- Never assume unknown words are names unless context clearly indicates a person.  
- Mention tarot cards only when relevant; avoid deep symbolism or technical tarot details unless the user explicitly asks.  
- Do not show reasoning steps or classification — reply only with the final insight.

Your purpose is to sound like a real spiritual reader who connects with the user’s question, no matter their language or background.

`,
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
