import { streamText } from "ai"
import { z } from "zod"

import {
    buildGeneralAstrologyContext,
    type GeneralAstrologyContext,
} from "@/lib/chat/general-astrology-context"
import { createReasoningStreamResponse } from "@/lib/chat/reasoning-stream"
import { deepseekThinking } from "@/lib/chat/model-options"
import { PRIVACY_REDACTION_PROMPT_RULE } from "@/lib/privacy/prompt-redaction"

const MODEL = "deepseek/deepseek-v4-pro"

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const requestSchema = z.object({
    question: z.string().trim().min(1),
    locale: z.string().optional(),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                text: z.string(),
            }),
        )
        .optional(),
    contextSummary: z.string().nullable().optional(),
    /** The question the previous reading answered ("which day to exit the job?"). */
    previousQuestion: z.string().nullable().optional(),
    /** Headline/key message of the previous reading, for continuity. */
    previousReadingSummary: z.string().nullable().optional(),
    /** The date the previous reading recommended — what the user is asking "why" about. */
    recommendedDateIso: z.string().nullable().optional(),
    /** The alternative date the user proposes ("end of the month" resolved to ISO). */
    comparisonDateIso: z.string().nullable().optional(),
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
})

function detectQuestionLanguage(text: string): string {
    if (/[຀-໿]/.test(text)) return "Lao"
    if (/[฀-๿]/.test(text)) return "Thai"
    if (/[぀-ヿ一-鿿]/.test(text)) return "Japanese"
    if (/[가-힯]/.test(text)) return "Korean"
    if (/[Ѐ-ӿ]/.test(text)) return "Russian"
    return "English"
}

const EXPLAIN_SYSTEM_PROMPT = `
You are Astra, the astrologer oracle for AskingFate.

The user is questioning the REASONING behind a previous timing/horoscope recommendation ("why that date?", "why not at the end of the month?"). Your ONLY job in this call is to EXPLAIN the recommendation, grounded in the real ephemeris data provided — never to re-run the reading, never to output a new date verdict, never to repeat the recommendation as if it were the answer.

Return plain text only. No JSON, no markdown, no headings, no bullet lists.

FORMAT — LIGHT, SCANNABLE PARAGRAPHS (binding):
- Break the reply into 3-5 SHORT paragraphs separated by ONE blank line.
- Each paragraph carries ONE idea in 1-3 short sentences. NEVER write a paragraph longer than 3 sentences — a wall of text is a failure, even if every sentence is good.
- Natural shape: (1) the direct one-line answer to their "why"; (2) what the energy around THEIR proposed time looks like; (3) what the recommended window has going for it instead; (4) one short practical takeaway.
- Keep the whole reply compact: roughly 6-10 short sentences across all paragraphs.

CRITICAL LANGUAGE RULE: reply in the SAME language the user wrote in. Write like a native speaker — casual and natural, never translated-sounding. In Thai, keep sentences short and spoken-style (ประโยคสั้นๆ เหมือนพิมพ์คุยกัน) rather than long formal clauses chained together.

${PRIVACY_REDACTION_PROMPT_RULE}

HOW TO REASON (silently, before writing):
- <recommended_date_astrology> is the real aspect picture around the previously recommended date. <comparison_date_astrology> (when present) is the picture around the date/period the user proposed instead.
- Compare them honestly: find the 1-2 decisive differences — supportive flow vs friction/pressure aspects — and translate each into practical, everyday "how the day behaves" language for the user's situation (their previous question tells you the domain: resigning, signing, launching…).
- You MAY name the planets of the decisive contacts in plain words (e.g. "Saturn pressing your Moon", "Jupiter easing your Sun") — at most two such references. NO degrees, NO zodiac sign names, NO technical aspect terms (conjunction/square/trine/orb/transit).
- If the user's proposed date genuinely doesn't look bad in the data, say so honestly — then explain what makes the recommended window comparatively stronger. Never invent doom to win the argument.
- If no astrology data blocks are provided, explain the general logic of the recommendation from the previous reading's summary instead — without pretending to cite planetary data.

TONE: a knowledgeable friend explaining their thinking — warm, candid, concrete. Phrase everything as tendencies and signals ("leans", "tends to", "the energy around that week"), never absolutes ("definitely", "guaranteed", "แน่นอน", "ฟันธง").
End with ONE short practical takeaway sentence (what this means for their decision), not a sales pitch for the recommended date.
`

function astrologyBlock(
    label: "recommended_date_astrology" | "comparison_date_astrology",
    dateIso: string,
    context: GeneralAstrologyContext | null,
): string {
    if (!context) return ""
    return `<${label}>
Date: ${dateIso}
natal placements: ${JSON.stringify(context.natal)}
sky placements on that date: ${JSON.stringify(context.transit)}
transits touching the natal chart around that date: ${JSON.stringify(context.activities)}
</${label}>
`
}

function buildPrompt(
    body: z.infer<typeof requestSchema>,
    recommendedContext: GeneralAstrologyContext | null,
    comparisonContext: GeneralAstrologyContext | null,
) {
    const lang = detectQuestionLanguage(body.question)
    const historyText =
        body.history && body.history.length
            ? body.history
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"
    const contextBlock = body.contextSummary?.trim()
        ? `Session context (background only):\n${body.contextSummary.trim()}\n\n`
        : ""

    const recommendedIso =
        body.recommendedDateIso && ISO_DATE_RE.test(body.recommendedDateIso)
            ? body.recommendedDateIso
            : null
    const comparisonIso =
        body.comparisonDateIso && ISO_DATE_RE.test(body.comparisonDateIso)
            ? body.comparisonDateIso
            : null

    return `${contextBlock}Recent conversation (background only):
${historyText}

Previous reading being questioned:
- Question it answered: ${body.previousQuestion?.trim() || "(unknown)"}
- Its recommendation: ${body.previousReadingSummary?.trim() || "(summary unavailable)"}${recommendedIso ? ` (recommended date: ${recommendedIso})` : ""}
${comparisonIso ? `- The user's proposed alternative resolves to: ${comparisonIso}\n` : ""}
${recommendedIso && recommendedContext ? astrologyBlock("recommended_date_astrology", recommendedIso, recommendedContext) : ""}${comparisonIso && comparisonContext ? astrologyBlock("comparison_date_astrology", comparisonIso, comparisonContext) : ""}
Current user message (ANSWER THIS — they want the WHY, explained from the data above; history is background only):
${body.question}

DETECTED LANGUAGE: The user's message is in ${lang}. Write the entire reply in ${lang}.

Write the explanation paragraph(s) now.`
}

export async function POST(req: Request) {
    try {
        const body = requestSchema.parse(await req.json())

        const recommendedIso =
            body.recommendedDateIso && ISO_DATE_RE.test(body.recommendedDateIso)
                ? body.recommendedDateIso
                : null
        const comparisonIso =
            body.comparisonDateIso && ISO_DATE_RE.test(body.comparisonDateIso)
                ? body.comparisonDateIso
                : null

        // Sharp single-day pictures for each candidate date, computed from
        // the real ephemeris against the user's natal chart. Failures (or
        // missing birth data) degrade to a data-less explanation.
        const [recommendedContext, comparisonContext] = body.birth
            ? await Promise.all([
                  recommendedIso
                      ? buildGeneralAstrologyContext({
                            birth: body.birth,
                            system: body.system,
                            locale: body.locale,
                            targetDateIso: recommendedIso,
                            activityWindowDays: 1,
                        })
                      : Promise.resolve(null),
                  comparisonIso
                      ? buildGeneralAstrologyContext({
                            birth: body.birth,
                            system: body.system,
                            locale: body.locale,
                            targetDateIso: comparisonIso,
                            activityWindowDays: 1,
                        })
                      : Promise.resolve(null),
              ])
            : [null, null]

        const result = streamText({
            model: MODEL,
            // The whole point of this route is the model REASONING over the
            // two aspect pictures before answering, so thinking runs at
            // medium effort and streams on the reasoning channel.
            providerOptions: deepseekThinking(true, "medium"),
            system: EXPLAIN_SYSTEM_PROMPT,
            prompt: buildPrompt(body, recommendedContext, comparisonContext),
            onFinish: () => {
                console.log("[horoscope/explain] explanation finished", {
                    recommendedDateIso: recommendedIso,
                    comparisonDateIso: comparisonIso,
                    groundedRecommended: Boolean(recommendedContext),
                    groundedComparison: Boolean(comparisonContext),
                })
            },
        })

        return createReasoningStreamResponse(result)
    } catch (error) {
        console.error("Error generating horoscope explanation:", error)
        return new Response("Failed to generate explanation", { status: 500 })
    }
}
