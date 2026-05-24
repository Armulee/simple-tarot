import DOMPurify from "isomorphic-dompurify"

/** Labels shorter than this are not stripped (avoids nuking common words). */
const MIN_STRIP_LABEL_LENGTH = 5

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export type DetailedHtmlStripCardSource = {
    name?: string
    meaning?: string
    isReversed?: boolean
}

/**
 * Collect display strings that might appear inside AI-authored `detailedHtml`
 * for the current spread so we can remove them even when the model ignores
 * the "no card names" prompt.
 */
export function collectDetailedHtmlStripLabels(
    cards: ReadonlyArray<DetailedHtmlStripCardSource> | null | undefined,
    extraLabels?: readonly string[] | null,
): string[] {
    const labels = new Set<string>()
    for (const raw of extraLabels ?? []) {
        const s = raw.trim()
        if (s.length >= MIN_STRIP_LABEL_LENGTH) labels.add(s)
    }
    for (const c of cards ?? []) {
        for (const raw of [c.meaning, c.name]) {
            const s = raw?.trim() ?? ""
            if (s.length >= MIN_STRIP_LABEL_LENGTH) labels.add(s)
        }
        if (c.isReversed) {
            const m = c.meaning?.trim()
            const n = c.name?.trim()
            if (m && m.length >= MIN_STRIP_LABEL_LENGTH) {
                labels.add(`${m} Reversed`)
                labels.add(`${m} (Reversed)`)
            }
            if (n && n.length >= MIN_STRIP_LABEL_LENGTH && n !== m) {
                labels.add(`${n} Reversed`)
                labels.add(`${n} (Reversed)`)
            }
        }
    }
    return [...labels].sort((a, b) => b.length - a.length)
}

/**
 * Remove known tarot card titles from an HTML fragment (longest-first so
 * "King of Pentacles" wins before "King").
 */
export function stripTarotCardLabelsFromHtml(
    html: string,
    labels: readonly string[],
): string {
    if (!html || !labels.length) return html
    let out = html
    for (const label of labels) {
        if (label.length < MIN_STRIP_LABEL_LENGTH) continue
        const re = new RegExp(escapeRegExp(label), "gi")
        out = out.replace(re, "")
    }
    return out
        .replace(/[ \t\u00a0]{2,}/g, " ")
        .replace(/\s+(<\/)/g, "$1")
        .replace(/(>)\s+/g, "$1 ")
        .replace(/<p>\s*<\/p>/gi, "")
        .trim()
}

/**
 * Tags the AI is allowed to use inside the `detailedHtml` field.
 *
 * Keep this list intentionally tiny — these are the only tags rendered in the
 * "Detailed" key-takeaways block, which sits BELOW the headline/subtitle
 * key-message box and ABOVE the cards. Headings are deliberately excluded so
 * the block stays paragraph-shaped and never duplicates the headline.
 */
const ALLOWED_TAGS = [
    "p",
    "strong",
    "em",
    "b",
    "i",
    "ul",
    "ol",
    "li",
    "br",
    "span",
]

/**
 * Whitelist of CSS classes the AI is allowed to apply.
 *
 * Any other class is silently stripped by DOMPurify's hook so the AI cannot
 * inject arbitrary class names or chase Tailwind utilities to alter the layout.
 */
const ALLOWED_CLASSES = new Set(["highlight-gold"])

let hooksInstalled = false
function ensureHooks() {
    if (hooksInstalled) return
    hooksInstalled = true
    DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
        if (data.attrName !== "class") return
        const filtered = data.attrValue
            .split(/\s+/)
            .filter((cls) => ALLOWED_CLASSES.has(cls))
            .join(" ")
            .trim()
        if (!filtered) {
            data.keepAttr = false
            return
        }
        data.attrValue = filtered
    })
}

/**
 * Sanitize an AI-generated `detailedHtml` fragment so it is safe to render via
 * `dangerouslySetInnerHTML`.
 *
 * - Only the small whitelist of tags above survives.
 * - The only attribute kept is `class`, and only when its value is in the
 *   {@link ALLOWED_CLASSES} set (currently just `highlight-gold`).
 * - Everything else (scripts, styles, event handlers, links, images, ids,
 *   custom attributes) is stripped.
 *
 * If the input is empty/whitespace, returns an empty string so callers can
 * treat it as "no detailed block" without an extra guard.
 *
 * When `options.stripCardLabelsFrom` is set, known spread card titles (and
 * optional `extraStripLabels`, e.g. `perCard[].cardName`) are removed from the
 * HTML before sanitisation so the "Detailed" block never names the cards.
 */
export function sanitizeDetailedHtml(
    input: string | null | undefined,
    options?: {
        stripCardLabelsFrom?: ReadonlyArray<DetailedHtmlStripCardSource> | null
        extraStripLabels?: readonly string[] | null
    },
): string {
    if (!input) return ""
    let trimmed = String(input).trim()
    if (!trimmed) return ""

    if (options?.stripCardLabelsFrom?.length || options?.extraStripLabels?.length) {
        const labels = collectDetailedHtmlStripLabels(
            options.stripCardLabelsFrom ?? undefined,
            options.extraStripLabels,
        )
        if (labels.length) {
            trimmed = stripTarotCardLabelsFromHtml(trimmed, labels)
        }
    }
    if (!trimmed) return ""

    ensureHooks()
    const clean = DOMPurify.sanitize(trimmed, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ["class"],
        ALLOW_DATA_ATTR: false,
        KEEP_CONTENT: true,
        FORBID_TAGS: ["style", "script"],
        FORBID_ATTR: ["style", "id", "onerror", "onload", "onclick"],
        RETURN_TRUSTED_TYPE: false,
    }) as string
    return clean.trim()
}
