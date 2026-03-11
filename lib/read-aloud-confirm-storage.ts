const STORAGE_KEY = "read-aloud-skip-confirm"

export function getSkipReadAloudConfirm(): boolean {
    if (typeof window === "undefined") return false
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "true"
    } catch {
        return false
    }
}

export function setSkipReadAloudConfirm(value: boolean): void {
    try {
        if (value) {
            window.localStorage.setItem(STORAGE_KEY, "true")
        } else {
            window.localStorage.removeItem(STORAGE_KEY)
        }
    } catch {
        /* ignore */
    }
}
