import type { AgentAction, AgentResponse } from "@/types/agent"
import { AGENT_ACTION_REGISTRY } from "@/lib/agent/actions"

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidAction(action: unknown): action is AgentAction {
    if (!isPlainObject(action)) return false
    if (typeof action.type !== "string") return false
    if (!(action.type in AGENT_ACTION_REGISTRY)) return false
    if (!isPlainObject(action.payload)) return false

    if (action.type === "NAVIGATE") {
        return typeof action.payload.page === "string"
    }
    if (action.type === "DRAW_TAROT_CARD") {
        return (
            typeof action.payload.count === "number" &&
            Number.isFinite(action.payload.count) &&
            action.payload.count > 0
        )
    }
    if (action.type === "START_READING") {
        return (
            action.payload.type === "love" ||
            action.payload.type === "career" ||
            action.payload.type === "future"
        )
    }
    if (action.type === "OPEN_MODAL") {
        return typeof action.payload.modalId === "string"
    }
    return false
}

export function parseAgentResponse(raw: string): AgentResponse {
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error("Agent response is not valid JSON")
    }

    if (!isPlainObject(parsed)) {
        throw new Error("Agent response must be an object")
    }

    if (typeof parsed.message !== "string") {
        throw new Error("Agent response missing message")
    }

    if (parsed.action === null) {
        return { message: parsed.message, action: null }
    }

    if (!isValidAction(parsed.action)) {
        throw new Error("Agent response has invalid action")
    }

    return { message: parsed.message, action: parsed.action }
}
