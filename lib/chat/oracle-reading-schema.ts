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
        .max(60)
        .describe(
            "Short, decorative label for the chosen energy, written in the user's language (e.g. 'Reflection & Inner Wisdom', 'การปล่อยวาง'). 2-6 words.",
        ),
    message: z
        .string()
        .min(8)
        .max(280)
        .describe(
            "THE ANSWER. A direct, mystical, quote-worthy oracle message (1-3 short sentences) that ANSWERS the user's actual question. If they asked 'what does X want to tell me', this IS the message X is telling them. Never the energy archetype name. Never analysis. Personal, emotional, memorable. Written in the user's language.",
        ),
    deeperMeaning: z
        .string()
        .min(40)
        .max(900)
        .describe(
            "Short prose (2-4 short paragraphs) explaining symbolically why the message above appeared — interpretation, not the answer itself. Use language like 'the energy suggests...', 'this may reflect...', 'symbolically...'. Connect to emotions, growth, perspective, uncertainty. NEVER assert supernatural certainty. Written in the user's language. Plain text only — no HTML, no Markdown.",
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
