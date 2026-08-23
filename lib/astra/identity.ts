/**
 * Single source of truth for the fortune teller's identity.
 *
 * Her display name and honorific are NEVER hardcoded in components. Copy lives
 * in `messages/<locale>.json` under the `Astra` namespace; every UI string that
 * needs to address her interpolates `{honorific}` / `{name}` / `{fullName}`
 * from here, so renaming her is a one-file change per locale.
 *
 * `ASTRA_CANONICAL_NAME` is the internal, language-independent handle used for
 * prompts, logs, and analytics — not for display.
 */

export const ASTRA_MESSAGES_NAMESPACE = "Astra" as const
export const ASTRA_CANONICAL_NAME = "Astra" as const

export type AstraIdentity = {
    /** Given name only, e.g. "อัสตรา". */
    name: string
    /** Honorific / title used in front of the name, e.g. "แม่หมอ". */
    honorific: string
    /** Honorific + name as one addressable string, e.g. "แม่หมออัสตรา". */
    fullName: string
    /** What she does, in the user's language. Never mentions AI. */
    role: string
}

/** Keys expected under the `Astra` namespace in every locale file. */
export const ASTRA_IDENTITY_KEYS = [
    "name",
    "honorific",
    "fullName",
    "role",
] as const satisfies readonly (keyof AstraIdentity)[]

/**
 * Builds the identity from any next-intl translator scoped to the `Astra`
 * namespace. Kept translator-agnostic so both client hooks and server
 * components can share it.
 */
export function buildAstraIdentity(
    translate: (key: (typeof ASTRA_IDENTITY_KEYS)[number]) => string,
): AstraIdentity {
    return {
        name: translate("name"),
        honorific: translate("honorific"),
        fullName: translate("fullName"),
        role: translate("role"),
    }
}
