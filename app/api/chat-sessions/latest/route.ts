import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { getUserFromBearer } from "@/lib/server/auth"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Most recently updated chat session belonging to the caller.
 *
 * The landing page uses this to send a returning visitor straight back into
 * the conversation instead of showing the marketing page again. Lookup is
 * scoped to the signed-in account when a bearer token is present, otherwise to
 * the signed DID cookie — never to a client-supplied id.
 */
export async function GET(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ id: null })
        }

        const user = await getUserFromBearer(req)
        const did = await readAndVerifyDid()
        if (!user && !did) return NextResponse.json({ id: null })

        const query = supabaseAdmin
            .from("chat_sessions")
            .select("id")
            .order("updated_at", { ascending: false })
            .limit(1)

        const { data } = user
            ? await query.eq("owner_user_id", user.id)
            : await query.eq("did", did!).is("owner_user_id", null)

        return NextResponse.json({ id: data?.[0]?.id ?? null })
    } catch {
        return NextResponse.json({ id: null })
    }
}
