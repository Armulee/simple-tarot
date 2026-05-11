"use client"

export type UserAgeCategory = "unknown" | "minor" | "adult" | "blocked"

export type AgeGateBirthData = {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    country?: string | null
    state?: string | null
    lat?: number | null
    lng?: number | null
    timezone?: number | null
}

export type AgeGateState = {
    category: UserAgeCategory
    age: number | null
    birth: AgeGateBirthData | null
    checkedAt: number | null
}

export const AGE_GATE_STORAGE_KEY = "askingfate-age-gate-v1"
export const AGE_GATE_EVENT = "age-gate-status-changed"

export const DEFAULT_AGE_GATE_STATE: AgeGateState = {
    category: "unknown",
    age: null,
    birth: null,
    checkedAt: null,
}

function canUseStorage() {
    return typeof window !== "undefined"
}

export function calculateAgeFromBirthDate(
    birth: Pick<AgeGateBirthData, "year" | "month" | "day">,
    today = new Date(),
): number {
    let age = today.getFullYear() - birth.year
    const monthDelta = today.getMonth() + 1 - birth.month
    const dayDelta = today.getDate() - birth.day

    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
        age -= 1
    }

    return age
}

export function resolveAgeCategory(age: number): UserAgeCategory {
    if (age < 13) return "blocked"
    if (age < 18) return "minor"
    return "adult"
}

export function buildAgeGateState(
    birth: AgeGateBirthData,
    checkedAt = Date.now(),
): AgeGateState {
    const age = calculateAgeFromBirthDate(birth)
    return {
        category: resolveAgeCategory(age),
        age,
        birth,
        checkedAt,
    }
}

export function readAgeGateState(): AgeGateState {
    if (!canUseStorage()) return DEFAULT_AGE_GATE_STATE
    try {
        const raw = window.localStorage.getItem(AGE_GATE_STORAGE_KEY)
        if (!raw) return DEFAULT_AGE_GATE_STATE
        const parsed = JSON.parse(raw) as Partial<AgeGateState>
        const birth =
            parsed?.birth &&
            typeof parsed.birth === "object" &&
            typeof parsed.birth.year === "number" &&
            typeof parsed.birth.month === "number" &&
            typeof parsed.birth.day === "number" &&
            typeof parsed.birth.hour === "number" &&
            typeof parsed.birth.minute === "number"
                ? {
                      year: parsed.birth.year,
                      month: parsed.birth.month,
                      day: parsed.birth.day,
                      hour: parsed.birth.hour,
                      minute: parsed.birth.minute,
                      country:
                          typeof parsed.birth.country === "string"
                              ? parsed.birth.country
                              : null,
                      state:
                          typeof parsed.birth.state === "string"
                              ? parsed.birth.state
                              : null,
                      lat:
                          typeof parsed.birth.lat === "number"
                              ? parsed.birth.lat
                              : null,
                      lng:
                          typeof parsed.birth.lng === "number"
                              ? parsed.birth.lng
                              : null,
                      timezone:
                          typeof parsed.birth.timezone === "number"
                              ? parsed.birth.timezone
                              : null,
                  }
                : null

        const state: AgeGateState = {
            category:
                parsed?.category === "minor" ||
                parsed?.category === "adult" ||
                parsed?.category === "blocked"
                    ? parsed.category
                    : "unknown",
            age: typeof parsed?.age === "number" ? parsed.age : null,
            birth,
            checkedAt:
                typeof parsed?.checkedAt === "number" ? parsed.checkedAt : null,
        }

        if (state.birth) {
            const refreshed = buildAgeGateState(
                state.birth,
                state.checkedAt ?? Date.now(),
            )
            return refreshed
        }

        return state
    } catch {
        return DEFAULT_AGE_GATE_STATE
    }
}

export function writeAgeGateState(state: AgeGateState) {
    if (!canUseStorage()) return
    try {
        window.localStorage.setItem(AGE_GATE_STORAGE_KEY, JSON.stringify(state))
    } catch {
        // Best-effort only.
    }
}

export function hasAgeGateAccess(): boolean {
    const state = readAgeGateState()
    return state.category === "minor" || state.category === "adult"
}

export function isMinorUser(): boolean {
    return readAgeGateState().category === "minor"
}

export function isBlockedUnderAgeUser(): boolean {
    return readAgeGateState().category === "blocked"
}
