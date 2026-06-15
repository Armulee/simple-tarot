/**
 * A "Character" is a person the user knows (name + birth data). Characters
 * power the synastry (compatibility) and life-monitor features. Adding one is
 * gated to paid plans — see app/api/characters and lib/payments/plan-limits.
 */
export type Character = {
    id: string
    name: string
    birthDay: number
    birthMonth: number
    birthYear: number
    /** Birth time may be unknown — null means "not provided". */
    birthHour: number | null
    birthMinute: number | null
    birthCountry: string | null
    birthState: string | null
    /** Resolved from country/state at create time, for astrology calc. */
    lat: number | null
    lng: number | null
    timezone: number | null
    createdAt: string
    updatedAt: string
}

/** Raw row as stored in the `characters` Supabase table. */
export type CharacterRow = {
    id: string
    owner_user_id: string
    did: string | null
    name: string
    birth_day: number
    birth_month: number
    birth_year: number
    birth_hour: number | null
    birth_minute: number | null
    birth_country: string | null
    birth_state: string | null
    lat: number | null
    lng: number | null
    timezone: number | null
    created_at: string
    updated_at: string
}

/** Payload accepted by POST /api/characters. */
export type CreateCharacterInput = {
    name: string
    birthDay: number
    birthMonth: number
    birthYear: number
    birthHour?: number | null
    birthMinute?: number | null
    birthCountry?: string | null
    birthState?: string | null
    lat?: number | null
    lng?: number | null
    timezone?: number | null
}

export function normalizeCharacter(row: CharacterRow): Character {
    return {
        id: row.id,
        name: row.name,
        birthDay: row.birth_day,
        birthMonth: row.birth_month,
        birthYear: row.birth_year,
        birthHour: row.birth_hour,
        birthMinute: row.birth_minute,
        birthCountry: row.birth_country,
        birthState: row.birth_state,
        lat: row.lat,
        lng: row.lng,
        timezone: row.timezone,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}
