import { z } from "zod"

/** Domains where tarot is not a substitute for licensed or clinical advice. */
export const QUESTION_DOMAINS = [
    "general",
    "legal",
    "medical",
    "financial",
] as const

export type QuestionDomain = (typeof QUESTION_DOMAINS)[number]

export function isSensitiveQuestionDomain(
    domain: QuestionDomain | string | undefined | null,
): domain is Exclude<QuestionDomain, "general"> {
    return domain === "legal" || domain === "medical" || domain === "financial"
}

export function parseQuestionDomain(
    value: string | undefined | null,
): QuestionDomain | undefined {
    if (
        value === "general" ||
        value === "legal" ||
        value === "medical" ||
        value === "financial"
    ) {
        return value
    }
    return undefined
}

/**
 * Canonical topic buckets. The first three double as the lookup keys for the
 * codex meaning picker (`pickMeaning` matches "love" / "career" / "money"
 * substrings), so free-form topics like "social media growth" or Thai topic
 * strings no longer silently fall through to the general meanings.
 */
export const SITUATION_TOPICS = [
    "love",
    "career",
    "money",
    "health",
    "family",
    "education",
    "travel",
    "spirituality",
    "decision",
    "other",
] as const

export const situationSchema = z.object({
    topic: z
        .enum(SITUATION_TOPICS)
        .describe(
            "The life-area bucket of the CURRENT question (English enum value only, even for non-English questions). Use 'decision' for should-I choices without a clearer bucket, 'other' only when nothing fits.",
        ),
    intent: z.string().describe("e.g. reconciliation, success, change, uncertainty"),
    emotion: z.string().describe("e.g. hope, anxiety, confusion, curiosity"),
    focus: z.string().describe("The specific focus or concern of the user"),
    questionDomain: z
        .enum(QUESTION_DOMAINS)
        .describe(
            "Classify the USER'S QUESTION (not the cards). legal: law, contracts, litigation, rights, immigration rules, disputes. medical: symptoms, diagnosis, treatment, drugs, clinical or crisis mental health. financial: investing, trading, tax filing, debt restructuring, retirement planning that implies regulated financial advice. general: everything else (relationships, spirituality, everyday work stress without regulated advice, creative projects, etc.).",
        ),
    needsClarification: z
        .boolean()
        .describe(
            "true ONLY when the current question is too vague to know what it refers to (e.g. 'Should I do it?' with no context identifying 'it'). When true, the narrator will avoid invented specifics and invite the user to say more.",
        ),
    cardReadingDirection: z
        .string()
        .describe(
            "3-6 sentences: what should the tarot answer BE? Synthesize the card meanings against the user's question and context. State the verdict, the reasoning from each card, and the key advice. This is a directive for the narrator, not user-facing text.",
        ),
})

export type SituationExtract = z.infer<typeof situationSchema>
