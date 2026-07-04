/**
 * Codex stand-in built from the repo's own bundled card-meaning JSON
 * (lib/tarot/meanings/en/<slug>.json) so the harness grounds prompts in the
 * app's real content instead of invented meanings. Mirrors TarotCodexRow.
 */
import { TAROT_CARDS } from "@/lib/tarot/cards"
import type { TarotCodexRow } from "@/lib/tarot/rag"
import { getBaseCardName } from "@/lib/tarot/rag"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const REPO = "/home/user/simple-tarot"
const NAME_TO_SLUG = new Map(TAROT_CARDS.map((c) => [c.name, c.slug] as const))

type MeaningJson = {
    upright: Record<string, { text?: string; yesNo?: string; zodiac?: string }>
    reversed: Record<string, { text?: string; yesNo?: string; zodiac?: string }>
}

export function codexRowForCard(cardDisplay: string): TarotCodexRow {
    const baseName = getBaseCardName(cardDisplay)
    const slug = NAME_TO_SLUG.get(baseName)
    if (!slug) throw new Error(`Unknown card name: "${baseName}"`)
    const raw = readFileSync(
        join(REPO, "lib/tarot/meanings/en", `${slug}.json`),
        "utf8",
    )
    const m = JSON.parse(raw) as MeaningJson
    return {
        id: 0,
        card_name: baseName,
        meaning_general: m.upright.overview?.text ?? "",
        reversed_meaning_general: m.reversed.overview?.text ?? "",
        meaning_love: m.upright.relationships?.text ?? null,
        reversed_meaning_love: m.reversed.relationships?.text ?? null,
        meaning_career: m.upright.work?.text ?? null,
        reversed_meaning_career: m.reversed.work?.text ?? null,
        meaning_financial: m.upright.finance?.text ?? null,
        reversed_meaning_financial: m.reversed.finance?.text ?? null,
        advice: null,
        astrology: m.upright.overview?.zodiac ?? null,
        timing: null,
        yes_no: m.upright.overview?.yesNo ?? null,
    }
}

export function codexMapForCards(cards: string[]): Map<string, TarotCodexRow> {
    const map = new Map<string, TarotCodexRow>()
    for (const c of cards) {
        const base = getBaseCardName(c)
        if (!map.has(base)) map.set(base, codexRowForCard(c))
    }
    return map
}
