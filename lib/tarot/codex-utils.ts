import { getCardBySlug, getAllCards } from "./cards"

export function cardNameToSlug(cardName: string): string {
    return cardName
        .toLowerCase()
        .replace(/\s*\(reversed\)/g, "")
        .replace(/\s*reversed/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
}

export function getKeywordsForCard(cardName: string): string[] {
    const slug = cardNameToSlug(cardName)
    const card = getCardBySlug(slug)
    if (card) {
        return [...card.uprightKeywords, ...card.reversedKeywords]
    }
    const all = getAllCards()
    const byName = all.find(
        (c) =>
            c.name.toLowerCase() === cardName.toLowerCase() ||
            c.name.toLowerCase().replace(/\s+/g, " ") ===
                cardName.toLowerCase().replace(/\s+/g, " ")
    )
    if (byName) {
        return [...byName.uprightKeywords, ...byName.reversedKeywords]
    }
    return []
}
