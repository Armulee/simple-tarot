import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

type AdminClient = NonNullable<typeof supabaseAdmin>

type RequireAdminResult =
    | { ok: true; admin: AdminClient; userId: string }
    | { ok: false; response: NextResponse }

/**
 * Verifies the request carries a Bearer token for a user listed in the
 * `admins` table, mirroring /api/admin/metrics. Returns the service-role
 * client on success so the route can read across all rows.
 */
export async function requireAdmin(
    request: NextRequest,
): Promise<RequireAdminResult> {
    if (!supabaseAdmin) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: "SERVER_NOT_CONFIGURED" },
                { status: 500 },
            ),
        }
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return {
            ok: false,
            response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
        }
    }

    const token = authHeader.split(" ")[1]
    const {
        data: { user },
        error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
        }
    }

    const { data: adminRow, error: adminError } = await supabaseAdmin
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle()

    if (adminError || !adminRow) {
        return {
            ok: false,
            response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
        }
    }

    return { ok: true, admin: supabaseAdmin, userId: user.id }
}

/** Clamp/parse `limit` and `offset` from the request's search params. */
export function readPaging(
    request: NextRequest,
    { defaultLimit = 50, maxLimit = 100 } = {},
) {
    const sp = request.nextUrl.searchParams
    const limit = Math.min(
        Math.max(1, Number(sp.get("limit")) || defaultLimit),
        maxLimit,
    )
    const offset = Math.max(0, Number(sp.get("offset")) || 0)
    return { limit, offset }
}
