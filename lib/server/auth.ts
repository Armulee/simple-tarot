import type { User } from "@supabase/supabase-js"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Resolve the authenticated Supabase user from an `Authorization: Bearer
 * <access_token>` header. Returns null when there is no valid token.
 *
 * This mirrors the inline helper used in app/api/chat/route.ts, lifted into a
 * shared module so the avatar routes (which all require auth) can reuse it.
 */
export async function getUserFromBearer(req: Request): Promise<User | null> {
    if (!supabaseAdmin) return null
    const authHeader =
        req.headers.get("authorization") ?? req.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    const token = authHeader.slice(7).trim()
    if (!token) return null
    const {
        data: { user },
        error,
    } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) return null
    return user
}
