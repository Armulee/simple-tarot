import { z } from "zod"

/**
 * Schema order matters for streaming: detailedHtml streams first so the rich
 * "key takeaways" block appears at the very top of the reading, followed by
 * the per-card insights (the "card says" section) below it.
 */
export const tarotInterpretationSchema = z.object({
    detailedHtml: z
        .string()
        .describe(
            "A short, decorated HTML block (1-3 paragraphs) that magnifies the key messages of the reading in the context of the user's question. ALLOWED TAGS ONLY: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, and <span class=\"highlight-gold\">. Use <h2> sparingly for a short headline (e.g., a one-line verdict) and <h3> for subheaders. Use <strong>/<em> for emphasis. Use <span class=\"highlight-gold\">…</span> to highlight 1-3 key phrases in a golden palette so the user can spot the important bit at a glance. Use <ul>/<ol> ONLY when a short list genuinely makes the message easier to scan — never force a list. Keep it between 1 and 3 paragraphs. Do NOT include any other tags, attributes, inline styles, classes, scripts, links, or images. Do NOT wrap the response in <html>, <body>, ``` fences, or Markdown. Write in the SAME language as the user's question.",
        ),
    cardInsights: z
        .array(z.string())
        .describe(
            "A short, punchy 1-sentence insight for each card. Jump straight to the meaning. Do NOT mention 'this card', 'the card', the card name, or the position label. Write in the SAME language as the user's question — never English unless the question is English.",
        ),
    keywords: z
        .string()
        .describe(
            "Three comma-separated keywords reflecting the overall vibe of the reading.",
        ),
    interpretation: z
        .string()
        .describe(
            "The main 6-12 sentence reading based on the question and spread, in a warm and conversational tone.",
        ),
    conclusion: z
        .string()
        .describe(
            "A short, human, calming wrap-up that concludes the reading without sounding like a tagline.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(5)
        .describe(
            "3-5 concise, specific follow-up questions the user could ask next. Write as user questions.",
        ),
})

export type TarotInterpretation = z.infer<typeof tarotInterpretationSchema>
