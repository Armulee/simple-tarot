import { NextResponse } from "next/server"
import { generateText, tool } from "ai"
import { z } from "zod"
import { AGENT_SYSTEM_PROMPT } from "@/lib/agent/system-prompt"
import type { AgentAction, AgentRequestPayload, AgentResponse } from "@/types/agent"
import { MODEL } from "@/lib/ai-model"
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
            tools: {
                navigate: tool({
                    description: "Navigate the user to a specific page",
                    inputSchema: z.object({
                        page: z.string(),
                    }),
                    execute: async ({ page }): Promise<AgentAction> => ({
                        type: "NAVIGATE",
                        payload: { page },
                    }),
                }),
                drawTarotCard: tool({
                    description: "Start a tarot card draw in the chat session",
                    inputSchema: z.object({
                        count: z.number().int().min(1).max(10),
                    }),
                    execute: async ({ count }): Promise<AgentAction> => ({
                        type: "DRAW_TAROT_CARD",
                        payload: { count },
                    }),
                }),
                startReading: tool({
                    description: "Begin a tarot reading flow",
                    inputSchema: z.object({
                        type: z.enum(["love", "career", "future"]),
                    }),
                    execute: async ({ type }): Promise<AgentAction> => ({
                        type: "START_READING",
                        payload: { type },
                    }),
                }),
                openModal: tool({
                    description: "Open a UI modal by id",
                    inputSchema: z.object({
                        modalId: z.string(),
                    }),
                    execute: async ({ modalId }): Promise<AgentAction> => ({
                        type: "OPEN_MODAL",
                        payload: { modalId },
                    }),
                }),
            },
        })

        const toolResult = result.toolResults?.[0]?.output as AgentAction | undefined
        const message = (result.text ?? "").trim() || "How can I help you next?"
        const response: AgentResponse = {
            message,
            action: toolResult ?? null,
        }
        return NextResponse.json(response)
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "AGENT_REQUEST_FAILED"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
