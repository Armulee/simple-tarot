import { streamObject } from "ai"

import { chatDecisionSchema } from "@/lib/chat/decision-schema"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"
import { supabaseAdmin } from "@/lib/supabase"

const MODEL = "deepseek/deepseek-v3.2"

const CHAT_DECISION_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

Classify the user's message into ONE type:

chat
draw
horoscope

Definitions:

chat
- general greetings (hi, hello)
- technical definitions of astrology/tarot
- "Who are you?" or "What can you do?"
- (DO NOT use chat for advice, strategy, or problem-solving; use 'draw' for those)

draw
- questions about the user's life situation, projects, or business
- career, money, "how to grow my business/app", decisions
- "what will happen", "is this good", "how will this go"
- goals, obstacles, and seeking guidance or solutions

horoscope
- timing questions
- today / tomorrow / this month / this year
- astrology timing

If type is "draw", you MUST also choose ONE tarot spread:

simple
- 1 card
- best for quick yes/no, a single focus, or a very narrow question

general
- 3 cards
- best for a normal situation reading with a little context, tension, and direction

detailed
- 5 cards
- best for multi-layered questions that need obstacles, hidden factors, advice, and outcome

expanded
- 7 cards
- best for relationship dynamics, multiple forces, strengths/weaknesses, or a broader situation map

celtic
- 10 cards
- only choose this if the user clearly wants a deep, comprehensive, or "tell me everything" style reading

Important rule:

If the user is talking about their own situation or asking how something will go,
choose "draw" even if the question is vague.

FOLLOW-UP DETECTION (read "Session context" carefully):

You may receive a "Session context" block describing previous readings and interactions.
Use it to detect follow-up questions:

- If the user's message is a follow-up to a PREVIOUS TAROT reading (e.g. asking "who?", "is it a girl?", "tell me more", "what does that mean?", clarifying something from the reading), classify as "draw" and set isFollowUp to true.
- If the user's message is a follow-up to a PREVIOUS HOROSCOPE reading, classify as "horoscope" and set isFollowUp to true.
- If the user's message is clearly about a NEW, UNRELATED topic, classify normally and set isFollowUp to false.
- Short vague questions like "really?", "who?", "how?", "why?", "tell me more" after a reading are almost always follow-ups — use the session context to determine which feature they relate to.

Return JSON only:

{
"type":"chat"|"draw"|"horoscope",
"isFollowUp":true|false,
"spreadType":"simple"|"general"|"detailed"|"expanded"|"celtic",
"spreadReason":"short reason"
}

If type is NOT "draw", omit spreadType and spreadReason.

CRITICAL LANGUAGE RULE:
Use the user's language to help classification accuracy.

${PRIVACY_REDACTION_PROMPT_RULE}

`

async function getUserFromBearer(req: Request) {
    if (!supabaseAdmin) return null
    const authHeader =
        req.headers.get("authorization") ?? req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    const token = authHeader.slice(7).trim()
    if (!token) return null
    const {
        data: { user },
        error,
    } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
}

function detectQuestionLanguage(text: string): string {
    if (/[\u0E80-\u0EFF]/.test(text)) return "Lao"
    if (/[\u0E00-\u0E7F]/.test(text)) return "Thai"
    if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "Japanese"
    if (/[\uAC00-\uD7AF]/.test(text)) return "Korean"
    if (/[\u0400-\u04FF]/.test(text)) return "Russian"
    return "English"
}

const MODE_TO_TYPE: Record<string, string> = {
    tarot: "draw",
    horoscope: "horoscope",
    chat: "chat",
}

function getChatDecisionPrompt({
    question,
    history,
    interpretationMode,
    contextSummary,
    savedBirthInfo,
    isAuthenticated,
}: {
    question: string
    history?: Array<{ role: "user" | "assistant"; text: string }>
    interpretationMode?: string | null
    contextSummary?: string | null
    savedBirthInfo?: string | null
    isAuthenticated: boolean
}) {
    const historyText =
        history && history.length
            ? history
                  .slice(-4)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings/interactions):\n${contextSummary.trim()}\n\n`
            : ""

    const forcedType =
        interpretationMode && MODE_TO_TYPE[interpretationMode]
            ? MODE_TO_TYPE[interpretationMode]
            : null

    const modeInstruction = forcedType
        ? `\nThe user has locked the mode to "${forcedType}". You MUST set type to "${forcedType}". If the forced type is "draw", you must still choose the best spreadType and spreadReason.\n`
        : ""

    const detectedLang = detectQuestionLanguage(question)
    const savedBirthBlock = savedBirthInfo
        ? `Saved birth profile: available (${savedBirthInfo}).`
        : "Saved birth profile: not available. If you choose horoscope, do not ask for birth date in the chat response; the app will collect or reuse birth data through the birth profile flow."

    const anonymousHoroscopeRule = !isAuthenticated
        ? `\nIMPORTANT: The user is NOT signed in. Horoscope readings require an account. Never set type to "horoscope". For timing or astrology questions, choose "draw" or "chat". Even if session context mentions a prior horoscope reading, do not use "horoscope" while unsigned.\n`
        : ""

    return `
${contextBlock}Recent conversation:
${historyText}

User message:
${question}
${modeInstruction}
${savedBirthBlock}${anonymousHoroscopeRule}
DETECTED LANGUAGE: The user's message is in ${detectedLang}. Ignore the language of conversation history — only the current user message language matters.

Classify the intent and return JSON.
`
}

function normalizeHistory(
    history: unknown,
): Array<{ role: "user" | "assistant"; text: string }> | undefined {
    if (!Array.isArray(history)) return undefined
    const normalized = history
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const role =
                (item as { role?: unknown }).role === "user" ||
                (item as { role?: unknown }).role === "assistant"
                    ? ((item as { role: "user" | "assistant" }).role as
                          | "user"
                          | "assistant")
                    : null
            const text = (item as { text?: unknown }).text
            if (!role || typeof text !== "string") return null
            return { role, text }
        })
        .filter((item): item is { role: "user" | "assistant"; text: string } =>
            Boolean(item),
        )
    return normalized.length > 0 ? normalized : undefined
}

export async function POST(req: Request) {
    try {
        let body: {
            question?: string
            history?: unknown
            savedBirthInfo?: string | null
            interpretationMode?: string | null
            contextSummary?: string | null
        }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid or empty request body", {
                status: 400,
            })
        }
        const {
            question,
            history,
            interpretationMode: rawInterpretationMode,
            contextSummary,
            savedBirthInfo,
        } = body ?? {}

        const user = await getUserFromBearer(req)
        const isAuthenticated = Boolean(user)

        let interpretationMode = rawInterpretationMode ?? null
        if (!isAuthenticated && interpretationMode === "horoscope") {
            interpretationMode = null
        }

        const normalizedHistory = normalizeHistory(history)

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamObject({
            model: MODEL,
            schema: chatDecisionSchema,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({
                question,
                history: normalizedHistory,
                interpretationMode,
                contextSummary,
                savedBirthInfo,
                isAuthenticated,
            }),
        })

        result.object
            .then((obj) => {
                const incoming = summarizePrivacyPlaceholdersInText(question)
                console.log("[chat/decision] route → decision + incoming question token summary", {
                    type: obj.type,
                    isFollowUp: obj.isFollowUp ?? false,
                    spreadType: obj.spreadType,
                    spreadReason: obj.spreadReason,
                    /** If the client sent `[Person_0]`-style tokens, they show up here (not the real names). */
                    incomingQuestionPlaceholderStats: incoming,
                })
            })
            .catch((e) => {
                console.error("[chat/decision] final object error:", e)
            })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
