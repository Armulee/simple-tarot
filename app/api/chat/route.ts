import { streamObject } from "ai"

import { chatDecisionSchema } from "@/lib/chat/decision-schema"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"
import { supabaseAdmin } from "@/lib/supabase"

const MODEL = "deepseek/deepseek-v4-flash"

const CHAT_DECISION_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

Classify the user's message into ONE type:

chat
draw
horoscope
support

Definitions:

chat
- general greetings (hi, hello)
- technical definitions of astrology/tarot ("what is a trine?", "what is the 7th house?")
- "Who are you?" or "What can you do?" (only if not asking for a feature; otherwise use support)
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

support
- ANY question about the AskingFate WEBSITE / PRODUCT itself
- pricing, plans, subscriptions, refunds, billing → supportTopic: "pricing"
- buying / refilling / running out of stars, star packs → supportTopic: "star-packs"
- "I want to contact support", "is there a human?", reporting a bug, complaints → supportTopic: "contact"
- general help / troubleshooting → supportTopic: "help"
- frequently asked questions → supportTopic: "faq"
- "how do I use this?", "how does it work?", tutorial, getting started → supportTopic: "how-to-play"
- account, delete account, change email, sign-out → supportTopic: "account"
- settings, preferences, language → supportTopic: "settings"
- privacy / PII redaction notice in chat → supportTopic: "privacy-redaction"
- privacy policy / data → supportTopic: "privacy-policy"
- terms of service → supportTopic: "terms-of-service"
- referrals, inviting friends → supportTopic: "refer-a-friend"
- sharing a reading link → supportTopic: "share-reading"
- creating content about AskingFate for stars → supportTopic: "create-content"
- about the company / our team → supportTopic: "about"
- sign-in / log in → supportTopic: "sign-in"
- sign-up / register → supportTopic: "sign-up"
- a specific tarot card "what does the seven of cups mean?", "the fool meaning" → supportTopic: "tarot-card" and set supportCardSlug to the canonical kebab-case slug (e.g. "seven-of-cups", "the-fool", "queen-of-pentacles")
- "show me all tarot cards", "the deck" → supportTopic: "tarot-cards-index"
- our birth chart feature → supportTopic: "birth-chart"
- our horoscope feature (asking ABOUT the feature, not requesting a horoscope) → supportTopic: "horoscope"
- "show me the calendar year", "calendar year", "year ahead", yearly outlook, the 12-month view → supportTopic: "calendar-year"
- browsing articles or guides → supportTopic: "articles"

When the message is BOTH a feature question AND a fortune-telling question, prefer "support" only if it is clearly about the product. Otherwise stick with draw/horoscope. For a real fortune question that incidentally mentions stars / pricing, still use draw.

If type is "support", you MUST set supportTopic. Set supportCardSlug only for tarot-card.

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
"type":"chat"|"draw"|"horoscope"|"support",
"isFollowUp":true|false,
"spreadType":"simple"|"general"|"detailed"|"expanded"|"celtic",
"spreadReason":"short reason",
"supportTopic":"pricing"|"contact"|"...",
"supportCardSlug":"seven-of-cups"
}

If type is NOT "draw", omit spreadType and spreadReason.
If type is NOT "support", omit supportTopic and supportCardSlug.

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

/**
 * Maps the user-facing interpretation mode (set in the composer menu) to the
 * decision `type` (or list of allowed types). The "chat" mode is special: it
 * is the merged chat+support mode, so we let the classifier pick either
 * `chat` (plain text knowledge reply) or `support` (inline tool block for
 * product topics) instead of pinning a single type.
 */
const MODE_TO_TYPE: Record<string, string | string[]> = {
    tarot: "draw",
    horoscope: "horoscope",
    chat: ["chat", "support"],
    support: "support",
}

function getChatDecisionPrompt({
    question,
    history,
    interpretationMode,
    contextSummary,
    savedBirthInfo,
    hasStoredBirthChart,
    isAuthenticated,
    planTier,
}: {
    question: string
    history?: Array<{ role: "user" | "assistant"; text: string }>
    interpretationMode?: string | null
    contextSummary?: string | null
    savedBirthInfo?: string | null
    hasStoredBirthChart?: boolean
    isAuthenticated: boolean
    planTier?: "free" | "basic" | "pro"
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

    let modeInstruction = ""
    if (Array.isArray(forcedType)) {
        const list = forcedType.map((t) => `"${t}"`).join(" or ")
        modeInstruction = `\nThe user has locked the mode to "${interpretationMode}". You MUST set type to ${list}. If the message is about the AskingFate website or product (pricing, contact, a specific tarot card, an article, account/settings, sign-in, etc.), choose "support" and set supportTopic (and supportCardSlug when relevant). Otherwise choose "chat" and answer as plain knowledge. Never choose "draw" or "horoscope" while this mode is active.\n`
    } else if (forcedType) {
        modeInstruction = `\nThe user has locked the mode to "${forcedType}". You MUST set type to "${forcedType}". If the forced type is "draw", you must still choose the best spreadType and spreadReason. If the forced type is "support", you MUST set supportTopic (and supportCardSlug when the user is asking about a specific tarot card).\n`
    }

    const detectedLang = detectQuestionLanguage(question)
    const savedBirthBlock = savedBirthInfo
        ? `Saved birth profile: available (${savedBirthInfo}).`
        : "Saved birth profile: not available. If you choose horoscope, do not ask for birth date in the chat response; the app will collect or reuse birth data through the birth profile flow."

    const storedChartBlock = hasStoredBirthChart
        ? "\nSaved birth chart: available. The user has a previously computed natal chart stored on their account. Questions like \"what does my Saturn mean?\", \"what is my rising sign?\", or any reference to \"my chart / my placements\" should be classified as \"horoscope\" and the app will pass the stored chart to the horoscope reader so it can answer with real placements."
        : "\nSaved birth chart: not available."

    const anonymousHoroscopeRule = !isAuthenticated
        ? `\nNote: The user is NOT signed in. Horoscope readings ultimately require an account, but you should STILL classify timing/astrology questions as "horoscope" so the app can show a sign-in prompt. Do not pretend the topic is "chat" just to avoid the auth requirement — the client handles the sign-in gate separately.\n`
        : ""

    const effectivePlanTier = planTier ?? "free"
    const planTierRule =
        effectivePlanTier === "free"
            ? `\nUser plan: FREE tier. The free tier is LIMITED TO A MAXIMUM OF 3 CARDS per draw. If type is "draw", you MUST choose only "simple" (1 card) or "general" (3 cards). Do NOT choose "detailed" (5), "expanded" (7), or "celtic" (10) for free-tier users — the client will downgrade them anyway.\n`
            : `\nUser plan: ${effectivePlanTier.toUpperCase()} tier. The user has access to all spread sizes (up to 10 cards).\n`

    return `
${contextBlock}Recent conversation:
${historyText}

User message:
${question}
${modeInstruction}
${savedBirthBlock}${storedChartBlock}${anonymousHoroscopeRule}${planTierRule}
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
            hasStoredBirthChart?: boolean
            interpretationMode?: string | null
            contextSummary?: string | null
            planTier?: "free" | "basic" | "pro"
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
            hasStoredBirthChart,
            planTier: rawPlanTier,
        } = body ?? {}
        const planTier =
            rawPlanTier === "basic" || rawPlanTier === "pro"
                ? rawPlanTier
                : "free"

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
                hasStoredBirthChart: Boolean(hasStoredBirthChart),
                isAuthenticated,
                planTier,
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
