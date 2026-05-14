/**
 * Deterministic PRNG in [0, 1). Same seed ⇒ same sequence on server and client (SSR-safe).
 */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

export type SparklePositionStyle = {
    top: string
    left: string
    width: string
    height: string
    animationDelay: string
}

/** Seed used for StarCard sparkles so SSR HTML matches hydration. */
export const STAR_CARD_SPARKLE_SEED = 0x51a212e

/**
 * Generate random positions for sparkles within a container
 * @param count Number of sparkles to generate positions for
 * @param containerWidth Container width (default: 100%)
 * @param containerHeight Container height (default: 100%)
 * @param seed If set, uses a deterministic PRNG (SSR-safe). If omitted, uses Math.random().
 * @returns Array of position objects with top, left, width, height, and animationDelay
 */
export function generateRandomSparklePositions(
    count: number = 10,
    containerWidth: number = 100,
    containerHeight: number = 100,
    seed?: number
): SparklePositionStyle[] {
    const random = seed !== undefined ? mulberry32(seed) : Math.random
    const positions: SparklePositionStyle[] = []

    for (let i = 0; i < count; i++) {
        const marginX = 5 + random() * 10
        const marginY = 5 + random() * 10

        const left = marginX + random() * (containerWidth - 2 * marginX)
        const top = marginY + random() * (containerHeight - 2 * marginY)

        const size = 1.5 + random() * 2

        const animationDelay = 0.5 + random() * 4.5

        positions.push({
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            animationDelay: `${animationDelay}s`,
        })
    }

    return positions
}

/**
 * Generate sparkle positions for a card component.
 * Pass `seed` (e.g. STAR_CARD_SPARKLE_SEED) so server and client output match.
 */
export function generateCardSparklePositions(
    count: number = 10,
    seed: number = STAR_CARD_SPARKLE_SEED
) {
    return generateRandomSparklePositions(count, 100, 100, seed)
}
