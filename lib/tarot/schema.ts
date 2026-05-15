import { z } from "zod"

/**
 * Schema field order matters: `streamObject` emits keys in declaration order,
 * and the chat-session UI reveals each section as its key first arrives. The
 * declaration order below mirrors the on-screen layout exactly:
 *
 *   1. cardInsights  → hero card / "card say" italic quotes
 *   2. headline      ⎫
 *   3. subtitle      ⎬  Key-message box
 *   4. keyMessage    ⎭  (back-compat — restate of headline + subtitle)
 *   5. detailedHtml  → "Detailed" AI-decorated paragraph block
 *   6. perCard       → Per-card chip list
 *   7. nextStep      → Soft next-step line under the per-card list
 *   8. keywords      ⎫
 *   9. interpretation⎬  Back-compat for the legacy /tarot page and the
 *  10. conclusion    ⎭  DB-backed `shared_tarot` view (deterministic
 *                       restatements of the new fields — see descriptions)
 *  11. suggestions   → Follow-up prompt chips
 */
export const tarotInterpretationSchema = z.object({
    cardInsights: z
        .array(z.string())
        .describe(
            "Ultra-short ONE line for the on-screen card strip under each card image (must fit a small italic quote). HARD CAP: ≤12 Thai words OR ≤10 English words (match question language). One clause only — no semicolons, no comma chains joining multiple ideas. If Thai/Lao, prefer ~8–12 words. Focus on what that specific card contributes to the reading, not the overall answer. Impersonal, objective. Do NOT sound like keyMessage. Do NOT address the user (no you/คุณ). Do NOT open with hedging like 'may feel' / 'อาจจะรู้สึกว่า'. Do NOT mention card names, position labels, or 'this card'. STREAM THIS FIRST so the hero card quotes fill in as soon as possible. Same language as the user's question.",
        ),
    headline: z
        .string()
        .describe(
            "The verdict — the largest text on the page. ≤10 Thai words (or the equivalent terse length in the question's language). Plain text only, no card names, no markdown, no quotes. Same language as the user's question. STREAM THIS EARLY — right after cardInsights — so the user sees the verdict before the longer fields.",
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
            "A short, scannable HTML block of key takeaways for the reading, written in the SAME language as the user's question. Renders directly BELOW the `headline`/`subtitle` and ABOVE the per-card breakdown, so it MUST NOT contain its own headline (the headline field already plays that role). REQUIRED STRUCTURE: (1) exactly ONE short opening <p> of 1-2 sentences that sets the vibe or context — NOT a restatement of headline/subtitle; then (2) ONE <ul> with 3-5 <li> bullets, where each bullet starts with a 2-4-word lead phrase wrapped in <strong>…</strong> followed by ': ' and a concrete takeaway sentence (≤22 words per bullet). Do NOT emit a closing paragraph. Do NOT emit more than one list. Do NOT emit only paragraphs — always include the bullet list. Each bullet must cover a DIFFERENT angle (e.g. inner state, external dynamic, opportunity, watch-out, suggested move) and translate the card energy into the question's specific domain, not generic spiritual language. Use <span class=\"highlight-gold\">…</span> on 1-3 of the most must-not-miss phrases across the whole block (date, decision, action, warning) — never wrap a whole bullet or paragraph. Use <em> sparingly for soft emphasis. ALLOWED TAGS ONLY: <p>, <strong>, <em>, <ul>, <li>, <br>, and <span class=\"highlight-gold\">. FORBIDDEN TAGS: <h1>-<h6>, <ol>, <b>, <i>, and anything not listed. Do NOT include attributes, inline styles, classes (other than highlight-gold), scripts, links, or images. Do NOT wrap output in <html>, <body>, code fences, or Markdown. Do NOT mention card names. Apply the same tendency/leaning tone as the rest of the reading — never absolute verdicts.",
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
    nextStep: z
        .string()
        .describe(
            "A soft, non-commanding suggestion. MUST start with a non-commanding verb such as 'ลอง' (Thai) or 'try' / 'consider' / 'maybe' (English). FORBIDDEN openers: 'ต้อง', 'ควร' framed as a command, 'must', 'should'. One short sentence. Same language as the user's question. No card names. No markdown.",
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
