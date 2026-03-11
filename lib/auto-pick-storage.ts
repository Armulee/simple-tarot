const STORAGE_KEY = "askingfate_auto_pick"

export function loadAutoPickFromStorage(): boolean {
    if (typeof window === "undefined") return false
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === "true") return true
        return false
    } catch {
        return false
    }
}

export function saveAutoPickToStorage(value: boolean): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
        /* ignore */
    }
}
