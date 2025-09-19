import { streamText } from "ai"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

const MODEL = "openai/gpt-4o-mini"

export async function POST(req: Request) {
    try {
        const { prompt, userId } = await req.json()
        const ipAddress = getClientIP(req as any)

        if (!prompt) {
            return new Response("User prompt is required", {
                status: 400,
            })
        }

        // Check if user has enough stars for reading (2 stars per reading)
        const readingCost = 2
        const { data: starsData, error: starsError } = await supabase
            .rpc('get_or_create_user_stars', {
                p_user_id: userId || null,
                p_ip_address: ipAddress
            })

        if (starsError) {
            console.error('Error getting user stars:', starsError)
            return new Response("Failed to check stars balance", {
                status: 500,
            })
        }

        const currentStars = starsData?.[0]?.stars || 0
        if (currentStars < readingCost) {
            return new Response(JSON.stringify({
                error: "Not enough stars",
                message: `You need ${readingCost} stars for a reading. You have ${currentStars} stars.`,
                stars: currentStars,
                required: readingCost
            }), {
                status: 402, // Payment Required
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const result = streamText({
            model: MODEL,
            maxOutputTokens: 512,
            system: `You are an expert tarot reader.

Your task: Answer the user's question directly and succinctly. Start with the direct answer in the first sentence. Avoid detours, disclaimers, or describing your process.

Style: Clear, grounded, encouraging. Use 2–5 short sentences (max ~90 words).

Constraints (default): Do not explain card symbolism, numerology, suits, spreads, upright/reversed meanings, or imagery. Do not list deep details of the cards. Mention cards only if essential and keep it brief.

Override rule: If—and only if—the user explicitly requests those specifics in their question (e.g., asks for symbolism, spread mechanics, or card meanings in detail), you may include them briefly and only to the extent requested.

Language: You MUST respond entirely in the dominant language of the user's input.`,
            prompt: `${prompt}

IMPORTANT: Please respond in the dominant language of this message.
Note: Only include card symbolism, spread mechanics, or detailed card meanings if the user's message explicitly asks for them. Otherwise, answer directly without those details.`,
        })

        // Wait for the provider's full response (contains usage)
        const usage = await result.usage
        const cost = costPerUsage(usage.inputTokens, usage.outputTokens, MODEL)
        console.log({
            input: usage.inputTokens,
            output: usage.outputTokens,
            $: cost?.toFixed(5),
            "฿": cost ? (cost * 35).toFixed(5) : 0,
        })

        // Deduct stars after successful reading
        const { data: deductStarsData, error: deductStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: userId || null,
                p_ip_address: ipAddress,
                p_amount: -readingCost, // Negative amount to deduct
                p_transaction_type: 'reading_cost',
                p_description: `Tarot reading - ${readingCost} stars`
            })

        if (deductStarsError) {
            console.error('Error deducting stars:', deductStarsError)
            // Don't fail the reading if stars deduction fails, just log it
        }

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
        return input * (0.05 / 1000000) + output * (0.4 / 1000000)
    }
    if (model === "openai/gpt-4.1-mini" && input && output) {
        return input * (0.4 / 1000000) + output * (1.6 / 1000000)
    }
    if (model === "openai/gpt-5-mini" && input && output) {
        return input * (0.25 / 1000000) + output * (2 / 1000000)
    }
    if (model === "openai/gpt-4o-mini" && input && output) {
        return input * (0.15 / 1000000) + output * (0.6 / 1000000)
    }
}
