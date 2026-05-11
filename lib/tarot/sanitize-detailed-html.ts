/**
 * Sanitizes AI-produced tarot detailed HTML for safe `dangerouslySetInnerHTML`.
 * Only semantic tags; no attributes (no class/style/on*) to keep XSS surface minimal.
 *
 * Intended for client `useEffect` only — `dompurify` expects a browser `window`.
 */

const ALLOWED_TAGS = [
    "p",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "mark",
    "br",
] as const

export function stripTarotDetailedHtmlTags(text: string): string {
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

export async function sanitizeTarotDetailedHtml(html: string): Promise<string> {
    const trimmed = html.trim()
    if (!trimmed) return ""

    const { default: DOMPurify } = await import("dompurify")
    return DOMPurify.sanitize(trimmed, {
        ALLOWED_TAGS: [...ALLOWED_TAGS],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: false,
    })
}
