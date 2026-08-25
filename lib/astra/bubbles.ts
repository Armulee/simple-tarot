/**
 * Shaping what she says into bubbles.
 *
 * Length limits belong here, not in the model's schema: a schema that rejects
 * a bubble one character too long throws away an otherwise good reading, and
 * the model has no way to know it went over until it already has. The prompt
 * asks for short bubbles; this makes sure of it afterwards.
 */

/** Past this, a bubble stops being something someone says and becomes a page. */
const LONG_BUBBLE = 260
const MAX_BUBBLES = 4

export function tidyBubbles(texts: readonly string[]): string[] {
    return texts
        .flatMap((text) => {
            const trimmed = (text ?? "").trim()
            if (!trimmed) return []
            if (trimmed.length <= LONG_BUBBLE) return [trimmed]
            // Split a long block at sentence ends rather than truncating it:
            // her whole voice is short bubbles, so make them short.
            return trimmed
                .split(/(?<=[.!?。])\s+/)
                .map((part) => part.trim())
                .filter(Boolean)
        })
        .slice(0, MAX_BUBBLES)
}

/** Plain prose into bubbles, for when structured output was not available. */
export function textToBubbles(text: string): string[] {
    const paragraphs = (text ?? "")
        .split(/\n{2,}/)
        .map((part) => part.trim())
        .filter(Boolean)
    return tidyBubbles(paragraphs.length > 0 ? paragraphs : [text ?? ""])
}
