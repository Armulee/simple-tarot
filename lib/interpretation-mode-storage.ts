export type InterpretationMode = "auto" | "tarot" | "horoscope"

const STORAGE_KEY = "askingfate_interpretation_mode"

const VALID_MODES: InterpretationMode[] = ["auto", "tarot", "horoscope"]

export function loadInterpretationModeFromStorage(): InterpretationMode {
    if (typeof window === "undefined") return "auto"
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw && VALID_MODES.includes(raw as InterpretationMode)) {
            return raw as InterpretationMode
        }
        return "auto"
    } catch {
        return "auto"
    }
}

export function saveInterpretationModeToStorage(value: InterpretationMode): void {
    if (typeof window === "undefined") return
    try {
        window.localStorage.setItem(STORAGE_KEY, value)
    } catch {
        /* ignore */
    }
}
