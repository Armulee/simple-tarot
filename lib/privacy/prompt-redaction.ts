/**
 * Shared privacy redaction utilities.
 *
 * Goal: keep personally identifiable information (PII) out of any text that
 * leaves the client (network requests, AI prompts, database). The raw prompt
 * stays on the user's device only, in `sessionStorage`, so it can be displayed
 * back to them in the chat UI without ever being persisted server-side.
 */

export type PromptRedactionType =
    | "person"
    | "email"
    | "phone"
    | "handle"
    | "address"
    | "card"
    | "passport"
    | "national_id"

export type PromptRedaction = {
    type: PromptRedactionType
    /** The original PII string (kept on the client only). */
    original: string
    /** The placeholder substituted into the sanitized text. */
    placeholder: string
}

export const PROMPT_REDACTION_LABELS: Record<PromptRedactionType, string> = {
    person: "[Person]",
    email: "[Email]",
    phone: "[Phone]",
    handle: "[Handle]",
    address: "[Address]",
    card: "[Card]",
    passport: "[Passport]",
    national_id: "[ID]",
}

const PROMPT_REDACTION_TYPE_BY_LABEL: Record<string, PromptRedactionType> = {
    Person: "person",
    Email: "email",
    Phone: "phone",
    Handle: "handle",
    Address: "address",
    Card: "card",
    Passport: "passport",
    /** @deprecated legacy token; still parsed for old sessions. */
    NationalId: "national_id",
    ID: "national_id",
}

export const PROMPT_PLACEHOLDER_PATTERN =
    /\[(?:Person|Email|Phone|Handle|Address|Card|Passport|ID|NationalId)(?:_\d+)?\]/g

/** Captures `Type` (e.g. `Person`) and the numeric index of indexed placeholders. */
export const PROMPT_INDEXED_PLACEHOLDER_PATTERN =
    /\[(Person|Email|Phone|Handle|Address|Card|Passport|ID|NationalId)_(\d+)\]/g

const PLACEHOLDER_TOKEN_FOR_STATS =
    /\[(?:Person|Email|Phone|Handle|Address|Card|Passport|ID|NationalId)(?:_\d+)?\]/g

/**
 * For server debug logs: how many privacy placeholder tokens appear in a string
 * (e.g. `[Person_0]`) without logging the rest of the text.
 */
export function summarizePrivacyPlaceholdersInText(text: string): {
    totalMatches: number
    uniqueTokens: string[]
} {
    const matches = text.match(PLACEHOLDER_TOKEN_FOR_STATS) ?? []
    return {
        totalMatches: matches.length,
        uniqueTokens: [...new Set(matches)],
    }
}

/**
 * System-prompt fragment for any AI route that may receive sanitized text.
 * The user-facing UI re-substitutes the originals on this device only — the
 * AI never sees the actual names, emails, etc.
 */
export const PRIVACY_REDACTION_PROMPT_RULE = `PRIVACY REDACTION RULE:
The user message and conversation history may contain privacy placeholder tokens such as [Person_0], [Person_1], [Email_0], [Phone_0], [Handle_0], [Address_0], [Card_0], [Passport_0], or [ID_0] (older messages may use [NationalId_0]). The same token always refers to the same real entity within this conversation.

You MUST treat each token as a normal proper noun and reference it verbatim in your reply when needed, e.g. "[Person_0] is not the right match for you right now."

Output requirements (REQUIRED, no exceptions):
- Whenever you reference such an entity in your reply, you MUST output the placeholder token verbatim (for example [Person_0], [Email_1], [Phone_0], [Card_0], [Passport_0], [ID_0]).
- Never write the underlying name, email, phone number, social handle, address, card number, passport number, or national ID in your reply, even if it would feel more natural — always reuse the same placeholder token the user used.
- Do NOT translate, transliterate, paraphrase, abbreviate, nickname, pronoun-replace away, or otherwise alter a placeholder. The bracketed token must appear character-for-character identical to the user's version.
- For possessives, write [Person_0]'s (apostrophe + s outside the brackets). For plurals or other suffixes, keep the placeholder unchanged and add the suffix outside the brackets, e.g. [Person_0]s.
- If you mention the entity multiple times, reuse the same indexed token every time. Do NOT renumber, reindex, merge, or split tokens.
- If you are uncertain whether a name or contact detail in your reply maps to a placeholder, use the placeholder. Never reintroduce the original PII.

Do NOT invent new placeholders. Do NOT change a token's number. Do NOT guess or restore the underlying name, email, or other private detail. Always preserve the exact bracketed token, including the underscore and number.`

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PHONE_REGEX =
    /(?:(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4})/g
const HANDLE_REGEX = /(?<![\w./@])@[A-Za-z0-9_.]{2,}/g

/** Inclusive bounds for phone-like PII (longer runs are treated as IDs, not phones). */
const PHONE_PII_MIN_DIGITS = 8
const PHONE_PII_MAX_DIGITS = 11

function isAllDigitsTheSame(digits: string): boolean {
    if (digits.length < 2) return false
    const head = digits[0]
    for (let i = 1; i < digits.length; i += 1) {
        if (digits[i] !== head) return false
    }
    return true
}

/**
 * True when the span reads as a calendar date, e.g. `1990-04-12`,
 * `12/03/2025`, `2025.03.12`. Used to keep dates of birth out of the phone /
 * card / id pipelines so they aren't accidentally redacted as PII — the
 * horoscope extractor needs to read them. Accepts ISO `YYYY-MM-DD`,
 * day-month-year, and month-day-year orderings with `-`, `/`, or `.`
 * separators. Years 1900-2099 (Gregorian) and 2400-2699 (Buddhist Era) count.
 */
export function looksLikeCalendarDate(span: string): boolean {
    if (typeof span !== "string") return false
    const compact = span.replace(/\s+/g, "")
    const Y = "(?:19|20|2[4-6])\\d{2}"
    const M = "(?:0?[1-9]|1[0-2])"
    const D = "(?:0?[1-9]|[12]\\d|3[01])"
    const SEP = "[-./]"
    const isoYmd = new RegExp(`^${Y}${SEP}${M}${SEP}${D}$`)
    const dmy = new RegExp(`^${D}${SEP}${M}${SEP}${Y}$`)
    const mdy = new RegExp(`^${M}${SEP}${D}${SEP}${Y}$`)
    return isoYmd.test(compact) || dmy.test(compact) || mdy.test(compact)
}

/**
 * Regex defence-in-depth: only digit runs that look like phone numbers are redacted.
 * - Length must be &gt; 7 and ≤ 11 digits (typical phone lengths).
 * - Runs longer than 11 digits are assumed to be national IDs or similar — not redacted as phone.
 * - Repetitive sequences (e.g. 88888888) are not PII.
 */
export function phoneDigitsQualifyAsPii(digitsOnly: string): boolean {
    const len = digitsOnly.length
    if (len < PHONE_PII_MIN_DIGITS || len > PHONE_PII_MAX_DIGITS) return false
    if (isAllDigitsTheSame(digitsOnly)) return false
    return true
}

/**
 * If a redacted span is a 13-digit Thai national ID, treat it as `national_id`
 * even when the LLM mislabeled it (often as `phone`). Regex defence-in-depth
 * runs on text that may already be masked, so this runs on API output before
 * `assignAliases`.
 */
export function normalizeRedactionItemTypes(
    items: Array<{ type: PromptRedactionType; original: string }>,
): Array<{ type: PromptRedactionType; original: string }> {
    return items.map((item) => {
        const d = item.original.replace(/\D/g, "")
        if (d.length === 13 && passesThaiNationalIdChecksum(d)) {
            return { ...item, type: "national_id" }
        }
        return item
    })
}

/**
 * Candidate spans for payment card numbers (PAN): grouped or contiguous,
 * 13–19 digits after normalizing. Order matters when replacing: run before phone.
 */
const CARD_CANDIDATE_REGEXES: ReadonlyArray<RegExp> = [
    /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    /\b\d{4}\s\d{6}\s\d{5}\b/g,
    /\b\d{13,19}\b/g,
]

/**
 * Luhn (mod 10) checksum used by ISO/IEC 7812 card numbers.
 */
export function passesLuhnChecksum(digitsOnly: string): boolean {
    if (!/^\d{2,}$/.test(digitsOnly)) return false
    let sum = 0
    let double = false
    for (let i = digitsOnly.length - 1; i >= 0; i--) {
        let n = digitsOnly.charCodeAt(i) - 48
        if (n < 0 || n > 9) return false
        if (double) {
            n *= 2
            if (n > 9) n -= 9
        }
        sum += n
        double = !double
    }
    return sum % 10 === 0
}

/**
 * Regex defence-in-depth for PANs: length 13–19, not all identical digits, passes Luhn.
 */
export function creditCardDigitsQualifyAsPii(digitsOnly: string): boolean {
    const len = digitsOnly.length
    if (len < 13 || len > 19) return false
    if (isAllDigitsTheSame(digitsOnly)) return false
    return passesLuhnChecksum(digitsOnly)
}

function replaceCreditCardSpans(text: string, placeholder: string): string {
    let out = text
    for (const cardRe of CARD_CANDIDATE_REGEXES) {
        const r = new RegExp(cardRe.source, cardRe.flags)
        out = out.replace(r, (match) => {
            const digits = match.replace(/\D/g, "")
            return creditCardDigitsQualifyAsPii(digits) ? placeholder : match
        })
    }
    return out
}

/** Thai citizen ID (เลขบัตรประชาชน): 13 digits with mod-11 check digit. */
export function passesThaiNationalIdChecksum(digits13: string): boolean {
    if (!/^\d{13}$/.test(digits13)) return false
    if (isAllDigitsTheSame(digits13)) return false
    let sum = 0
    for (let i = 0; i < 12; i += 1) {
        sum += parseInt(digits13.charAt(i), 10) * (13 - i)
    }
    const check = (11 - (sum % 11)) % 10
    return check === parseInt(digits13.charAt(12), 10)
}

/** Typical formatting: 1-2345-67890-12-3 (13 digits total). */
const THAI_NATIONAL_ID_FORMATTED =
    /\b\d[\s-]\d{4}[\s-]\d{5}[\s-]\d{2}[\s-]\d\b/g
const THAI_NATIONAL_ID_PLAIN = /\b\d{13}\b/g

function replaceThaiNationalIdSpans(text: string, placeholder: string): string {
    const replacer = (match: string) => {
        const d = match.replace(/\D/g, "")
        return passesThaiNationalIdChecksum(d) ? placeholder : match
    }
    let out = text
    out = out.replace(
        new RegExp(THAI_NATIONAL_ID_FORMATTED.source, THAI_NATIONAL_ID_FORMATTED.flags),
        replacer,
    )
    out = out.replace(
        new RegExp(THAI_NATIONAL_ID_PLAIN.source, THAI_NATIONAL_ID_PLAIN.flags),
        replacer,
    )
    return out
}

/**
 * Passport / travel document number immediately after a label (English or Thai).
 * Multiple patterns: `Passport number …`, `passport: …`, or `passport AB…` (bare).
 */
const PASSPORT_REGEXES: ReadonlyArray<RegExp> = [
    /(?:passport|travel\s*document|หนังสือเดินทาง|เลขหนังสือเดินทาง)\s+(?:no\.?|number)\s+([A-Za-z0-9](?:[A-Za-z0-9\s/-]{4,16}[A-Za-z0-9]))/gi,
    /(?:passport|travel\s*document|หนังสือเดินทาง|เลขหนังสือเดินทาง)\s*(?:#\s*[:\s]*|:\s*)([A-Za-z0-9](?:[A-Za-z0-9\s/-]{4,16}[A-Za-z0-9]))/gi,
    /(?:passport|travel\s*document|หนังสือเดินทาง|เลขหนังสือเดินทาง)\s+(?!(?:no\.?|number)\s)([A-Za-z0-9](?:[A-Za-z0-9\s/-]{4,16}[A-Za-z0-9]))(?=\s*[,.;\n]|$)/gi,
]

export function passportSpanQualifiesAsPii(span: string): boolean {
    const compact = span.replace(/[\s/-]+/g, "")
    if (compact.length < 6 || compact.length > 14) return false
    if (!/^[A-Za-z0-9]+$/.test(compact)) return false
    if (!/\d/.test(compact)) return false
    if (isAllDigitsTheSame(compact)) return false
    if (/^\d{13}$/.test(compact) && passesThaiNationalIdChecksum(compact)) {
        return false
    }
    return true
}

function replacePassportSpans(text: string, placeholder: string): string {
    let out = text
    for (const passportRe of PASSPORT_REGEXES) {
        const r = new RegExp(passportRe.source, passportRe.flags)
        out = out.replace(r, (full, g1: string) => {
            const inner = typeof g1 === "string" ? g1.trim() : ""
            if (!inner || !passportSpanQualifiesAsPii(inner)) return full
            const idx = full.indexOf(inner)
            if (idx === -1) return full
            return full.slice(0, idx) + placeholder + full.slice(idx + inner.length)
        })
    }
    return out
}

/**
 * Same shapes as {@link sanitizePromptForPersistence}, but as structured items
 * so the client can run them through {@link assignAliases} and get `[Email_0]`,
 * `[Phone_1]`, etc. — aligned with NLP redactions from `/api/sanitize-pii`.
 */
export function collectRegexRedactionItems(
    text: string,
): Array<{ type: PromptRedactionType; original: string }> {
    if (typeof text !== "string" || !text) return []
    const raw: Array<{ type: PromptRedactionType; original: string }> = []

    let m: RegExpExecArray | null
    const emailRe = new RegExp(EMAIL_REGEX.source, EMAIL_REGEX.flags)
    while ((m = emailRe.exec(text)) !== null) {
        raw.push({ type: "email", original: m[0] })
    }
    const handleRe = new RegExp(HANDLE_REGEX.source, HANDLE_REGEX.flags)
    while ((m = handleRe.exec(text)) !== null) {
        raw.push({ type: "handle", original: m[0] })
    }

    const thaiFmt = new RegExp(
        THAI_NATIONAL_ID_FORMATTED.source,
        THAI_NATIONAL_ID_FORMATTED.flags,
    )
    while ((m = thaiFmt.exec(text)) !== null) {
        const d = m[0].replace(/\D/g, "")
        if (passesThaiNationalIdChecksum(d)) {
            raw.push({ type: "national_id", original: m[0] })
        }
    }
    const thaiPlain = new RegExp(
        THAI_NATIONAL_ID_PLAIN.source,
        THAI_NATIONAL_ID_PLAIN.flags,
    )
    while ((m = thaiPlain.exec(text)) !== null) {
        const d = m[0].replace(/\D/g, "")
        if (passesThaiNationalIdChecksum(d)) {
            raw.push({ type: "national_id", original: m[0] })
        }
    }

    for (const passportRe of PASSPORT_REGEXES) {
        const pr = new RegExp(passportRe.source, passportRe.flags)
        while ((m = pr.exec(text)) !== null) {
            const inner = m[1]?.trim() ?? ""
            if (inner && passportSpanQualifiesAsPii(inner)) {
                raw.push({ type: "passport", original: inner })
            }
        }
    }

    for (const cardRe of CARD_CANDIDATE_REGEXES) {
        const r = new RegExp(cardRe.source, cardRe.flags)
        while ((m = r.exec(text)) !== null) {
            const digits = m[0].replace(/\D/g, "")
            if (creditCardDigitsQualifyAsPii(digits)) {
                raw.push({ type: "card", original: m[0] })
            }
        }
    }

    const phoneRe = new RegExp(PHONE_REGEX.source, PHONE_REGEX.flags)
    while ((m = phoneRe.exec(text)) !== null) {
        if (looksLikeCalendarDate(m[0])) continue
        const digits = m[0].replace(/\D/g, "")
        if (phoneDigitsQualifyAsPii(digits)) {
            raw.push({ type: "phone", original: m[0] })
        }
    }

    const sorted = raw.sort((a, b) => b.original.length - a.original.length)
    const seen = new Set<string>()
    const out: Array<{ type: PromptRedactionType; original: string }> = []
    for (const item of sorted) {
        const key = `${item.type}::${item.original}`
        if (seen.has(key)) continue
        if (!text.includes(item.original)) continue
        seen.add(key)
        out.push(item)
    }
    return out
}

/**
 * Light, regex-only sanitiser used as a defence-in-depth pass on the server
 * before persistence. It does NOT detect names — that work is done up front
 * by the LLM-based `/api/sanitize-pii` route on the client. This function
 * only catches obvious shapes (emails, @handles, Thai national IDs with checksum,
 * passport numbers after labels, payment card spans with Luhn,
 * phone-like number runs) that might still leak through if the client skipped
 * sanitisation. Order: national ID and passport before cards and phones so
 * 13-digit IDs are not mistaken for cards or phones.
 */
export function sanitizePromptForPersistence(input: unknown): string {
    if (typeof input !== "string") return ""
    let out = input
    out = out.replace(EMAIL_REGEX, PROMPT_REDACTION_LABELS.email)
    out = out.replace(HANDLE_REGEX, PROMPT_REDACTION_LABELS.handle)
    out = replaceThaiNationalIdSpans(out, PROMPT_REDACTION_LABELS.national_id)
    out = replacePassportSpans(out, PROMPT_REDACTION_LABELS.passport)
    out = replaceCreditCardSpans(out, PROMPT_REDACTION_LABELS.card)
    out = out.replace(PHONE_REGEX, (match) => {
        if (looksLikeCalendarDate(match)) return match
        const digits = match.replace(/\D/g, "")
        if (!phoneDigitsQualifyAsPii(digits)) return match
        return PROMPT_REDACTION_LABELS.phone
    })
    return out
}

type StoredMessage = Record<string, unknown>

const PERSISTED_MESSAGE_BLACKLIST = new Set([
    "displayText",
    "displayQuestion",
    "isSanitizing",
])

/**
 * Strip client-only fields (raw text restored from sessionStorage) from
 * messages before they are persisted, and apply the regex sanitiser as a
 * defence-in-depth pass on `text`/`question`.
 */
export function sanitizeMessagesForPersistence(
    messages: unknown,
): StoredMessage[] {
    if (!Array.isArray(messages)) return []
    return messages
        .map((raw) => {
            if (!raw || typeof raw !== "object") return null
            const m = raw as StoredMessage
            const cleaned: StoredMessage = {}
            for (const [key, value] of Object.entries(m)) {
                if (PERSISTED_MESSAGE_BLACKLIST.has(key)) continue
                cleaned[key] = value
            }
            if (typeof cleaned.text === "string") {
                cleaned.text = sanitizePromptForPersistence(cleaned.text)
            }
            if (typeof cleaned.question === "string") {
                cleaned.question = sanitizePromptForPersistence(
                    cleaned.question,
                )
            }
            return cleaned
        })
        .filter((m): m is StoredMessage => m !== null)
}

const RAW_PROMPT_STORAGE_PREFIX = "askingfate.raw-prompt."

export function buildPrivacyStorageKey(messageId: string): string {
    return `${RAW_PROMPT_STORAGE_PREFIX}${messageId}`
}

export function saveRawPromptToSession(key: string, raw: string) {
    if (typeof window === "undefined") return
    try {
        window.sessionStorage.setItem(key, raw)
    } catch {
        /* sessionStorage may be unavailable */
    }
}

export function loadRawPromptFromSession(
    key: string | undefined | null,
): string | null {
    if (!key || typeof window === "undefined") return null
    try {
        return window.sessionStorage.getItem(key)
    } catch {
        return null
    }
}

export function removeRawPromptFromSession(key: string) {
    if (typeof window === "undefined") return
    try {
        window.sessionStorage.removeItem(key)
    } catch {
        /* sessionStorage may be unavailable */
    }
}

// ---------------------------------------------------------------------------
// Session-scoped alias map: keeps a stable `[Person_N]` token for each unique
// `(type, original)` pair we redacted from user prompts. Lives only in
// sessionStorage so it disappears when the tab closes.
// ---------------------------------------------------------------------------

export type PromptAliasEntry = {
    type: PromptRedactionType
    original: string
    placeholder: string
}

const ALIAS_STORAGE_PREFIX = "askingfate.privacy-aliases."

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function buildAliasStorageKey(sessionId: string): string {
    return `${ALIAS_STORAGE_PREFIX}${sessionId}`
}

function isValidAliasEntry(value: unknown): value is PromptAliasEntry {
    if (!value || typeof value !== "object") return false
    const v = value as Record<string, unknown>
    return (
        typeof v.original === "string" &&
        typeof v.placeholder === "string" &&
        typeof v.type === "string" &&
        v.type in PROMPT_REDACTION_LABELS
    )
}

export function loadSessionAliases(
    sessionId: string | undefined | null,
): PromptAliasEntry[] {
    if (!sessionId || typeof window === "undefined") return []
    try {
        const raw = window.sessionStorage.getItem(
            buildAliasStorageKey(sessionId),
        )
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(isValidAliasEntry)
    } catch {
        return []
    }
}

export function saveSessionAliases(
    sessionId: string | undefined | null,
    aliases: PromptAliasEntry[],
): void {
    if (!sessionId || typeof window === "undefined") return
    try {
        window.sessionStorage.setItem(
            buildAliasStorageKey(sessionId),
            JSON.stringify(aliases),
        )
    } catch {
        /* sessionStorage may be unavailable */
    }
}

function nextIndexForType(
    aliases: PromptAliasEntry[],
    type: PromptRedactionType,
): number {
    const labelPrefix = PROMPT_REDACTION_LABELS[type].slice(0, -1) + "_" // e.g. "[Person_"
    let max = -1
    for (const a of aliases) {
        if (a.type !== type) continue
        if (!a.placeholder.startsWith(labelPrefix)) continue
        const numText = a.placeholder.slice(labelPrefix.length, -1)
        const n = Number(numText)
        if (Number.isFinite(n) && n > max) max = n
    }
    return max + 1
}

/**
 * Look up or mint indexed placeholders for the given `(type, original)` items
 * within the session's alias map. Persists the merged map and returns the
 * complete list of items with their `placeholder` filled in.
 */
export function assignAliases(
    sessionId: string | undefined | null,
    items: Array<{ type: PromptRedactionType; original: string }>,
): {
    aliases: PromptAliasEntry[]
    assigned: PromptAliasEntry[]
} {
    const existing = loadSessionAliases(sessionId)
    const merged = [...existing]
    const assigned: PromptAliasEntry[] = []

    for (const item of items) {
        if (!item || typeof item.original !== "string" || !item.original) {
            continue
        }
        const found = merged.find(
            (a) => a.type === item.type && a.original === item.original,
        )
        if (found) {
            assigned.push(found)
            continue
        }
        const labelInner = PROMPT_REDACTION_LABELS[item.type].slice(1, -1) // e.g. "Person"
        const idx = nextIndexForType(merged, item.type)
        const entry: PromptAliasEntry = {
            type: item.type,
            original: item.original,
            placeholder: `[${labelInner}_${idx}]`,
        }
        merged.push(entry)
        assigned.push(entry)
    }

    if (merged.length !== existing.length) {
        saveSessionAliases(sessionId, merged)
    }
    return { aliases: merged, assigned }
}

/**
 * Replace each `original` substring in `text` with its assigned placeholder.
 * Replacements run longest-first so `Jessica Howard` is matched before
 * `Jessica` to prevent partial overlaps.
 */
export function applyAliasesToText(
    text: string,
    aliases: PromptAliasEntry[],
): string {
    if (typeof text !== "string" || !text || !aliases.length) return text
    const sorted = [...aliases].sort(
        (a, b) => b.original.length - a.original.length,
    )
    let out = text
    for (const a of sorted) {
        if (!a.original) continue
        const re = new RegExp(escapeRegExp(a.original), "g")
        out = out.replace(re, a.placeholder)
    }
    return out
}

/**
 * Replace every `[Type_N]` occurrence in `text` with its `original` from the
 * alias map. Tokens with no matching entry are left unchanged so legacy
 * `[Person]` (without index) and unknown indexes pass through verbatim.
 */
export function unmaskTextWithAliases(
    text: string,
    aliases: PromptAliasEntry[],
): string {
    if (typeof text !== "string" || !text) return text
    if (!aliases.length) return text
    const lookup = new Map<string, string>()
    for (const a of aliases) {
        lookup.set(a.placeholder, a.original)
    }
    return text.replace(
        PROMPT_INDEXED_PLACEHOLDER_PATTERN,
        (match) => lookup.get(match) ?? match,
    )
}

export { PROMPT_REDACTION_TYPE_BY_LABEL }
