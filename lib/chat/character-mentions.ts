import type { Character } from "@/types/character"

export type MentionRange = { start: number; end: number; character: Character }
export type MentionSegment = { text: string; mention: boolean }
export type ActiveMentionQuery = { start: number; query: string }

const WORD_CHAR = /[\p{L}\p{N}_]/u

function sortByNameLengthDesc(characters: Character[]): Character[] {
    return [...characters].sort((a, b) => b.name.length - a.name.length)
}

/**
 * Find every "@CharacterName" run in `text` that matches a known character by
 * name. Matches are non-overlapping and resolved longest-name-first so
 * "@Anna Lee" wins over "@Anna". The char following a match must be a
 * non-word boundary so "@Anna" doesn't match inside "@Annabel".
 */
export function findMentionRanges(
    text: string,
    characters: Character[],
): MentionRange[] {
    if (!text || characters.length === 0) return []
    const sorted = sortByNameLengthDesc(
        characters.filter((c) => c.name.trim().length > 0),
    )
    const taken = new Array<boolean>(text.length).fill(false)
    const ranges: MentionRange[] = []

    for (const character of sorted) {
        const token = `@${character.name}`
        let from = 0
        for (;;) {
            const idx = text.indexOf(token, from)
            if (idx === -1) break
            const end = idx + token.length
            const after = text[end]
            const isBoundary = after === undefined || !WORD_CHAR.test(after)

            let overlaps = false
            for (let i = idx; i < end; i++) {
                if (taken[i]) {
                    overlaps = true
                    break
                }
            }

            if (isBoundary && !overlaps) {
                for (let i = idx; i < end; i++) taken[i] = true
                ranges.push({ start: idx, end, character })
            }
            from = idx + 1
        }
    }

    return ranges.sort((a, b) => a.start - b.start)
}

/** Unique characters mentioned in `text` (for the synastry decision logic). */
export function extractMentionedCharacters(
    text: string,
    characters: Character[],
): Character[] {
    const seen = new Set<string>()
    const result: Character[] = []
    for (const range of findMentionRanges(text, characters)) {
        if (!seen.has(range.character.id)) {
            seen.add(range.character.id)
            result.push(range.character)
        }
    }
    return result
}

/** Split `text` into plain + mention segments for the highlight overlay. */
export function splitIntoMentionSegments(
    text: string,
    ranges: MentionRange[],
): MentionSegment[] {
    if (ranges.length === 0) return [{ text, mention: false }]
    const segments: MentionSegment[] = []
    let pos = 0
    for (const range of ranges) {
        if (range.start > pos) {
            segments.push({ text: text.slice(pos, range.start), mention: false })
        }
        segments.push({ text: text.slice(range.start, range.end), mention: true })
        pos = range.end
    }
    if (pos < text.length) {
        segments.push({ text: text.slice(pos), mention: false })
    }
    return segments
}

/**
 * If the caret sits inside an in-progress "@query" — an "@" at the start or
 * after whitespace, followed by a whitespace-free run up to the caret — return
 * it so the composer can show the character picker. Null otherwise.
 */
export function getActiveMentionQuery(
    text: string,
    caret: number,
): ActiveMentionQuery | null {
    if (caret < 0 || caret > text.length) return null
    let i = caret - 1
    while (i >= 0) {
        const ch = text[i]
        if (ch === "@") {
            const before = text[i - 1]
            if (before === undefined || /\s/.test(before)) {
                const query = text.slice(i + 1, caret)
                if (/\s/.test(query)) return null
                return { start: i, query }
            }
            return null
        }
        if (/\s/.test(ch)) return null
        i--
    }
    return null
}
