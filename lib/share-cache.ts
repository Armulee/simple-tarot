/**
 * Client-side caching for share links to avoid repeated API calls
 */

interface CacheEntry {
    link: string
    timestamp: number
    question: string
    cards: string[]
    interpretation: string
}

class ShareLinkCache {
    private cache = new Map<string, CacheEntry>()
    private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

    /**
     * Generate a cache key from the interpretation data
     */
    private generateCacheKey(
        question: string,
        cards: string[],
        interpretation: string
    ): string {
        const normalizedQuestion = question.toLowerCase().trim()
        const normalizedCards = cards
            .map((card) => card.toLowerCase().trim())
            .sort()
            .join(",")
        const normalizedInterpretation = interpretation.toLowerCase().trim()

        return `${normalizedQuestion}|${normalizedCards}|${normalizedInterpretation}`
    }

    /**
     * Check if cache entry is still valid
     */
    private isCacheValid(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp < this.CACHE_DURATION
    }

    /**
     * Get cached share link if available and valid
     */
    get(
        question: string,
        cards: string[],
        interpretation: string
    ): string | null {
        const key = this.generateCacheKey(question, cards, interpretation)
        const entry = this.cache.get(key)

        if (entry && this.isCacheValid(entry)) {
            return entry.link
        }

        // Remove expired entry
        if (entry) {
            this.cache.delete(key)
        }

        return null
    }

    /**
     * Store share link in cache
     */
    set(
        question: string,
        cards: string[],
        interpretation: string,
        link: string
    ): void {
        const key = this.generateCacheKey(question, cards, interpretation)
        this.cache.set(key, {
            link,
            timestamp: Date.now(),
            question,
            cards,
            interpretation,
        })
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Remove expired entries
     */
    cleanup(): void {
        const now = Date.now()
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= this.CACHE_DURATION) {
                this.cache.delete(key)
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; validEntries: number } {
        const now = Date.now()
        let validEntries = 0

        for (const entry of this.cache.values()) {
            if (now - entry.timestamp < this.CACHE_DURATION) {
                validEntries++
            }
        }

        return {
            size: this.cache.size,
            validEntries,
        }
    }
}

// Create a singleton instance
export const shareLinkCache = new ShareLinkCache()

// Cleanup expired entries every 10 minutes
if (typeof window !== "undefined") {
    setInterval(
        () => {
            shareLinkCache.cleanup()
        },
        10 * 60 * 1000
    )
}
