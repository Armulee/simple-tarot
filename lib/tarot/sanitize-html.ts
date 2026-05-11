import DOMPurify from "isomorphic-dompurify"

/**
 * Tags the AI is allowed to use inside the `detailedHtml` field.
 *
 * Keep this list intentionally tiny — these are the only tags rendered in the
 * "Detailed" key-takeaways block at the top of a tarot reading.
 */
const ALLOWED_TAGS = [
    "h2",
    "h3",
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
 */
export function sanitizeDetailedHtml(input: string | null | undefined): string {
    if (!input) return ""
    const trimmed = String(input).trim()
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
