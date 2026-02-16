import { streamObject, type LanguageModel } from "ai"
import { TAROT_SYSTEM_PROMPT } from "@/lib/prompts"
import { tarotInterpretationSchema } from "@/lib/tarot/schema"

const MODEL = "openai/gpt-4o-mini"

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json()

        if (!prompt) {
            return new Response("User prompt is required", {
                status: 400,
            })
        }

        const result = await streamObject({
            model: MODEL as unknown as LanguageModel,
            maxOutputTokens: 4000,
            schema: tarotInterpretationSchema,
            system: TAROT_SYSTEM_PROMPT,
            prompt: `${prompt}

        IMPORTANT: Respond in the language of the user's question`,
        })

        return result.toTextStreamResponse()
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
//         return {
//             input,
//             output,
//             cost: input * (0.05 / 1000000) + output * (0.4 / 1000000),
//         }
//     }
//     if (model === "openai/gpt-4.1-mini" && input && output) {
//         return input * (0.4 / 1000000) + output * (1.6 / 1000000)
//     }
//     if (model === "openai/gpt-5-mini" && input && output) {
//         return input * (0.25 / 1000000) + output * (2 / 1000000)
//     }
//     if (model === "openai/gpt-5" && input && output) {
//         return input * (1.25 / 1000000) + output * (10.0 / 1000000)
//     }
//     if (model === "openai/gpt-4o-mini" && input && output) {
//         return input * (0.15 / 1000000) + output * (0.6 / 1000000)
//     }
// }
