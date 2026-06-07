import { z } from "zod"

/**
 * Symbolic energy archetypes the oracle reading anchors on. The model
 * picks one that best reflects the question's symbolic gravity. Treat
 * this list as guidance, not a hard fence — the AI may pick a close
 * synonym if it reads truer for the question.
 */
export const oracleEnergySchema = z.enum([
    "reflection",
    "transformation",
    "letting_go",
    "new_beginnings",
    "hidden_truths",
    "patience",
    "healing",
    "self_discovery",
    "divine_timing",
    "emotional_release",
    "intuition",
    "alignment",
    "courage",
    "boundary",
    "gratitude",
])
export type OracleEnergy = z.infer<typeof oracleEnergySchema>

/**
 * Structured oracle reading. Sectioned to match a "premium spiritual
 * reading card" layout — energy label, headline message, deeper
 * meaning, and practical guidance bullets.
 *
 * The reading deliberately avoids supernatural claims: it interprets
 * the user's question symbolically rather than asserting that any
 * spirit, deceased person, or external entity is communicating.
 */
export const oracleReadingSchema = z.object({
    energy: oracleEnergySchema.describe(
        "Single symbolic energy anchoring the reading.",
    ),
    energyLabel: z
        .string()
        .min(2)
        .max(40)
        .describe(
            "Small energy tag rendered as a chip directly under the headline. 2-5 words in the user's language (e.g. 'Safety & Stillness', 'การเริ่มต้นใหม่', 'ความชัดเจนกำลังมา'). Not a sentence — a tag.",
        ),
    message: z
        .string()
        .min(6)
        .max(120)
        .describe(
            "THE HEADLINE OF THE FORTUNE CARD. 3 to 8 words. One line. This IS the reading — if the user reads only this and walks away, they should already have their answer. CLARITY OVERRIDES MYSTICISM — understood in under 2 seconds, no poetic riddles, no abstract symbolism, no 'energy / vibration / portal / cosmic thread' as the subject. Speak directly to the user with concrete language. Generated from the question's specific subject + emotional intention — NOT pulled from a theme bank (no defaulting to healing / transformation / new beginnings / self-love / awakening / divine timing / letting go unless they truly emerge from THIS question). If the same line could fit a completely different question, rewrite it. No multi-sentence messages, no semicolons, no em-dash splits. Written in the user's language.",
        ),
    deeperMeaning: z
        .string()
        .min(40)
        .max(600)
        .describe(
            "1-2 short paragraphs (HTML fragment) explaining WHY this headline appeared and what part of the user's situation it reflects. Interpretation only, not the answer itself. Use language like 'this may reflect...', 'symbolically...'. NEVER assert supernatural certainty. ALLOWED TAGS ONLY: <p>, <strong>, <em>, <br>, and <span class=\"highlight-gold\">. Use <span class=\"highlight-gold\">…</span> to highlight 1-3 key phrases (a feeling, a turning point, a thing to notice). Highlight WORDS or short phrases — never whole paragraphs. No headings, no lists, no other tags, attributes, classes, scripts, links, images, code fences, or Markdown. Written in the user's language.",
        ),
    guidance: z
        .array(
            z
                .string()
                .min(4)
                .max(160)
                .describe(
                    "One practical guidance bullet — emotional growth, self-awareness, perspective, healing, confidence. Always empowering. Written in the user's language.",
                ),
        )
        .min(3)
        .max(5)
        .describe(
            "3-5 practical guidance bullets, each a single empowering sentence in the user's language.",
        ),
    closing: z
        .string()
        .min(4)
        .max(200)
        .optional()
        .describe(
            "Optional closing whisper (1 short sentence) sealing the reading. Written in the user's language.",
        ),
})

export type OracleReading = z.infer<typeof oracleReadingSchema>

/**
 * Streaming partial — same shape with every leaf relaxed so we can
 * render progressively as the model emits keys in declaration order.
 */
export const streamingOracleReadingSchema = z.object({
    energy: oracleEnergySchema.optional(),
    energyLabel: z.string().optional(),
    message: z.string().optional(),
    deeperMeaning: z.string().optional(),
    guidance: z.array(z.string()).optional(),
    closing: z.string().optional(),
})

export type StreamingOracleReading = z.infer<typeof streamingOracleReadingSchema>
