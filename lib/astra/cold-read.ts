/**
 * Picking the opening lines.
 *
 * Lines are hand-written rows in `cold_read_lines`, keyed by
 * (ลัคนา × ธาตุที่พร่อง × ดาวเสวยอายุ) with NULL meaning "matches anyone".
 * For each slot the most specific matching lines win, and the choice among
 * equals is seeded — so asking again on the same day gives the same read back,
 * which is the point.
 */

import type { ChartElement, ThaiStar } from "@/lib/astra/thai-astrology"

export type ColdReadRow = {
    id: string
    slot: number
    lagna_sign: string | null
    missing_element: string | null
    age_star: string | null
    text: string
    weight: number
}

export type ColdReadKey = {
    lagnaSign: string | null
    missingElement: ChartElement | null
    ageStar: ThaiStar
}

/** FNV-1a: small, stable across runtimes, good enough to pick a line. */
export function seedHash(...parts: (string | number)[]): number {
    let hash = 0x811c9dc5
    for (const part of parts.join("|")) {
        hash ^= part.charCodeAt(0)
        hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash >>> 0
}

function matches(row: ColdReadRow, key: ColdReadKey): boolean {
    if (row.lagna_sign && row.lagna_sign !== key.lagnaSign) return false
    if (row.missing_element && row.missing_element !== key.missingElement) {
        return false
    }
    if (row.age_star && row.age_star !== key.ageStar) return false
    return true
}

/** More keys pinned down = a line written for this exact person. */
function specificity(row: ColdReadRow): number {
    return (
        (row.lagna_sign ? 4 : 0) +
        (row.age_star ? 2 : 0) +
        (row.missing_element ? 1 : 0)
    )
}

/** Deterministically picks one line per slot, most specific first. */
export function pickColdReadLines(
    rows: readonly ColdReadRow[],
    key: ColdReadKey,
    seed: string,
): ColdReadRow[] {
    const picked: ColdReadRow[] = []

    for (const slot of [1, 2, 3]) {
        const candidates = rows
            .filter((row) => row.slot === slot && matches(row, key))
            .sort((a, b) => specificity(b) - specificity(a) || a.id.localeCompare(b.id))
        if (candidates.length === 0) continue

        const best = specificity(candidates[0])
        const tier = candidates.filter((row) => specificity(row) === best)
        const index = seedHash(seed, slot) % tier.length
        picked.push(tier[index])
    }

    return picked
}
