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

const TOPIC_BUCKETS: Record<string, string[]> = {
    career: [
        "work",
        "job",
        "jobs",
        "career",
        "boss",
        "office",
        "business",
        "promotion",
        "งาน",
        "เจ้านาย",
        "หัวหน้า",
        "ธุรกิจ",
        "อาชีพ",
    ],
    love: [
        "love",
        "relationship",
        "partner",
        "boyfriend",
        "girlfriend",
        "crush",
        "marriage",
        "รัก",
        "แฟน",
        "ความสัมพันธ์",
        "แต่งงาน",
    ],
    money: [
        "money",
        "finance",
        "financial",
        "wealth",
        "debt",
        "invest",
        "investment",
        "salary",
        "เงิน",
        "หนี้",
        "ลงทุน",
    ],
    health: ["health", "sick", "illness", "doctor", "สุขภาพ", "ป่วย", "หมอ"],
    family: [
        "family",
        "mother",
        "father",
        "parents",
        "ครอบครัว",
        "แม่",
        "พ่อ",
        "ลูก",
    ],
    study: [
        "study",
        "school",
        "exam",
        "university",
        "เรียน",
        "สอบ",
        "มหาลัย",
        "โรงเรียน",
    ],
}

function tokenMatchesBucketWord(token: string, word: string) {
    if (token === word) return true
    if (isThaiToken(word)) {
        // Thai has no word spacing, so bucket words usually live inside a
        // longer unsegmented token (e.g. "งาน" inside "งานปีนี้จะดีไหม").
        return token.includes(word)
    }
    return (
        (word.length >= 4 && token.includes(word)) ||
        (token.length >= 4 && word.includes(token))
    )
}

function topicBucketsOf(tokens: string[]): Set<string> {
    const buckets = new Set<string>()
    for (const [bucket, words] of Object.entries(TOPIC_BUCKETS)) {
        if (
            tokens.some((token) =>
                words.some((word) => tokenMatchesBucketWord(token, word)),
            )
        ) {
            buckets.add(bucket)
        }
    }
    return buckets
}

function hasKeywordOverlap(questionKeywords: string[], target: string) {
    if (questionKeywords.length === 0) return false
    const targetKeywords = extractKeywords(target)
    if (targetKeywords.length === 0) return false
    const lexical = questionKeywords.some((key) =>
        targetKeywords.some(
            (token) =>
                token === key ||
                (key.length >= 4 && token.includes(key)) ||
                (token.length >= 4 && key.includes(token)),
        ),
    )
    if (lexical) return true
    // Same-thread synonyms the lexical check can't see (e.g. "work" ↔ "job"):
    // shared topic buckets count as overlap so an ambiguous current question
    // keeps its same-topic history for disambiguation.
    const questionBuckets = topicBucketsOf(questionKeywords)
    if (questionBuckets.size === 0) return false
    const targetBuckets = topicBucketsOf(targetKeywords)
    for (const bucket of targetBuckets) {
        if (questionBuckets.has(bucket)) return true
    }
    return false
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
    let userTimeline = allUsers
    let assistantTimeline = allAssistants
    if (current) {
        const keptUsers: string[] = []
        const keptAssistants: string[] = []
        let lastUserKept = false
        for (const message of filtered) {
            const line = shorten(cleanText(message.text ?? ""))
            if (!line) continue
            if (message.role === "user") {
                lastUserKept = hasKeywordOverlap(questionKeywords, line)
                if (lastUserKept) keptUsers.push(line)
            } else if (message.role === "assistant") {
                // An assistant reply belongs to the user message it answered,
                // so it stays in the thread when that message stayed — or when
                // it overlaps the current question on its own.
                if (
                    lastUserKept ||
                    hasKeywordOverlap(questionKeywords, line)
                ) {
                    keptAssistants.push(line)
                }
            }
        }
        userTimeline = keptUsers.slice(-MAX_RELEVANT_ITEMS)
        assistantTimeline = keptAssistants.slice(-MAX_RELEVANT_ITEMS)
    }
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
    return `Session context (background only — use it to understand what an ambiguous current question refers to; NEVER answer an old question from it):
${context.contextText}
User's current focus (anchored on the latest question):
${context.userMainPoint || "N/A"}`
}

// ---------------------------------------------------------------------------
// Session context summary for the chat decision classifier
// ---------------------------------------------------------------------------

const MAX_SUMMARY = 500

type SessionMessageShape = MessageShape & {
    cards?: { name: string; slug?: string }[]
    question?: string
}

function summarizeTarotReading(msg: SessionMessageShape): string {
    const cardNames =
        msg.cards && msg.cards.length > 0
            ? msg.cards.map((c) => c.name).join(", ")
            : null
    const snippet = shorten(cleanText(msg.text ?? ""), 120)
    if (cardNames) return `Tarot reading (${cardNames}): ${snippet}`
    return `Tarot reading: ${snippet}`
}

function summarizeHoroscope(msg: SessionMessageShape): string {
    const snippet = shorten(cleanText(msg.text ?? ""), 120)
    return `Horoscope reading: ${snippet}`
}

/**
 * Builds a compact session context string from the full message history.
 * Captures which features were used (tarot, horoscope) along with key details
 * so the chat-decision classifier can route follow-up questions correctly.
 */
export function buildSessionContextSummary(
    messages: SessionMessageShape[],
): string {
    const parts: string[] = []

    const userQuestions: string[] = []
    const readings: string[] = []

    for (const msg of messages) {
        if (isNoiseMessage(msg)) continue

        if (msg.role === "user") {
            userQuestions.push(shorten(cleanText(msg.text ?? ""), 80))
        } else if (msg.role === "assistant") {
            if (msg.variant === "box" && msg.text?.trim()) {
                readings.push(summarizeTarotReading(msg))
            } else if (msg.variant === "horoscope" && msg.text?.trim()) {
                readings.push(summarizeHoroscope(msg))
            }
        }
    }

    if (userQuestions.length > 0) {
        const recent = userQuestions.slice(-3)
        parts.push(`User asked: ${recent.join(" -> ")}`)
    }

    if (readings.length > 0) {
        const recent = readings.slice(-2)
        parts.push(recent.join(" | "))
    }

    if (parts.length === 0) return ""

    const lastFeature =
        readings.length > 0
            ? readings[readings.length - 1].startsWith("Horoscope")
                ? "horoscope"
                : "tarot"
            : "chat"

    parts.push(`Last feature used: ${lastFeature}`)

    return shorten(parts.join("\n"), MAX_SUMMARY)
}
