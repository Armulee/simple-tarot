export type Arcana = "major" | "minor"
export type Suit = "wands" | "cups" | "swords" | "pentacles" | null

export type TarotCard = {
    slug: string
    name: string
    arcana: Arcana
    number?: number // 0-21 for major
    suit: Suit // null for major
    rank?: string // Ace..King for minor
    uprightKeywords: string[]
    reversedKeywords: string[]
    description: string
}

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
}

const majorNames = [
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
]

const suitList: Exclude<Suit, null>[] = ["wands", "cups", "swords", "pentacles"]
const ranks = [
    "Ace",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Page",
    "Knight",
    "Queen",
    "King",
]

const suitUpright: Record<Exclude<Suit, null>, string[]> = {
    wands: ["energy", "passion", "action", "creativity"],
    cups: ["emotion", "relationships", "intuition", "connection"],
    swords: ["thought", "clarity", "conflict", "truth"],
    pentacles: ["work", "resources", "stability", "health"],
}

const suitReversed: Record<Exclude<Suit, null>, string[]> = {
    wands: ["delays", "burnout", "impulsiveness", "scattered"],
    cups: [
        "emotional-block",
        "misunderstanding",
        "avoidance",
        "oversensitivity",
    ],
    swords: ["confusion", "stress", "miscommunication", "overthinking"],
    pentacles: ["instability", "overspending", "overwork", "stagnation"],
}

export const TAROT_CARDS: TarotCard[] = [
    // Major Arcana 0-21
    ...majorNames.map(
        (name, i): TarotCard => ({
            slug: slugify(name),
            name,
            arcana: "major",
            number: i,
            suit: null,
            uprightKeywords: [
                "archetype",
                "lesson",
                "cycle",
                i === 0 ? "beginnings" : i === 21 ? "completion" : "growth",
            ],
            reversedKeywords: [
                "resistance",
                "delay",
                "imbalance",
                i === 0
                    ? "hesitation"
                    : i === 21
                      ? "loose-ends"
                      : "reassessment",
            ],
            description: `Major Arcana — ${name}. A milestone on the Fool's Journey representing themes of transformation and perspective.`,
        })
    ),
    // Minor Arcana 56
    ...suitList.flatMap((suit) =>
        ranks.map((rank): TarotCard => {
            const name = `${rank} of ${suit.charAt(0).toUpperCase()}${suit.slice(1)}`
            return {
                slug: slugify(name),
                name,
                arcana: "minor",
                suit,
                rank,
                uprightKeywords: suitUpright[suit],
                reversedKeywords: suitReversed[suit],
                description: `Minor Arcana — ${name}. Practical themes of ${suit}.`,
            }
        })
    ),
]

export function getCardBySlug(slug: string): TarotCard | undefined {
    return TAROT_CARDS.find((c) => c.slug === slug)
}

export function getMajor(): TarotCard[] {
    return TAROT_CARDS.filter((c) => c.arcana === "major").sort(
        (a, b) => (a.number ?? 0) - (b.number ?? 0)
    )
}

export function getMinorBySuit(suit: Exclude<Suit, null>): TarotCard[] {
    return TAROT_CARDS.filter((c) => c.arcana === "minor" && c.suit === suit)
}

export function getAllCards(): TarotCard[] {
    return TAROT_CARDS
}
