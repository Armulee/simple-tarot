/**
 * Utility functions for generating readable slugs from tarot readings
 */

// Removed unused TAROT_CARDS constant

// Common question themes for slug generation (currently unused but kept for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const QUESTION_THEMES = [
    "love",
    "relationship",
    "career",
    "work",
    "money",
    "finance",
    "health",
    "family",
    "friendship",
    "travel",
    "decision",
    "future",
    "past",
    "present",
    "spiritual",
    "guidance",
    "wisdom",
    "truth",
    "purpose",
    "destiny",
    "fate",
    "karma",
    "soul",
    "heart",
    "mind",
    "body",
    "spirit",
    "energy",
    "vibration",
    "manifestation",
    "abundance",
    "success",
    "happiness",
    "peace",
    "harmony",
    "balance",
    "growth",
    "transformation",
    "change",
    "new-beginning",
    "ending",
    "cycle",
    "journey",
]

/**
 * Clean and slugify a string
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
        .slice(0, 50) // Limit length
}

/**
 * Extract meaningful words from a question
 */
function extractKeywords(question: string): string[] {
    const words = question
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .filter(
            (word) =>
                ![
                    "the",
                    "and",
                    "for",
                    "are",
                    "but",
                    "not",
                    "you",
                    "all",
                    "can",
                    "had",
                    "her",
                    "was",
                    "one",
                    "our",
                    "out",
                    "day",
                    "get",
                    "has",
                    "him",
                    "his",
                    "how",
                    "its",
                    "may",
                    "new",
                    "now",
                    "old",
                    "see",
                    "two",
                    "way",
                    "who",
                    "boy",
                    "did",
                    "man",
                    "men",
                    "put",
                    "say",
                    "she",
                    "too",
                    "use",
                ].includes(word)
        )

    return words.slice(0, 3) // Take first 3 meaningful words
}

/**
 * Generate a readable slug from the question text
 */
export function generateTarotSlug(
    question: string,
    _cards: string[], // eslint-disable-line @typescript-eslint/no-unused-vars
    _interpretation?: string // eslint-disable-line @typescript-eslint/no-unused-vars
): string {
    // Clean and slugify the question directly
    let baseSlug = slugify(question)

    // If the question is too short or empty, use keywords
    if (baseSlug.length < 10) {
        const keywords = extractKeywords(question)
        if (keywords.length > 0) {
            baseSlug = keywords.slice(0, 4).join("-")
        } else {
            baseSlug = "tarot-reading"
        }
    }

    // Limit the length to keep URLs reasonable
    if (baseSlug.length > 60) {
        const words = baseSlug.split("-")
        baseSlug = words
            .slice(0, Math.ceil(60 / (baseSlug.length / words.length)))
            .join("-")
    }

    // Add a random suffix for uniqueness
    const randomSuffix = Math.random().toString(36).slice(2, 6)

    return `${baseSlug}-${randomSuffix}`
}

/**
 * Generate a fallback slug if the main generation fails
 */
export function generateFallbackSlug(): string {
    const themes = [
        "mystical",
        "divine",
        "cosmic",
        "spiritual",
        "sacred",
        "ancient",
        "wisdom",
        "guidance",
    ]
    const randomTheme = themes[Math.floor(Math.random() * themes.length)]
    const randomSuffix = Math.random().toString(36).slice(2, 8)

    return `${randomTheme}-reading-${randomSuffix}`
}

/**
 * Validate if a slug is properly formatted
 */
export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 100
}
