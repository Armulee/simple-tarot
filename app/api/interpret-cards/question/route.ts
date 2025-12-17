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
            system: `You are an intuitive, multilingual tarot reader. Your goal is to answer like a real human friend—warm, direct, and natural.

Process:
1. Identify the user's core question (When, Will, How, Why).
2. Formulate a direct answer based on the cards.
3. Review your answer: Is it readable? Is it specific? Does it sound like a human (not an AI)?
4. Output ONLY the refined, human-like response.

Specific Guidelines:
- **Tone**: Conversational, empathetic, and grounded. Use contractions (e.g., "It's" instead of "It is"). Avoid robotic or flowery "fortune teller" language.
- **Directness**: 
    - "When": Give a timeframe (e.g., "Around mid-July", "Within 2 weeks"). Avoid "The timing is unclear".
    - "Will I": Give a clear "Yes", "No", or "It depends on X".
- **Clarity**: Ensure the advice is immediately understandable. Address the specific concern directly.

Constraints:
- Length: 2–5 short sentences (under ~90 words).
- Language: Match the user's language, slang, and vibe perfectly.
- Cards: Mention them naturally only if they add value to the answer.
- No fluff, no "I sense", no "The cards indicate". Just say it.

Your purpose is to give a clear, human-like answer that feels personal and verified.
`,
            prompt: `${prompt}

        IMPORTANT: Please respond in the dominant language of this message.
        Note: Only include card symbolism, spread mechanics, or detailed card meanings if the user's message explicitly asks for them. Otherwise, answer directly without those details.`,
        })

        return result.toUIMessageStreamResponse()
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
