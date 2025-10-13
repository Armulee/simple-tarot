/**
 * Generate random positions for sparkles within a container
 * @param count Number of sparkles to generate positions for
 * @param containerWidth Container width (default: 100%)
 * @param containerHeight Container height (default: 100%)
 * @returns Array of position objects with top, left, width, height, and animationDelay
 */
export function generateRandomSparklePositions(
    count: number = 10,
    containerWidth: number = 100,
    containerHeight: number = 100
) {
    const positions = []

    for (let i = 0; i < count; i++) {
        // Generate random position (avoiding edges by 5-15%)
        const marginX = 5 + Math.random() * 10 // 5-15% margin
        const marginY = 5 + Math.random() * 10 // 5-15% margin

        const left = marginX + Math.random() * (containerWidth - 2 * marginX)
        const top = marginY + Math.random() * (containerHeight - 2 * marginY)

        // Random size between 1.5px and 3.5px
        const size = 1.5 + Math.random() * 2

        // Random animation delay between 0.5s and 5s
        const animationDelay = 0.5 + Math.random() * 4.5

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
 * Generate random sparkle positions for a card component
 * @param count Number of sparkles (default: 10)
 * @returns Array of sparkle position objects
 */
export function generateCardSparklePositions(count: number = 10) {
    return generateRandomSparklePositions(count, 100, 100)
}
