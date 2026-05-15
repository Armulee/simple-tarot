import { supabase } from "@/lib/supabase"
import {
    applyAliasesToText,
    assignAliases,
    collectRegexRedactionItems,
    normalizeRedactionItemTypes,
    sanitizePromptForPersistence,
    type PromptAliasEntry,
    type PromptRedaction,
    type PromptRedactionType,
} from "./prompt-redaction"

export type ClientSanitizeResult = {
    sanitized: string
    redacted: boolean
    redactions: PromptRedaction[]
    redactionTypes: PromptRedactionType[]
    /** Full alias list for the session after this call (incl. previously assigned). */
    aliases: PromptAliasEntry[]
}

const REQUEST_TIMEOUT_MS = 5000

/**
 * Fire-and-forget POST of newly minted aliases to the encrypted server vault.
 * Only runs for signed-in users; never blocks the sanitisation flow.
 */
async function persistAliasesToServer(
    sessionId: string,
    userId: string,
    items: PromptRedaction[],
): Promise<void> {
    if (!sessionId || !userId || items.length === 0) return
    if (typeof window === "undefined") return
    try {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) return
        await fetch("/api/privacy-aliases", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                sessionId,
                items: items.map((i) => ({
                    type: i.type,
                    placeholder: i.placeholder,
                    original: i.original,
                })),
            }),
        })
    } catch {
        /* network failures should not block sanitisation */
    }
}

function fallbackSanitize(
    text: string,
    sessionId: string,
    userId: string | null | undefined,
): ClientSanitizeResult {
    const regexItems = collectRegexRedactionItems(text)
    if (regexItems.length && sessionId) {
        const { aliases, assigned } = assignAliases(sessionId, regexItems)
        const sanitized = applyAliasesToText(text, assigned)
        const redactions: PromptRedaction[] = assigned.map((a) => ({
            type: a.type,
            original: a.original,
            placeholder: a.placeholder,
        }))
        if (userId) {
            void persistAliasesToServer(sessionId, userId, redactions)
        }
        return {
            sanitized,
            redacted: true,
            redactions,
            redactionTypes: Array.from(new Set(redactions.map((r) => r.type))),
            aliases,
        }
    }
    const sanitized = sanitizePromptForPersistence(text)
    const redacted = sanitized !== text
    return {
        sanitized,
        redacted,
        redactions: [],
        redactionTypes: [],
        aliases: [],
    }
}

type SanitizeOptions = {
    sessionId: string
    locale?: string
    signal?: AbortSignal
    /**
     * When set, newly assigned aliases for this call are pushed to the
     * encrypted server vault (`/api/privacy-aliases`) so the same user can
     * unmask them on any device. Omit for anonymous users.
     */
    userId?: string | null
}

/**
 * Calls the LLM-backed `/api/sanitize-pii` endpoint to detect PII in a user
 * prompt, then assigns/reuses session-scoped indexed placeholders such as
 * `[Person_0]` and substitutes them into the text. The original PII never
 * leaves this device — the alias map lives only in `sessionStorage` keyed by
 * `sessionId`.
 */
export async function sanitizePromptOnClient(
    text: string,
    options: SanitizeOptions,
): Promise<ClientSanitizeResult> {
    if (typeof text !== "string" || !text.trim()) {
        return {
            sanitized: text ?? "",
            redacted: false,
            redactions: [],
            redactionTypes: [],
            aliases: [],
        }
    }

    if (typeof window === "undefined") {
        return fallbackSanitize(text, options.sessionId, options.userId)
    }

    const controller = new AbortController()
    const onAbort = () => controller.abort()
    options.signal?.addEventListener("abort", onAbort, { once: true })
    const timeout = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    )

    try {
        const response = await fetch("/api/sanitize-pii", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, locale: options.locale }),
            signal: controller.signal,
        })
        if (!response.ok) {
            return fallbackSanitize(text, options.sessionId, options.userId)
        }
        const data = (await response.json()) as {
            redactions?: Array<{ type?: unknown; original?: unknown }>
            redactionTypes?: unknown[]
            redacted?: boolean
        }
        const rawItems = Array.isArray(data?.redactions)
            ? data.redactions
                  .filter(
                      (r): r is { type: PromptRedactionType; original: string } =>
                          !!r &&
                          typeof r.original === "string" &&
                          typeof r.type === "string" &&
                              [
                                  "person",
                                  "email",
                                  "phone",
                                  "handle",
                                  "address",
                                  "card",
                                  "passport",
                                  "national_id",
                              ].includes(
                              r.type as string,
                          ),
                  )
                  .map((r) => ({
                      type: r.type as PromptRedactionType,
                      original: r.original,
                  }))
            : []

        const normalizedItems = normalizeRedactionItemTypes(rawItems)
        const { assigned } = assignAliases(
            options.sessionId,
            normalizedItems,
        )
        const nlpRedactions: PromptRedaction[] = assigned.map((a) => ({
            type: a.type,
            original: a.original,
            placeholder: a.placeholder,
        }))

        let working = applyAliasesToText(text, assigned)

        const regexItems = collectRegexRedactionItems(working)
        const { aliases: fullAliases, assigned: regexAssigned } = assignAliases(
            options.sessionId,
            regexItems,
        )
        const sanitized = regexAssigned.length
            ? applyAliasesToText(working, regexAssigned)
            : working

        const regexRedactions: PromptRedaction[] = regexAssigned.map((a) => ({
            type: a.type,
            original: a.original,
            placeholder: a.placeholder,
        }))
        const redactions = [...nlpRedactions, ...regexRedactions]

        const redacted = redactions.length > 0 || sanitized !== text
        const redactionTypes = Array.from(
            new Set(redactions.map((r) => r.type)),
        )

        if (options.userId && redactions.length > 0) {
            void persistAliasesToServer(
                options.sessionId,
                options.userId,
                redactions,
            )
        }

        return {
            sanitized,
            redacted,
            redactions,
            redactionTypes,
            aliases: fullAliases,
        }
    } catch {
        return fallbackSanitize(text, options.sessionId, options.userId)
    } finally {
        window.clearTimeout(timeout)
        options.signal?.removeEventListener("abort", onAbort)
    }
}
