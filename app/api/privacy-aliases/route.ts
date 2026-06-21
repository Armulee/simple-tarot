import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
    PROMPT_REDACTION_LABELS,
    type PromptRedactionType,
} from "@/lib/privacy/prompt-redaction"
import { supabaseAdmin } from "@/lib/supabase"
import {
    bufferToBytea,
    byteaToBuffer,
    decryptAlias,
    encryptAlias,
    isMasterKeyConfigured,
} from "@/lib/privacy/server-encryption"

const VALID_PLACEHOLDER_PATTERN =
    /^\[(?:Person|Email|Phone|Handle|Address|Card|Passport|ID|NationalId)_\d+\]$/

const VALID_TYPES = new Set<PromptRedactionType>([
    "person",
    "email",
    "phone",
    "handle",
    "address",
    "card",
    "passport",
    "national_id",
])

const MAX_ITEMS_PER_REQUEST = 50
const MAX_ORIGINAL_LENGTH = 256

async function getUserFromAuth(req: NextRequest) {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return null

    const token = authHeader.slice(7)
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
        return null
    }

    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    const {
        data: { user },
        error,
    } = await supabaseClient.auth.getUser(token)
    if (error || !user) return null
    return user
}

async function verifySessionOwnership(
    sessionId: string,
    userId: string,
): Promise<boolean> {
    if (!supabaseAdmin) return false
    const { data, error } = await supabaseAdmin
        .from("chat_sessions")
        .select("id, owner_user_id")
        .eq("id", sessionId)
        .maybeSingle()
    if (error || !data) return false
    return data.owner_user_id === userId
}

function sanitizeSessionId(value: unknown): string | null {
    if (typeof value !== "string") return null
    const trimmed = value.trim().slice(0, 32)
    return trimmed || null
}

type IncomingItem = {
    type: PromptRedactionType
    placeholder: string
    original: string
}

function parseItems(raw: unknown): IncomingItem[] {
    if (!Array.isArray(raw)) return []
    const out: IncomingItem[] = []
    for (const r of raw) {
        if (!r || typeof r !== "object") continue
        const obj = r as Record<string, unknown>
        const type = typeof obj.type === "string" ? obj.type : ""
        const placeholder =
            typeof obj.placeholder === "string" ? obj.placeholder : ""
        const original = typeof obj.original === "string" ? obj.original : ""
        if (!VALID_TYPES.has(type as PromptRedactionType)) continue
        if (!VALID_PLACEHOLDER_PATTERN.test(placeholder)) continue
        if (!original || original.length > MAX_ORIGINAL_LENGTH) continue
        const labelType = type as PromptRedactionType
        const expectedPrefix =
            PROMPT_REDACTION_LABELS[labelType].slice(0, -1) + "_"
        if (!placeholder.startsWith(expectedPrefix)) continue
        out.push({ type: labelType, placeholder, original })
        if (out.length >= MAX_ITEMS_PER_REQUEST) break
    }
    return out
}

export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }
        if (!isMasterKeyConfigured()) {
            return NextResponse.json(
                { error: "PRIVACY_KEY_NOT_CONFIGURED" },
                { status: 500 },
            )
        }

        const user = await getUserFromAuth(req)
        if (!user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        let body: { sessionId?: unknown; items?: unknown }
        try {
            body = await req.json()
        } catch {
            return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
        }

        const sessionId = sanitizeSessionId(body.sessionId)
        if (!sessionId) {
            return NextResponse.json(
                { error: "MISSING_SESSION_ID" },
                { status: 400 },
            )
        }

        const items = parseItems(body.items)
        if (items.length === 0) {
            return NextResponse.json({ ok: true, inserted: 0 })
        }

        const ownsSession = await verifySessionOwnership(sessionId, user.id)
        if (!ownsSession) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
        }

        const rows = items.map((item) => {
            const encrypted = encryptAlias(item.original, user.id)
            return {
                user_id: user.id,
                session_id: sessionId,
                placeholder: item.placeholder,
                alias_type: item.type,
                ciphertext: bufferToBytea(encrypted.ciphertext),
                iv: bufferToBytea(encrypted.iv),
                auth_tag: bufferToBytea(encrypted.authTag),
                key_version: encrypted.keyVersion,
            }
        })

        const { error } = await supabaseAdmin
            .from("privacy_aliases")
            .upsert(rows, {
                onConflict: "user_id,session_id,placeholder",
                ignoreDuplicates: true,
            })

        if (error) {
            console.error("[privacy-aliases] upsert failed:", error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true, inserted: rows.length })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        console.error("[privacy-aliases] POST error:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }
        if (!isMasterKeyConfigured()) {
            return NextResponse.json(
                { error: "PRIVACY_KEY_NOT_CONFIGURED" },
                { status: 500 },
            )
        }

        const user = await getUserFromAuth(req)
        if (!user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        const url = new URL(req.url)
        const sessionId = sanitizeSessionId(url.searchParams.get("sessionId"))
        if (!sessionId) {
            return NextResponse.json(
                { error: "MISSING_SESSION_ID" },
                { status: 400 },
            )
        }

        const ownsSession = await verifySessionOwnership(sessionId, user.id)
        if (!ownsSession) {
            return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
        }

        const { data, error } = await supabaseAdmin
            .from("privacy_aliases")
            .select(
                "placeholder, alias_type, ciphertext, iv, auth_tag, key_version",
            )
            .eq("user_id", user.id)
            .eq("session_id", sessionId)

        if (error) {
            console.error("[privacy-aliases] select failed:", error)
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        const items: Array<{
            type: PromptRedactionType
            placeholder: string
            original: string
        }> = []
        for (const row of data ?? []) {
            try {
                const original = decryptAlias(
                    {
                        ciphertext: byteaToBuffer(row.ciphertext),
                        iv: byteaToBuffer(row.iv),
                        authTag: byteaToBuffer(row.auth_tag),
                    },
                    user.id,
                    typeof row.key_version === "number" ? row.key_version : 1,
                )
                if (!VALID_TYPES.has(row.alias_type as PromptRedactionType)) {
                    continue
                }
                items.push({
                    type: row.alias_type as PromptRedactionType,
                    placeholder: row.placeholder,
                    original,
                })
            } catch (decryptError) {
                console.error(
                    "[privacy-aliases] decrypt failed for placeholder",
                    row.placeholder,
                    decryptError,
                )
            }
        }

        return NextResponse.json({ items })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        console.error("[privacy-aliases] GET error:", message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
