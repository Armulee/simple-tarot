import { generateObject } from "ai"
import { z } from "zod"
import {
    looksLikeCalendarDate,
    type PromptRedactionType,
} from "@/lib/privacy/prompt-redaction"

const MODEL = "openai/gpt-4o-mini"

const REDACTION_TYPES = [
    "person",
    "email",
    "phone",
    "handle",
    "address",
    "card",
    "passport",
    "national_id",
] as const

const sanitizerOutputSchema = z.object({
    redactions: z
        .array(
            z.object({
                type: z.enum(REDACTION_TYPES),
                original: z.string(),
            }),
        )
        .max(20),
})

const SANITIZER_SYSTEM_PROMPT = `You are a privacy guard. Your only job is to find personally
identifiable information (PII) inside a single short user message and report it
back as structured JSON.

Detect PII in ANY language and ANY script (Latin, Thai, Lao, Chinese,
Japanese, Korean, Cyrillic, Arabic, etc.). Names may be a single token or
multi-token, may include diacritics, particles, or honorifics.

Categories:
- "person": Full human names (First name + Last name/Surname). 
  EXCLUDE: Single first names, standalone nicknames (e.g., "Jessica", "นภัส", "เมย์", "แบงค์"), pronouns, generic role words ("mom", "boss", "the doctor").
  CRITICAL EXCEPTION: You MUST redact a single first name or nickname ONLY IF it appears alongside highly specific identifying context (e.g., specific company name, exact job title, or specific narrow location).
- "email": email addresses.
- "phone": phone numbers (>= 7 digits). Do NOT treat as a phone any run whose digits are all the same (e.g. 88888888, 0000000) — those are not realistic phone numbers.
- "handle": @username style handles.
- "address": street addresses, building names, room numbers.
- "card": payment card numbers (PAN / credit or debit card number) exactly as in the message (including spaces or dashes between groups).
- "passport": passport or travel-document number, exactly as written (may include spaces).
- "national_id": government-issued national ID number (e.g. Thai 13-digit citizen ID), exactly as written. Do NOT treat as a national ID any number whose digits are all identical (e.g. 1111111111111).

Rules:
- Return ONLY items that genuinely look like PII. Do NOT redact standalone first names/nicknames, common nouns, zodiac signs, planets, tarot terms, deities, places, country names, days,
  months, weekdays, or generic relationships.
- DATES OF BIRTH AND OTHER CALENDAR DATES ARE NOT PII. Never redact a calendar date in any format — e.g. "1990-04-12", "12/03/2025", "12.03.2025", "12-03-2025", "12 มี.ค. 2533", "12 มีนาคม 2568", "March 12, 1990", "Jan 5 1990" — regardless of how many digits the year contains or whether it looks phone-like. A horoscope feature reads dates of birth from the chat, so they must survive sanitisation.
- REPETITIVE DIGITS: Never redact as phone, national_id, card, or passport any substring where, after removing spaces/dashes/punctuation, every digit is the same (e.g. "8888888888", "0000 0000", "99-99-99-99-99"). Such patterns are not realistic identifiers.
- Each entry's "original" must be the EXACT substring as it appears in the
  user's text (preserve case, accents, scripts). Do NOT add quotes.
- Prefer the LONGEST contiguous span (e.g. "Jessica Howard" not "Jessica" +
  "Howard").
- If there is no PII, return an empty array.
- Return JSON only.`

type RawRedaction = {
    type: PromptRedactionType
    original: string
}

function dedupeAndFilter(
    items: Array<{ type: PromptRedactionType; original: string }>,
    sourceText: string,
): RawRedaction[] {
    const out: RawRedaction[] = []
    const seen = new Set<string>()
    const sorted = [...items]
        .filter((item) => item?.original && item.original.length >= 1)
        .sort((a, b) => b.original.length - a.original.length)
    for (const item of sorted) {
        const key = `${item.type}::${item.original}`
        if (seen.has(key)) continue
        if (!sourceText.includes(item.original)) continue
        seen.add(key)
        out.push({ type: item.type, original: item.original })
    }
    return out
}

const NUMERIC_REDACTION_TYPES: PromptRedactionType[] = [
    "phone",
    "national_id",
    "card",
    "passport",
]

function digitsOnly(s: string): string {
    return s.replace(/\D/g, "")
}

/** Same idea as client regex pass: 88888888 / 0000000 are not real PII. */
function isRepetitiveDigitRun(digits: string): boolean {
    if (digits.length < 2) return false
    const head = digits[0]!
    for (let i = 1; i < digits.length; i += 1) {
        if (digits[i] !== head) return false
    }
    return true
}

function filterTrivialRepetitiveNumbers(items: RawRedaction[]): RawRedaction[] {
    return items.filter((item) => {
        if (!NUMERIC_REDACTION_TYPES.includes(item.type)) return true
        const d = digitsOnly(item.original)
        if (d.length < 2) return true
        return !isRepetitiveDigitRun(d)
    })
}

/**
 * The LLM occasionally flags a date of birth (e.g. "1990-04-12") as a phone
 * or national ID. Strip those — the horoscope extractor reads birthdates from
 * the chat and they must survive sanitisation.
 */
function filterCalendarDates(items: RawRedaction[]): RawRedaction[] {
    return items.filter((item) => !looksLikeCalendarDate(item.original))
}

export async function POST(req: Request) {
    let text = ""
    try {
        const body = (await req.json()) as { text?: unknown; locale?: unknown }
        if (typeof body?.text === "string") {
            text = body.text
        }
    } catch {
        return new Response(JSON.stringify({ error: "INVALID_BODY" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    const trimmed = text.trim()
    if (!trimmed) {
        return Response.json({
            redacted: false,
            redactions: [],
            redactionTypes: [],
        })
    }

    if (trimmed.length > 2000) {
        return Response.json({
            redacted: false,
            redactions: [],
            redactionTypes: [],
        })
    }

    try {
        const { object } = await generateObject({
            model: MODEL,
            schema: sanitizerOutputSchema,
            system: SANITIZER_SYSTEM_PROMPT,
            prompt: `User message:\n${trimmed}\n\nReturn the structured PII list now.`,
            temperature: 0,
            maxRetries: 0,
        })

        const redactions = filterCalendarDates(
            filterTrivialRepetitiveNumbers(
                dedupeAndFilter(object.redactions, text),
            ),
        )
        const redactionTypes = Array.from(
            new Set(redactions.map((r) => r.type)),
        )

        return Response.json({
            redacted: redactions.length > 0,
            redactions,
            redactionTypes,
        })
    } catch (error) {
        console.error("[sanitize-pii] failed:", error)
        return Response.json({
            redacted: false,
            redactions: [],
            redactionTypes: [],
        })
    }
}
