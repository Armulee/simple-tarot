type MessageShape = {
    role?: "user" | "assistant" | string
    text?: string
    variant?: "plain" | "box" | "horoscope" | "tool" | string
    isLoading?: boolean
}

export type ConversationContextPayload = {
    userMainPoint: string
    userMessageTimeline: string[]
    assistantSummaryTimeline: string[]
    contextText: string
    totalMessages: number
}

const MAX_ITEMS = 12
const MAX_LINE = 240
const MAX_CONTEXT_TEXT = 1800

function cleanText(value: string) {
    return value.replace(/\s+/g, " ").trim()
}

function shorten(value: string, max = MAX_LINE) {
    if (value.length <= max) return value
    return `${value.slice(0, max - 3).trim()}...`
}

function isNoiseMessage(message: MessageShape) {
    if (!message.text?.trim()) return true
    if (message.variant === "tool") return true
    if (message.isLoading) return true
    return false
}

function buildMainPoint(userTimeline: string[], currentQuestion?: string) {
    const current = cleanText(currentQuestion ?? "")
    const latestUser = userTimeline[userTimeline.length - 1] ?? ""
    const anchor = current || latestUser
    const prior = userTimeline.filter((item) => item !== anchor).slice(-2)
    if (!anchor && prior.length === 0) return ""
    if (prior.length === 0) return anchor
    return `${anchor} | Related context: ${prior.join(" | ")}`
}

export function buildConversationContextFromMessages(
    messages: MessageShape[],
    currentQuestion?: string
): ConversationContextPayload {
    const filtered = messages.filter((message) => !isNoiseMessage(message))
    const userTimeline = filtered
        .filter((message) => message.role === "user")
        .map((message) => shorten(cleanText(message.text ?? "")))
        .filter(Boolean)
        .slice(-MAX_ITEMS)
    const assistantTimeline = filtered
        .filter((message) => message.role === "assistant")
        .map((message) => shorten(cleanText(message.text ?? "")))
        .filter(Boolean)
        .slice(-MAX_ITEMS)
    const userMainPoint = shorten(buildMainPoint(userTimeline, currentQuestion), 360)

    const contextParts: string[] = []
    if (userMainPoint) contextParts.push(`Main point: ${userMainPoint}`)
    if (userTimeline.length > 0) {
        contextParts.push(`User timeline: ${userTimeline.join(" || ")}`)
    }
    if (assistantTimeline.length > 0) {
        contextParts.push(`Assistant summary: ${assistantTimeline.join(" || ")}`)
    }
    const contextText = shorten(contextParts.join("\n"), MAX_CONTEXT_TEXT)

    return {
        userMainPoint,
        userMessageTimeline: userTimeline,
        assistantSummaryTimeline: assistantTimeline,
        contextText,
        totalMessages: filtered.length,
    }
}

export function normalizeConversationContext(
    input: unknown
): ConversationContextPayload | null {
    if (!input || typeof input !== "object") return null
    const data = input as Record<string, unknown>
    const userMainPoint =
        typeof data.userMainPoint === "string"
            ? shorten(cleanText(data.userMainPoint), 360)
            : ""
    const userMessageTimeline = Array.isArray(data.userMessageTimeline)
        ? data.userMessageTimeline
              .filter((item): item is string => typeof item === "string")
              .map((item) => shorten(cleanText(item)))
              .filter(Boolean)
              .slice(-MAX_ITEMS)
        : []
    const assistantSummaryTimeline = Array.isArray(data.assistantSummaryTimeline)
        ? data.assistantSummaryTimeline
              .filter((item): item is string => typeof item === "string")
              .map((item) => shorten(cleanText(item)))
              .filter(Boolean)
              .slice(-MAX_ITEMS)
        : []

    const fallbackMain = buildMainPoint(userMessageTimeline)
    const mainPoint = userMainPoint || fallbackMain
    const contextText =
        typeof data.contextText === "string"
            ? shorten(cleanText(data.contextText), MAX_CONTEXT_TEXT)
            : shorten(
                  [
                      mainPoint ? `Main point: ${mainPoint}` : "",
                      userMessageTimeline.length
                          ? `User timeline: ${userMessageTimeline.join(" || ")}`
                          : "",
                      assistantSummaryTimeline.length
                          ? `Assistant summary: ${assistantSummaryTimeline.join(" || ")}`
                          : "",
                  ]
                      .filter(Boolean)
                      .join("\n"),
                  MAX_CONTEXT_TEXT
              )

    const totalMessages =
        typeof data.totalMessages === "number" && data.totalMessages >= 0
            ? data.totalMessages
            : userMessageTimeline.length + assistantSummaryTimeline.length

    if (!mainPoint && !contextText) return null
    return {
        userMainPoint: mainPoint,
        userMessageTimeline,
        assistantSummaryTimeline,
        contextText,
        totalMessages,
    }
}

export function buildConversationContextPromptBlock(
    context: ConversationContextPayload | null
) {
    if (!context) return ""
    return `Session context:
${context.contextText}
Main point to preserve:
${context.userMainPoint || "N/A"}`
}
