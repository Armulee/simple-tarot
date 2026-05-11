/**
 * Opportunistic helper that asks the Google People API for the signed-in user's
 * gender. Requires the OAuth `provider_token` returned by Supabase right after
 * the Google sign-in redirect.
 *
 * Returns `null` for any non-success path (network error, missing scope, user
 * has no gender set, "unknown" value). Never throws — gender enrichment is
 * best-effort and must never break the auth flow.
 */
export async function fetchGoogleGender(
    providerToken: string,
): Promise<string | null> {
    if (!providerToken) return null

    try {
        const response = await fetch(
            "https://people.googleapis.com/v1/people/me?personFields=genders",
            {
                headers: {
                    Authorization: `Bearer ${providerToken}`,
                },
            },
        )

        if (!response.ok) return null

        const data = (await response.json()) as {
            genders?: Array<{ value?: string | null }>
        }

        const raw = data.genders?.[0]?.value
        if (typeof raw !== "string") return null

        const normalized = raw.trim().toLowerCase()
        if (!normalized || normalized === "unknown") return null

        return normalized
    } catch {
        return null
    }
}
