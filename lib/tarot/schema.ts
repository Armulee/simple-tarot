import { z } from "zod"

/**
 * Schema order matters for streaming so the chat-session UI can reveal
 * sections progressively:
 *   detailedHtml → cardInsights → headline → subtitle → keyMessage →
 *   perCard → keywords → interpretation → nextStep → conclusion → suggestions
 *
 * `detailedHtml` streams first so the decoration-rich "key takeaways" HTML
 * block can appear at the very top of the reading (above the per-card
 * "card says" insights), followed by the structured headline/subtitle/
 * perCard/nextStep fields that drive the refreshed chat-session result UI.
 *
 * The "legacy" fields (cardInsights/keyMessage/keywords/interpretation/
 * conclusion) are still populated by the model so the legacy `/tarot` page
 * and the DB-backed `shared_tarot` view keep rendering unchanged.
 */
export const tarotInterpretationSchema = z.object({
    detailedHtml: z
        .string()
        .describe(
            "A short, decorated HTML block (1-3 paragraphs) that magnifies the key messages of the reading in the context of the user's question. This block renders BELOW the `headline`/`subtitle` (the 'key message') and ABOVE the cards, so it MUST NOT contain its own headline — the headline field already plays that role. ALLOWED TAGS ONLY: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, and <span class=\"highlight-gold\">. FORBIDDEN TAGS: <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, and anything not in the allowed list. Use <strong>/<em> for emphasis. Use <span class=\"highlight-gold\">…</span> to highlight 1-3 key phrases in a golden palette so the user can spot the important bit at a glance. Use <ul>/<ol> ONLY when a short list (2-4 items) genuinely makes the message easier to scan — never force a list. Keep it between 1 and 3 paragraphs of human-readable content. Do NOT include any attributes, inline styles, classes, scripts, links, or images. Do NOT wrap the response in <html>, <body>, ``` fences, or Markdown. Write in the SAME language as the user's question.",
        ),
    cardInsights: z
        .array(z.string())
        .describe(
            "Ultra-short ONE line for the on-screen card strip under each card image (must fit a small italic quote). HARD CAP: ≤12 Thai words OR ≤10 English words (match question language). One clause only — no semicolons, no comma chains joining multiple ideas. If Thai/Lao, prefer ~8–12 words. Focus on what that specific card contributes to the reading, not the overall answer. Impersonal, objective. Do NOT sound like keyMessage. Do NOT address the user (no you/คุณ). Do NOT open with hedging like 'may feel' / 'อาจจะรู้สึกว่า'. Do NOT mention card names, position labels, or 'this card'. Same language as the user's question.",
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
