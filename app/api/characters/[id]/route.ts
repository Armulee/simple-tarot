import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getUserFromAuthHeader } from "@/lib/chat/session-access"

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
