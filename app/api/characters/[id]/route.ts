import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { getUserFromAuthHeader } from "@/lib/chat/session-access"
import { getActiveSubscriptionInfo } from "@/lib/server/subscription"
import { canManageCharacters } from "@/lib/payments/plan-limits"
import { normalizeCharacter, type CharacterRow } from "@/types/character"

const updateCharacterSchema = z.object({
    name: z.string().trim().min(1).max(80),
    birthDay: z.number().int().min(1).max(31),
    birthMonth: z.number().int().min(1).max(12),
    birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
    birthHour: z.number().int().min(0).max(23).nullable().optional(),
    birthMinute: z.number().int().min(0).max(59).nullable().optional(),
    birthCountry: z.string().trim().min(1).max(120).nullable().optional(),
    birthState: z.string().trim().min(1).max(120).nullable().optional(),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    timezone: z.number().min(-14).max(14).nullable().optional(),
})

// PUT /api/characters/:id — edit one of the signed-in user's characters.
// Managing characters is a paid feature, same as creating one.
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
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

        const subscription = await getActiveSubscriptionInfo(user.id)
        if (!canManageCharacters(subscription?.tier)) {
            return NextResponse.json(
                { error: "PAYWALL", requiredTier: "basic" },
                { status: 402 },
            )
        }

        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        const parsed = updateCharacterSchema.safeParse(await req.json())
        if (!parsed.success) {
            return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 })
        }
        const input = parsed.data

        // Ownership is enforced by the owner_user_id filter — a user can only
        // ever edit their own rows.
        const { data, error } = await supabaseAdmin
            .from("characters")
            .update({
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
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("owner_user_id", user.id)
            .select("*")
            .maybeSingle()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        if (!data) {
            return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 })
        }

        return NextResponse.json({
            character: normalizeCharacter(data as CharacterRow),
        })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// DELETE /api/characters/:id — delete one of the signed-in user's characters.
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
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

        const { id: rawId } = await context.params
        const id = (rawId ?? "").toString().slice(0, 32)
        if (!id) return NextResponse.json({ error: "BAD_ID" }, { status: 400 })

        // Ownership is enforced by the owner_user_id filter — a user can only
        // ever delete their own rows.
        const { error } = await supabaseAdmin
            .from("characters")
            .delete()
            .eq("id", id)
            .eq("owner_user_id", user.id)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
