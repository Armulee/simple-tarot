import { generateObject } from "ai"

import { situationSchema } from "@/lib/chat/situation-schema"

const MODEL = "openai/gpt-4o-mini"

const USER_SITUATION_PROMPT = `
Extract the user's situation from the message.

Return JSON only:

{
"topic": "",
"intent": "",
"emotion": "",
"focus": ""
}

topic examples:
career, relationship, money, project, decision

intent examples:
reconciliation, success, change, uncertainty

emotion examples:
hope, anxiety, confusion, curiosity
`

export async function POST(req: Request) {
    try {
        let body: { question?: string }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid or empty request body", {
                status: 400,
            })
        }

        const { question } = body ?? {}
        if (!question) {
            return new Response("Question is required", { status: 400 })
        }

        const { object } = await generateObject({
            model: MODEL,
            schema: situationSchema,
            system: USER_SITUATION_PROMPT,
            prompt: question,
        })

        console.log("[situation] extracted:", object)

        return Response.json(object)
    } catch (error) {
        console.error("Error extracting situation:", error)
        return new Response("Failed to extract situation", { status: 500 })
    }
}
