// import { streamText } from "ai"

import { NextResponse } from "next/server"

// const MODEL = "openai/gpt-4o-mini"

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()

        if (!prompt) {
            return new Response("User prompt is required", {
                status: 400,
            })
        }

        //         const result = streamText({
        //             model: MODEL,
        //             maxOutputTokens: 512,
        //             system: `You are an expert tarot reader.

        // Your task: Answer the user's question directly and succinctly. Start with the direct answer in the first sentence. Avoid detours, disclaimers, or describing your process.

        // Style: Clear, grounded, encouraging. Use 2–5 short sentences (max ~90 words).

        // Constraints (default): Do not explain card symbolism, numerology, suits, spreads, upright/reversed meanings, or imagery. Do not list deep details of the cards. Mention cards only if essential and keep it brief.

        // Override rule: If—and only if—the user explicitly requests those specifics in their question (e.g., asks for symbolism, spread mechanics, or card meanings in detail), you may include them briefly and only to the extent requested.

        // Language: You MUST respond entirely in the dominant language of the user's input.`,
        //             prompt: `${prompt}

        // IMPORTANT: Please respond in the dominant language of this message.
        // Note: Only include card symbolism, spread mechanics, or detailed card meanings if the user's message explicitly asks for them. Otherwise, answer directly without those details.`,
        //         })

        // Wait for the provider's full response (contains usage)
        // Optionally compute usage/cost here if needed
        // console.log(
        //     costPerUsage(
        //         (await result.usage).inputTokens,
        //         (await result.usage).outputTokens
        //     )
        // )

        // return result.toUIMessageStreamResponse()
        return NextResponse.json(
            { prompt },
            {
                status: 200,
            }
        )
    } catch (error) {
        console.error("Error generating interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
    }
}

// function costPerUsage(
//     input: number | undefined,
//     output: number | undefined,
//     model: string = MODEL
// ) {
//     if (model === "openai/gpt-5-nano" && input && output) {
//         return input * (0.05 / 1000000) + output * (0.4 / 1000000)
//     }
//     if (model === "openai/gpt-4.1-mini" && input && output) {
//         return input * (0.4 / 1000000) + output * (1.6 / 1000000)
//     }
//     if (model === "openai/gpt-5-mini" && input && output) {
//         return input * (0.25 / 1000000) + output * (2 / 1000000)
//     }
//     if (model === "openai/gpt-4o-mini" && input && output) {
//         return input * (0.15 / 1000000) + output * (0.6 / 1000000)
//     }
// }
