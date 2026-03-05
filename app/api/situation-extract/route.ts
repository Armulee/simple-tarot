import { generateObject } from "ai"

import { userSituationSchema } from "@/lib/chat/situation-schema"
import { USER_SITUATION_PROMPT } from "@/lib/prompts"

const MODEL = "openai/gpt-4o-mini"

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as { question?: string }
        const question = body?.question?.trim()

        if (!question) {
            return new Response("Question is required", { status: 400 })
        }

        const { object } = await generateObject({
            model: MODEL,
            schema: userSituationSchema,
            system: USER_SITUATION_PROMPT,
            prompt: question,
            temperature: 0.3,
        })

        console.log("[situation-extract] result:", JSON.stringify(object))

        return Response.json(object)
    } catch (error) {
        console.error("Error extracting situation:", error)
        return new Response("Failed to extract situation", { status: 500 })
    }
}
