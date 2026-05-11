import { z } from "zod"

/**
 * Schema order matters for streaming so the chat-session UI can reveal
 * sections progressively:
 *   cardInsights → headline → subtitle → keyMessage → detailedHtml → perCard →
 *   keywords → interpretation → nextStep → conclusion → suggestions
 *
 * The "new" fields (headline/subtitle/perCard/nextStep + 3–4 short suggestions)
 * power the refreshed chat-session result UI. The "legacy" fields
 * (cardInsights/keyMessage/keywords/interpretation/conclusion) are still
 * populated by the model so the legacy `/tarot` page and the DB-backed
 * `shared_tarot` view keep rendering unchanged.
 */
export const tarotInterpretationSchema = z.object({
    cardInsights: z
        .array(z.string())
        .describe(
            "Ultra-short ONE line for the on-screen card strip under each card image (must fit a small italic quote). HARD CAP: ≤12 Thai words OR ≤10 English words (match question language). One clause only — no semicolons, no comma chains joining multiple ideas. If Thai/Lao, prefer ~8–12 words. Focus on what that specific card contributes to the reading, not the overall answer. Impersonal, objective. Do NOT sound like keyMessage. Do NOT address the user (no you/คุณ). Do NOT open with hedging like 'may feel' / 'อาจจะรู้สึกว่า'. Do NOT mention card names, position labels, or 'this card'. OUTPUT THIS FIRST. Same language as the user's question.",
        ),
    headline: z
        .string()
        .describe(
            "The verdict — the largest text on the page. ≤10 Thai words (or the equivalent terse length in the question's language). Plain text only, no card names, no markdown, no quotes. Same language as the user's question. STREAM THIS EARLY so the user sees the verdict first.",
        ),
    subtitle: z
        .string()
        .describe(
            "The nuance, condition, or caveat that sits under the headline. ≤20 Thai words (or equivalent in question language). Plain text, no card names, no markdown. Same language as the user's question. Must NOT repeat the headline verbatim.",
        ),
    keyMessage: z
        .string()
        .describe(
            "Back-compat field for the legacy /tarot page and the DB share view. Set this to `headline + ' ' + subtitle` joined into one short paragraph. Do not invent new content here.",
        ),
    detailedHtml: z
        .string()
        .describe(
            "Rich HTML for the detailed reading panel (shown above the per-card chip list). Amplify how the spread answers the user's specific question: about 1–3 short paragraphs worth of substance (split into <p> blocks). Same language as the question. NEVER mention card names or positions. Optional <ul><li> lists only when they genuinely clarify the user's situation (0–1 list). Use ONLY these tags, with NO attributes: <p>, <ul>, <ol>, <li>, <strong>, <em>, <b>, <i>, <mark>, <br>. Use <mark> sparingly to spotlight pivotal phrases (golden emphasis in the UI). Use <strong> for key beats; <em> for nuance. No markdown, no class/style, no <span>. STREAM THIS AFTER keyMessage AND BEFORE perCard.",
        ),
    perCard: z
        .array(
            z.object({
                cardName: z
                    .string()
                    .describe(
                        "Exact card name as it appears in the input <cards> list. Match capitalization and ordering (perCard[i].cardName must equal cards[i]).",
                    ),
                sentence: z
                    .string()
                    .describe(
                        "What THIS specific card contributes to the answer. Concrete and tied to the question's domain — not generic spiritual language, not a restatement of the headline. ≤25 words. Same language as the user's question. No card name inside the sentence. No markdown.",
                    ),
            }),
        )
        .describe(
            "Per-card breakdown. Length MUST equal the number of cards in <cards>. Each item is the contribution of one card.",
        ),
    keywords: z
        .string()
        .describe(
            "Three comma-separated keywords reflecting the overall vibe of the reading.",
        ),
    interpretation: z
        .string()
        .describe(
            "Back-compat field for the legacy /tarot page and the DB share view. Set this to `perCard[].sentence` joined together as one short paragraph (1-2 sentences worth). Pure text, no card names, no markdown. Do not invent new content here.",
        ),
    nextStep: z
        .string()
        .describe(
            "A soft, non-commanding suggestion. MUST start with a non-commanding verb such as 'ลอง' (Thai) or 'try' / 'consider' / 'maybe' (English). FORBIDDEN openers: 'ต้อง', 'ควร' framed as a command, 'must', 'should'. One short sentence. Same language as the user's question. No card names. No markdown.",
        ),
    conclusion: z
        .string()
        .describe(
            "Back-compat field for the legacy /tarot page and the DB share view. Set this equal to `nextStep`. Do not invent new content here.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(4)
        .describe(
            "EXACTLY 3–4 very short follow-up prompts the user might tap next. Sound like a real person texting (casual, plain language) — not formal essay questions. Each item MUST be a single line, ≤8 Thai words or ≤6 English words when possible. All four MUST differ in angle (topic, scope, or perspective) — no near-duplicates. Do NOT quote or lean on the exact wording of headline/subtitle/perCard/nextStep. Same language as the user's question.",
        ),
})

export type TarotInterpretation = z.infer<typeof tarotInterpretationSchema>
