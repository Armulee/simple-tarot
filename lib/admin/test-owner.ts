/**
 * QA/test data exclusion for the admin dashboard.
 *
 * Readings made by the test account are real `chat_sessions` rows, but they are
 * not real usage, so every admin surface hides them. Set `TEST_OWNER_ID` to the
 * test account's `owner_user_id` (comma-separate to exclude more than one);
 * leave it unset — the default — and nothing is filtered.
 */

/** Ids are interpolated into PostgREST filter strings, so keep them inert. */
const SAFE_ID = /^[A-Za-z0-9_:.@-]+$/

/** Configured test owner ids, sanitised and de-duplicated. */
export function testOwnerIds(): string[] {
    const raw = process.env.TEST_OWNER_ID ?? ""
    const ids = raw
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && SAFE_ID.test(id))
    return Array.from(new Set(ids))
}

/**
 * Drop the test account's rows from a `chat_sessions` query.
 *
 * `owner_user_id <> id` evaluates to NULL — and so filters the row out — for
 * anonymous readings, hence the explicit null branch: guests must stay in.
 */
export function excludeTestOwner<T extends { or: (filters: string) => T }>(
    query: T,
): T {
    const ids = testOwnerIds()
    if (ids.length === 0) return query
    return query.or(
        `owner_user_id.is.null,owner_user_id.not.in.(${ids.join(",")})`,
    )
}
