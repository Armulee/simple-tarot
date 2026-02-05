import { NextResponse } from "next/server"
import { generateText } from "ai"
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt"
import { parseAgentResponse } from "@/lib/agent/parse"
import type { AgentRequestPayload } from "@/types/agent"

const MODEL = "openai/gpt-4.1-mini"
const MAX_MESSAGES = 30

function buildPrompt(payload: AgentRequestPayload) {
    const messages = payload.messages.slice(-MAX_MESSAGES)
    const history = messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n")

    const eventSection = payload.event
        ? `\nEvent:\n${JSON.stringify(payload.event)}\n`
        : ""

    return `Context:
${JSON.stringify(payload.context)}
${eventSection}
Conversation:
${history}

Respond with valid JSON only.`
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as AgentRequestPayload
        if (!body || !Array.isArray(body.messages) || !body.context) {
            return NextResponse.json(
                { error: "INVALID_REQUEST" },
                { status: 400 }
            )
        }

        const prompt = buildPrompt(body)
        const result = await generateText({
            model: MODEL,
            temperature: 0.4,
            maxOutputTokens: 600,
            system: AGENT_SYSTEM_PROMPT,
            prompt,
        })

        const response = parseAgentResponse(result.text ?? "")
        return NextResponse.json(response)
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "AGENT_REQUEST_FAILED"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
