import { getTarotCardCount } from "@/lib/chat/decision-schema"

/**
 * Context the loading badge uses to build phrases that reflect the *actual*
 * AI workflow for the current question rather than a fixed generic list:
 *   - Step 1 (decision) can quote the user's own question.
 *   - Step 2 (interpretation) reflects the decided response type and, for tarot
 *     draws, the model's own spread reasoning.
 */
export type LoadingDecisionInfo = {
    type?: "chat" | "draw" | "horoscope" | "support" | "oracle"
    spreadType?: string | null
    spreadReason?: string | null
}

/** Raw i18n templates pulled from `Home.loadingPhases`. */
export type LoadingPhraseTemplates = {
    step1: string[]
    step2: string[]
    decisionWithQuestion?: string
    interpret?: Partial<Record<string, string[]>>
}

const QUESTION_SNIPPET_MAX = 60

function interpolate(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_match, key: string) =>
        key in values ? values[key] : `{${key}}`,
    )
}

/** Collapse whitespace and trim a question down to a short, single-line quote. */
export function toQuestionSnippet(
    question: string | null | undefined,
    max = QUESTION_SNIPPET_MAX,
): string {
    if (!question) return ""
    const clean = question.replace(/\s+/g, " ").trim()
    if (clean.length <= max) return clean
    return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

/**
 * Step 1 — chat-decision phrases. Leads with a phrase that quotes the user's
 * question (when available), then continues with the generic decision-process
 * phrases so the cycle still has variety.
 */
export function buildDecisionPhrases(
    templates: LoadingPhraseTemplates,
    question?: string | null,
): string[] {
    const phrases: string[] = []
    const snippet = toQuestionSnippet(question)
    if (templates.decisionWithQuestion && snippet) {
        phrases.push(interpolate(templates.decisionWithQuestion, { question: snippet }))
    }
    phrases.push(...templates.step1)
    return phrases.filter((p) => typeof p === "string" && p.trim().length > 0)
}

/**
 * Step 2 — interpretation phrases tailored to the resolved decision. Uses the
 * type-specific list (e.g. tarot vs horoscope vs oracle) and, for draws, mixes
 * in the model's own one-line spread reasoning. Falls back to the generic list
 * when the decision (or its type list) isn't available yet.
 */
export function buildInterpretPhrases(
    templates: LoadingPhraseTemplates,
    decision?: LoadingDecisionInfo | null,
): string[] {
    const phrases: string[] = []
    const type = decision?.type
    const typeList = type ? templates.interpret?.[type] : undefined

    if (Array.isArray(typeList) && typeList.length > 0) {
        const count = String(getTarotCardCount(decision?.spreadType ?? undefined))
        phrases.push(...typeList.map((p) => interpolate(p, { count })))
    }

    const reason = decision?.spreadReason?.trim()
    if (reason) phrases.push(reason)

    if (phrases.length === 0) phrases.push(...templates.step2)
    return phrases.filter((p) => typeof p === "string" && p.trim().length > 0)
}
