import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { nanoid } from "nanoid"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { getUserFromAuthHeader } from "@/lib/chat/session-access"
import { getActiveSubscriptionInfo } from "@/lib/server/subscription"
import { canManageCharacters } from "@/lib/payments/plan-limits"
import { normalizeCharacter, type CharacterRow } from "@/types/character"

const createCharacterSchema = z.object({
    name: z.string().trim().min(1).max(80),
    birthDay: z.number().int().min(1).max(31),
    birthMonth: z.number().int().min(1).max(12),
    birthYear: z
        .number()
        .int()
        .min(1900)
        .max(new Date().getFullYear()),
    birthHour: z.number().int().min(0).max(23).nullable().optional(),
    birthMinute: z.number().int().min(0).max(59).nullable().optional(),
    birthCountry: z.string().trim().min(1).max(120).nullable().optional(),
    birthState: z.string().trim().min(1).max(120).nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    timezone: z.number().min(-14).max(14).nullable().optional(),
})

// GET /api/characters — list the signed-in user's characters (not gated).
export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }
        const user = await getUserFromAuthHeader(req)
        if (!user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        const { data, error } = await supabaseAdmin
            .from("characters")
            .select("*")
            .eq("owner_user_id", user.id)
            .order("created_at", { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        const characters = ((data ?? []) as CharacterRow[]).map(
            normalizeCharacter,
        )
        return NextResponse.json({ characters })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// POST /api/characters — create a character. Paid plans only.
export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 },
            )
        }
        const user = await getUserFromAuthHeader(req)
        if (!user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
        }

        // Adding a character is a paid feature. Listing/reading is not gated.
        const subscription = await getActiveSubscriptionInfo(user.id)
        if (!canManageCharacters(subscription?.tier)) {
            return NextResponse.json(
                { error: "PAYWALL", requiredTier: "basic" },
                { status: 402 },
            )
        }

        const parsed = createCharacterSchema.safeParse(await req.json())
        if (!parsed.success) {
            return NextResponse.json(
                { error: "INVALID_INPUT" },
                { status: 400 },
            )
        }
        const input = parsed.data
        const did = await readAndVerifyDid()

        // Generate a short id, retrying on the rare collision.
        let finalId = nanoid(12)
        let attempts = 0
        while (attempts < 5) {
            const { data: existing } = await supabaseAdmin
                .from("characters")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()
            if (!existing) break
            finalId = nanoid(12)
            attempts++
        }

        const nowIso = new Date().toISOString()
        const { data, error } = await supabaseAdmin
            .from("characters")
            .insert({
                id: finalId,
                owner_user_id: user.id,
                did: did ?? null,
                name: input.name,
                birth_day: input.birthDay,
                birth_month: input.birthMonth,
                birth_year: input.birthYear,
                birth_hour: input.birthHour ?? null,
                birth_minute: input.birthMinute ?? null,
                birth_country: input.birthCountry ?? null,
                birth_state: input.birthState ?? null,
                lat: input.lat ?? null,
                lng: input.lng ?? null,
                timezone: input.timezone ?? null,
                created_at: nowIso,
                updated_at: nowIso,
            })
            .select("*")
            .maybeSingle()

        if (error || !data) {
            return NextResponse.json(
                { error: error?.message ?? "INSERT_FAILED" },
                { status: 400 },
            )
        }

        return NextResponse.json({
            character: normalizeCharacter(data as CharacterRow),
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
