import { TAROT_DECK } from "./tarot-deck"

function shuffle<T>(array: T[]): T[] {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
}

export type PickedCard = {
    name: string
    isReversed: boolean
}

/**
 * Pick N random cards from the tarot deck without replacement.
 * Each card has 50% chance of being reversed.
 */
export function pickRandomCards(count: number): PickedCard[] {
    const n = Math.max(0, Math.min(count, TAROT_DECK.length))
    const shuffled = shuffle(TAROT_DECK)
    const picked: PickedCard[] = []
    for (let i = 0; i < n; i++) {
        picked.push({
            name: shuffled[i]!,
            isReversed: Math.random() < 0.5,
        })
    }
    return picked
}
