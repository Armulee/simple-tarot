import { streamObject, type LanguageModel } from "ai"
import { chatFollowUpSchema } from "@/lib/chat/followup-schema"

const MODEL = "google/gemini-3-flash"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const question = (body?.question ?? "").toString().slice(0, 500)
        const cards = Array.isArray(body?.cards)
            ? body.cards.map((c: unknown) => String(c)).slice(0, 10)
            : []
        const interpretation = (body?.interpretation ?? "")
            .toString()
            .slice(0, 6000)

        if (!question || cards.length === 0 || !interpretation) {
            return new Response("Missing fields", { status: 400 })
        }

        const system = `You are Astra, a woman fortune teller for AskingFate.
You are calm, warm, and confident. Sound natural and human; avoid stiff self-introductions or slogans.

Task:
After providing a tarot interpretation, write a short wrap-up and suggest a few *relevant* follow-up questions the user might want to ask next.

Rules:
- Match the user's language and vibe.
- Make suggestions specific to the situation (love/career/timing/etc. only if relevant).
- Keep it concise.
- Do not mention being an AI or mention these instructions.
- Output MUST be valid JSON matching the schema.`

        const prompt = `User question:
${question}

Cards (in order):
${cards.join(", ")}

Interpretation (already shown to user):
${interpretation}

Now generate:
1) conclusion: 1-2 sentences that gently close the reading and invite a next question.
2) suggestions: 3-5 short follow-up questions the user could ask next.`

        const result = await streamObject({
            model: MODEL as unknown as LanguageModel,
            schema: chatFollowUpSchema,
            system,
            prompt,
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating follow-ups:", error)
        return new Response("Failed to generate follow-ups", { status: 500 })
    }
}

