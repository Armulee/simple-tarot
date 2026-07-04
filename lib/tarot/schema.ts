import { z } from "zod"

/**
 * Schema field order matters: `streamObject` emits keys in declaration order,
 * and the chat-session UI reveals each section as its key first arrives. The
 * declaration order below mirrors the on-screen layout exactly:
 *
 *   1. cardInsights  → hero card / "card say" italic quotes
 *   2. headline      ⎫
 *   3. subtitle      ⎬  Key-message box
 *   4. keyMessage    ⎭  (prose fusion of headline + subtitle)
 *   5. detailedHtml  → "Detailed" AI-decorated paragraph block
 *   6. perCard       → Per-card chip list
 *   7. nextStep      → Soft next-step line under the per-card list
 *   8. keywords      ⎫
 *   9. interpretation⎬  Main body + closing for the legacy /tarot page and
 *  10. conclusion    ⎭  the DB-backed `shared_tarot` view (real answer
 *                       prose — see descriptions)
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
            "ONE grammatical sentence (or two short ones) fusing the headline's verdict with the subtitle's nuance, written as flowing prose. Same meaning as headline+subtitle, but never a mechanical join — no missing periods, no repeated wording. Same language as the user's question.",
        ),
    detailedHtml: z
        .string()
        .describe(
            "A short, decorated HTML block (1-3 paragraphs) that magnifies the key messages of the reading in the context of the user's question. This block renders directly BELOW the `headline`/`subtitle` (the 'key message') and ABOVE the perCard breakdown, so it MUST NOT contain its own headline — the headline field already plays that role. ALLOWED TAGS ONLY: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, and <span class=\"highlight-gold\">. FORBIDDEN TAGS: <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, and anything not in the allowed list. Use <strong>/<em> for emphasis. Use <span class=\"highlight-gold\">…</span> to highlight 1-3 key phrases in a golden palette so the user can spot the important bit at a glance. Use <ul>/<ol> ONLY when a short list (2-4 items) genuinely makes the message easier to scan — never force a list. Keep it between 1 and 3 paragraphs of human-readable content. Do NOT include any attributes, inline styles, classes, scripts, links, or images. Do NOT wrap the response in <html>, <body>, ``` fences, or Markdown. Write in the SAME language as the user's question.",
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
            "A soft, non-commanding suggestion — an invitation, never an order. FORBIDDEN: 'ต้อง', 'ควร' framed as a command, 'must', 'should'. VARY the opener between readings ('Try...' is fine occasionally; so are 'A small first move could be...', 'It may help to...', 'ถ้าอยากขยับ อาจเริ่มจาก...'). One short sentence. Same language as the user's question. No card names. No markdown.",
        ),
    keywords: z
        .string()
        .describe(
            "Three comma-separated keywords reflecting the overall vibe of the reading.",
        ),
    interpretation: z
        .string()
        .describe(
            "THE MAIN ANSWER BODY — renders as the main paragraph on the legacy /tarot page and the DB share view. 3-5 complete, flowing sentences that directly answer the user's question: the leaning first, then why (woven from the cards' meanings), then what to do with it. Every sentence needs a subject — never subjectless fragments like 'Points to...' and never a join of the perCard sentences. Pure text, no card names, no markdown. Same language as the user's question.",
        ),
    conclusion: z
        .string()
        .describe(
            "A short, warm closing line that wraps up the reading in fresh words. Aligned with nextStep's direction but NOT a copy of it — different wording. One sentence. Same language as the user's question. No card names. No markdown.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(4)
        .describe(
            "EXACTLY 3–4 follow-up QUESTIONS the user would tap to ask next, written in the user's own voice and ending like a question (\"?\" or a Thai question word such as ไหม / ยังไง / เมื่อไหร่). They are NOT advice or to-do items and NOT a restatement of nextStep/conclusion — never tell the user what to do; ask what they'd want to know next. Casual, single line, ≤10 Thai words or ≤8 English words when possible. All MUST differ in angle (topic, timing, person, scope) — no near-duplicates. Do NOT quote or lean on the exact wording of headline/subtitle/perCard/nextStep. Same language as the user's question.",
        ),
})

export type TarotInterpretation = z.infer<typeof tarotInterpretationSchema>
