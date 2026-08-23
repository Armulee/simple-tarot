/**
 * A thread is named after the first thing the person actually asked.
 *
 * It used to be a model-written summary, which produced titles like
 * "ผลลัพธ์หลังอั…" — unreadable in a list of threads. Their own words are
 * always the better label, so this only tidies punctuation and trims.
 */

const MAX_TITLE_LENGTH = 80

export function threadTitleFromQuestion(question: string): string {
    const cleaned = question
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^["'“”‘’]+/, "")
        .replace(/["'“”‘’]+$/, "")
        .replace(/[.。!?！？:：;；]+$/g, "")
        .trim()

    if (cleaned.length <= MAX_TITLE_LENGTH) return cleaned
    return `${cleaned.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
}
