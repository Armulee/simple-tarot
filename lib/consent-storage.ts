"use client"

export type CookiePreferences = {
    essential: true
    analytics: boolean
    marketing: boolean
}

export type CookieConsentState = {
    decisionMade: boolean
    preferences: CookiePreferences
    updatedAt: number | null
}

export type LegacyCombinedConsent = "accepted" | "declined" | null

export const NOTICE_ACKNOWLEDGEMENT_KEY = "askingfate-notice-ack-v1"
export const COOKIE_CONSENT_KEY = "askingfate-cookie-preferences-v1"
export const LEGACY_COMBINED_CONSENT_KEY = "cookie-consent-v1"

export const NOTICE_CONSENT_EVENT = "notice-consent-changed"
export const COOKIE_PREFERENCES_EVENT = "cookie-preferences-changed"

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
    essential: true,
    analytics: false,
    marketing: false,
}

export const DEFAULT_COOKIE_CONSENT_STATE: CookieConsentState = {
    decisionMade: false,
    preferences: DEFAULT_COOKIE_PREFERENCES,
    updatedAt: null,
}

function canUseStorage() {
    return typeof window !== "undefined"
}

function normalizeCookiePreferences(
    value?: Partial<CookiePreferences> | null,
): CookiePreferences {
    return {
        essential: true,
        analytics: Boolean(value?.analytics),
        marketing: Boolean(value?.marketing),
    }
}

export function readNoticeAcknowledgement(): boolean {
    if (!canUseStorage()) return false
    try {
        const raw = window.localStorage.getItem(NOTICE_ACKNOWLEDGEMENT_KEY)
        if (!raw) return false
        if (raw === "accepted") return true
        const parsed = JSON.parse(raw) as { status?: string } | null
        return parsed?.status === "accepted"
    } catch {
        return false
    }
}

export function writeNoticeAcknowledgement(
    acknowledged: boolean,
    updatedAt = Date.now(),
) {
    if (!canUseStorage()) return
    try {
        if (acknowledged) {
            window.localStorage.setItem(
                NOTICE_ACKNOWLEDGEMENT_KEY,
                JSON.stringify({
                    status: "accepted",
                    updatedAt,
                }),
            )
        } else {
            window.localStorage.removeItem(NOTICE_ACKNOWLEDGEMENT_KEY)
        }
    } catch {
        // Best-effort only.
    }
}

export function readCookieConsentState(): CookieConsentState {
    if (!canUseStorage()) return DEFAULT_COOKIE_CONSENT_STATE
    try {
        const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY)
        if (!raw) return DEFAULT_COOKIE_CONSENT_STATE
        const parsed = JSON.parse(raw) as Partial<CookieConsentState>
        return {
            decisionMade: Boolean(parsed?.decisionMade),
            preferences: normalizeCookiePreferences(parsed?.preferences),
            updatedAt:
                typeof parsed?.updatedAt === "number" ? parsed.updatedAt : null,
        }
    } catch {
        return DEFAULT_COOKIE_CONSENT_STATE
    }
}

export function writeCookieConsentState(
    state: Pick<CookieConsentState, "decisionMade" | "preferences">,
    updatedAt = Date.now(),
) {
    if (!canUseStorage()) return
    try {
        window.localStorage.setItem(
            COOKIE_CONSENT_KEY,
            JSON.stringify({
                decisionMade: state.decisionMade,
                preferences: normalizeCookiePreferences(state.preferences),
                updatedAt,
            } satisfies CookieConsentState),
        )
    } catch {
        // Best-effort only.
    }
}

export function hasNoticeAcknowledgement(): boolean {
    return readNoticeAcknowledgement()
}

export function hasAnalyticsConsent(): boolean {
    const state = readCookieConsentState()
    return state.decisionMade && state.preferences.analytics
}

export function readLegacyCombinedConsent(): LegacyCombinedConsent {
    if (!canUseStorage()) return null
    try {
        const raw = window.localStorage.getItem(LEGACY_COMBINED_CONSENT_KEY)
        return raw === "accepted" || raw === "declined" ? raw : null
    } catch {
        return null
    }
}
