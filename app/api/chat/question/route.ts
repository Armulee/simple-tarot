import { streamObject } from "ai"
import { z } from "zod"
import { generalReplySchema } from "@/lib/chat/general-reply-schema"
import { buildGeneralAstrologyContext } from "@/lib/chat/general-astrology-context"
import {
    PRIVACY_REDACTION_PROMPT_RULE,
    summarizePrivacyPlaceholdersInText,
} from "@/lib/privacy/prompt-redaction"

const MODEL = "deepseek/deepseek-v3.2"

const requestSchema = z.object({
    question: z.string().trim().min(1),
    isFollowUp: z.boolean().optional(),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                text: z.string(),
            }),
        )
        .optional(),
    contextSummary: z.string().nullable().optional(),
    locale: z.string().optional(),
    system: z.enum(["western_tropical", "vedic_sidereal", "both"]).optional(),
    birth: z
        .object({
            day: z.number().int().min(1).max(31),
            month: z.number().int().min(1).max(12),
            year: z.number().int().min(1900).max(2100),
            hour: z.number().int().min(0).max(23).nullable().optional(),
            minute: z.number().int().min(0).max(59).nullable().optional(),
            timeHint: z.enum(["day", "night", "unknown"]).optional(),
            timezone: z.number(),
            lat: z.number(),
            lng: z.number(),
            country: z.string().nullable().optional(),
            state: z.string().nullable().optional(),
            usedLocationFallback: z.boolean().optional(),
        })
        .nullable()
        .optional(),
    transit: z
        .object({
            day: z.number().int().min(1).max(31).nullable().optional(),
            month: z.number().int().min(1).max(12).nullable().optional(),
            year: z.number().int().min(1900).max(2100).nullable().optional(),
            hour: z.number().int().min(0).max(23).nullable().optional(),
            minute: z.number().int().min(0).max(59).nullable().optional(),
            timezone: z.number().nullable().optional(),
            lat: z.number().nullable().optional(),
            lng: z.number().nullable().optional(),
            country: z.string().nullable().optional(),
            state: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    questionRange: z
        .object({
            startDateIso: z.string(),
            endDateIso: z.string(),
            durationDays: z.number().int().positive(),
            source: z.enum(["explicit", "relative", "default_30d", "ai_inferred"]),
            granularity: z.enum(["hourly", "daily"]),
        })
        .nullable()
        .optional(),
})

function resolveTargetDateIso(
    body: z.infer<typeof requestSchema>,
): string | null {
    if (
        body.transit?.day != null &&
        body.transit?.month != null &&
        body.transit?.year != null
    ) {
        const { year, month, day } = body.transit
        return `${String(year).padStart(4, "0")}-${String(month).padStart(
            2,
            "0",
        )}-${String(day).padStart(2, "0")}`
    }
    return body.questionRange?.startDateIso ?? null
}

const GENERAL_REPLY_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

You are answering a question that has NO tarot draw and NO product lookup attached. This is the "inner energy reflection" lens. When astrology context is supplied, you read the person's birth chart, the current sky, and the live transits stirring their chart, and you translate that energetic picture into how it FEELS inside them right now. Your job is to feel WHAT IS MOVING INSIDE the user — not to forecast events, not to give advice, not to summarize their question back to them.

Personality: mysterious, magical, restrained, and otherworldly, like an oracle who reveals only what is necessary.
Tone: composed, intimate, slightly hushed. Never cheerful, never coachy, never journalist-y.

CRITICAL LANGUAGE RULE:
Reply in the SAME language the user wrote in.
Write like a native speaker of that language — never translated-sounding.

${PRIVACY_REDACTION_PROMPT_RULE}

USING THE ASTROLOGY CONTEXT (when provided):
- Treat birth_chart as who they are at the core, transit_chart as the present sky, and astrology_activities as the live transit-to-natal aspects pressing on their chart right now.
- ANSWER the user's question, and base that answer on the astrology_activities: read which aspects are active and whether they are good / bad / neutral, and let that drive what you tell them.
- Let the activities shape the innerEnergy shape, the heroTitle, and the tone — e.g. tense aspects lean toward vortex / eclipse / fog, flowing ones toward wave / tide / ember.
- Include a LITTLE real astrology as the "why": pick the ONE most relevant aspect from astrology_activities and reference it in ONE short clause — name the transiting planet and the natal planet it touches and the nature of the contact in plain terms (e.g. "Mars pressing your Moon right now is stirring this", "Venus easing across your Sun is softening things"). Then immediately translate it into feeling. ONE reference only.
- If no astrology context is supplied, lean purely on intuition from the message and skip the astrological reference.

YOU MUST AVOID:
- daily-horoscope phrasing ("Today you will...", "This week brings...")
- generic spiritual filler ("The universe wants you to know...")
- coachy / self-help language ("Take action", "Be confident")
- MORE than one astrological reference, and the heavy stuff around it: degrees, house numbers, zodiac sign names, technical aspect names (conjunction / trine / square / sextile / opposition), retrograde talk, or any chart-jargon dump. Name the two planets and the gist of the contact in plain words — nothing more.
- mentioning tarot cards
- restating the user's question literally

WHAT THE REFLECTION SHOULD DO:
- give the user a felt ANSWER to what they asked, grounded in the active aspects
- name the invisible pressure or pull beneath the surface and the inner shift underway
- weave in exactly ONE short, real astrological reference (transit planet + the natal planet it touches) as the gentle "why", then translate it to feeling
- treat ambiguity as a signal — when the message is vague, lean MORE on the astrology backdrop and intuition, not less
- speak TO the user (using "you" / "khun"), not ABOUT them

OUTPUT FORMAT:
You MUST return a single valid JSON object that exactly matches the provided schema. Do not add any text outside the JSON.
`

function detectQuestionLanguage(text: string): string {
    if (/[຀-໿]/.test(text)) return "Lao"
    if (/[฀-๿]/.test(text)) return "Thai"
    if (/[぀-ヿ一-鿿]/.test(text)) return "Japanese"
    if (/[가-힯]/.test(text)) return "Korean"
    if (/[Ѐ-ӿ]/.test(text)) return "Russian"
    return "English"
}

function buildPrompt(
    body: z.infer<typeof requestSchema>,
    astrologyBlock: string,
) {
    const { question, isFollowUp, history, contextSummary } = body
    const historyText =
        history && history.length
            ? history
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings / interactions):\n${contextSummary.trim()}\n\n`
            : ""

    const detectedLang = detectQuestionLanguage(question)
    const astrologySection = astrologyBlock ? `${astrologyBlock}\n\n` : ""

    return `
${contextBlock}${astrologySection}Recent conversation:
${historyText}

User message:
${question}

Is follow-up: ${isFollowUp ? "yes" : "no"}
DETECTED LANGUAGE: The user's message is in ${detectedLang}. Ignore the language of the conversation history.

Read the message together with the astrology context above and write the inner-energy reflection now. ANSWER what they asked, basing the answer on the active astrology_activities aspects, and weave in exactly ONE short, real astrological reference (the transit planet + the natal planet it touches) as the "why", then translate it to feeling. Lean into intuition when the message is vague or no astrology is supplied.
`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        // Ground the reflection in the asker's real astrology when their
        // birth data is available. Failures (missing data, ephemeris errors)
        // resolve to null and the prompt falls back to pure intuition.
        const astrologyContext = body.birth
            ? await buildGeneralAstrologyContext({
                  birth: body.birth,
                  system: body.system,
                  locale: body.locale,
                  targetDateIso: resolveTargetDateIso(body),
              })
            : null

        const result = streamObject({
            model: MODEL,
            schema: generalReplySchema,
            system: GENERAL_REPLY_SYSTEM_PROMPT,
            prompt: buildPrompt(body, astrologyContext?.promptBlock ?? ""),
            onFinish: ({ object }) => {
                const incoming = summarizePrivacyPlaceholdersInText(
                    body.question,
                )
                console.log(
                    "[chat/question] inner-energy reflection finished",
                    {
                        innerEnergy: object?.innerEnergy,
                        groundedInAstrology: Boolean(astrologyContext),
                        activityCount:
                            astrologyContext?.activities.length ?? 0,
                        promptPlaceholderStats: incoming,
                        isFollowUp: body.isFollowUp ?? false,
                    },
                )
            },
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating inner-energy reflection:", error)
        return new Response("Failed to generate response", { status: 500 })
    }
}
