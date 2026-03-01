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
const MIN_TOKEN_LEN = 2
const MAX_RELEVANT_ITEMS = 4

const EN_STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "so",
    "that",
    "the",
    "this",
    "to",
    "was",
    "we",
    "what",
    "when",
    "where",
    "who",
    "will",
    "with",
    "you",
    "your",
])

const TH_STOPWORDS = new Set([
    "ก็",
    "กับ",
    "ของ",
    "ค่ะ",
    "ครับ",
    "คะ",
    "คือ",
    "จะ",
    "ฉัน",
    "ชั้น",
    "ที่",
    "ทำไม",
    "นะ",
    "ใน",
    "ไม่",
    "มี",
    "มัน",
    "ว่า",
    "ว่าไง",
    "อะไร",
    "เรา",
    "แล้ว",
    "ไหม",
    "ไหมคะ",
    "ไหมครับ",
    "ไหมนะ",
])

function cleanText(value: string) {
    return value.replace(/\s+/g, " ").trim()
}

function tokenize(value: string) {
    return value
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map((token) => token.trim())
        .filter(Boolean)
}

function isThaiToken(token: string) {
    return /[\u0E00-\u0E7F]/.test(token)
}

function extractKeywords(value: string) {
    return tokenize(value).filter((token) => {
        if (token.length < MIN_TOKEN_LEN) return false
        if (isThaiToken(token)) return !TH_STOPWORDS.has(token)
        return !EN_STOPWORDS.has(token)
    })
}

function hasFollowUpCue(value: string) {
    const normalized = value.toLowerCase()
    return (
        /\b(and|also|then|what about|how about|more|continue|same)\b/.test(
            normalized,
        ) || /แล้ว|ต่อ|เพิ่ม|อีก|เหมือนเดิม|ต่อจาก/.test(value)
    )
}

function hasKeywordOverlap(questionKeywords: string[], target: string) {
    if (questionKeywords.length === 0) return false
    const targetKeywords = extractKeywords(target)
    if (targetKeywords.length === 0) return false
    return questionKeywords.some((key) =>
        targetKeywords.some(
            (token) =>
                token === key ||
                (key.length >= 4 && token.includes(key)) ||
                (token.length >= 4 && key.includes(token)),
        ),
    )
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
    const allUsers = filtered
        .filter((message) => message.role === "user")
        .map((message) => shorten(cleanText(message.text ?? "")))
        .filter(Boolean)
        .slice(-MAX_ITEMS)
    const allAssistants = filtered
        .filter((message) => message.role === "assistant")
        .map((message) => shorten(cleanText(message.text ?? "")))
        .filter(Boolean)
        .slice(-MAX_ITEMS)
    const current = cleanText(currentQuestion ?? "")
    const questionKeywords = extractKeywords(current)
    const followUp = hasFollowUpCue(current)
    const userTimeline = current
        ? allUsers
              .filter((line) => hasKeywordOverlap(questionKeywords, line))
              .slice(-MAX_RELEVANT_ITEMS)
        : allUsers
    const assistantTimeline = current
        ? allAssistants
              .filter((line) => hasKeywordOverlap(questionKeywords, line))
              .slice(-MAX_RELEVANT_ITEMS)
        : allAssistants
    const includeFallbackContext =
        followUp &&
        userTimeline.length === 0 &&
        assistantTimeline.length === 0 &&
        allUsers.length > 0
    const finalUserTimeline = includeFallbackContext
        ? allUsers.slice(-1)
        : userTimeline
    const finalAssistantTimeline = includeFallbackContext
        ? allAssistants.slice(-1)
        : assistantTimeline
    const userMainPoint = shorten(
        buildMainPoint(finalUserTimeline, currentQuestion),
        360,
    )

    const contextParts: string[] = []
    if (userMainPoint) contextParts.push(`Main point: ${userMainPoint}`)
    if (finalUserTimeline.length > 0) {
        contextParts.push(`User timeline: ${finalUserTimeline.join(" || ")}`)
    }
    if (finalAssistantTimeline.length > 0) {
        contextParts.push(
            `Assistant summary: ${finalAssistantTimeline.join(" || ")}`,
        )
    }
    const contextText = shorten(contextParts.join("\n"), MAX_CONTEXT_TEXT)

    return {
        userMainPoint,
        userMessageTimeline: finalUserTimeline,
        assistantSummaryTimeline: finalAssistantTimeline,
        contextText,
        totalMessages: finalUserTimeline.length + finalAssistantTimeline.length,
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
