const STORAGE_KEY = "askingfate_landing_mode"

/**
 * Which landing experience the visitor sees at `/`.
 *
 * - `immerse` — the talking fortune teller (the default for everyone)
 * - `legacy`  — the original typewriter hero + composer
 *
 * Toggled by the floating button at the bottom right of either mode.
 */
export type LandingMode = "immerse" | "legacy"

export const DEFAULT_LANDING_MODE: LandingMode = "immerse"

export function loadLandingModeFromStorage(): LandingMode {
    if (typeof window === "undefined") return DEFAULT_LANDING_MODE
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "legacy"
            ? "legacy"
            : DEFAULT_LANDING_MODE
    } catch {
        return DEFAULT_LANDING_MODE
    }
}

export function saveLandingModeToStorage(value: LandingMode): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
        /* ignore */
    }
}

/** `?mode=legacy` / `?mode=immerse` wins for one navigation (deep links, QA). */
export function readLandingModeFromQuery(search: string): LandingMode | null {
    const value = new URLSearchParams(search).get("mode")
    return value === "legacy" || value === "immerse" ? value : null
}
