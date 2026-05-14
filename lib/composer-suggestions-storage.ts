const STORAGE_KEY = "askingfate_composer_suggestions"

/** Default on; persisted value `false` turns suggestions off. */
export function loadComposerSuggestionsEnabledFromStorage(): boolean {
    if (typeof window === "undefined") return true
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === "false") return false
        return true
    } catch {
        return true
    }
}

export function saveComposerSuggestionsEnabledToStorage(value: boolean): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
        /* ignore */
    }
}
