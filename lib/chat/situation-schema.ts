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

export const situationSchema = z.object({
    topic: z.string().describe("e.g. career, relationship, money, project, decision"),
    intent: z.string().describe("e.g. reconciliation, success, change, uncertainty"),
    emotion: z.string().describe("e.g. hope, anxiety, confusion, curiosity"),
    focus: z.string().describe("The specific focus or concern of the user"),
    questionDomain: z
        .enum(QUESTION_DOMAINS)
        .describe(
            "Classify the USER'S QUESTION (not the cards). legal: law, contracts, litigation, rights, immigration rules, disputes. medical: symptoms, diagnosis, treatment, drugs, clinical or crisis mental health. financial: investing, trading, tax filing, debt restructuring, retirement planning that implies regulated financial advice. general: everything else (relationships, spirituality, everyday work stress without regulated advice, creative projects, etc.).",
        ),
    cardReadingDirection: z
        .string()
        .describe(
            "2-4 sentences: what should the tarot answer BE? Synthesize the card meanings against the user's question and context. State the verdict, the reasoning from each card, and the key advice. This is a directive for the narrator, not user-facing text.",
        ),
})

export type SituationExtract = z.infer<typeof situationSchema>
