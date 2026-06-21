import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

type SessionRow = {
    id: string
    did: string | null
    owner_user_id: string | null
}

export type AuthedUser = {
    id: string
    email: string | null
}

export async function getUserFromAuthHeader(
    req: NextRequest,
): Promise<AuthedUser | null> {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) return null
    const token = authHeader.slice(7)
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
        return null
    }
    const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
    const {
        data: { user },
        error,
    } = await client.auth.getUser(token)
    if (error || !user) return null
    return { id: user.id, email: user.email ?? null }
}

export async function fetchSessionRow(
    sessionId: string,
): Promise<SessionRow | null> {
    const client = supabaseAdmin ?? supabase
    const { data, error } = await client
        .from("chat_sessions")
        .select("id, did, owner_user_id")
        .eq("id", sessionId)
        .maybeSingle()
    if (error || !data) return null
    return data as SessionRow
}

async function hasGrant(
    sessionId: string,
    user: AuthedUser | null,
): Promise<boolean> {
    if (!supabaseAdmin) return false
    if (!user) return false

    const orClauses: string[] = []
    orClauses.push(`grantee_user_id.eq.${user.id}`)
    if (user.email) {
        orClauses.push(`grantee_email.eq.${user.email.toLowerCase()}`)
    }

    const { data, error } = await supabaseAdmin
        .from("chat_session_access")
        .select("id")
        .eq("session_id", sessionId)
        .or(orClauses.join(","))
        .limit(1)

    if (error || !data || data.length === 0) return false
    return true
}

export type ComposeAuth = {
    canCompose: boolean
    isOwner: boolean
    reason: "owner-auth" | "owner-did" | "grant" | "denied"
}

/**
 * Determines whether the requester is authorized to submit new messages
 * (compose) on the given session. Owner-matching follows the same rules as
 * existing DELETE on the session: authenticated owner_user_id OR matching
 * device-id cookie for anonymously created sessions.
 */
export async function checkComposeAuth({
    session,
    user,
    requestDid,
}: {
    session: SessionRow
    user: AuthedUser | null
    requestDid: string | null
}): Promise<ComposeAuth> {
    if (
        user &&
        session.owner_user_id &&
        session.owner_user_id === user.id
    ) {
        return { canCompose: true, isOwner: true, reason: "owner-auth" }
    }
    if (
        !session.owner_user_id &&
        session.did &&
        requestDid &&
        session.did === requestDid
    ) {
        return { canCompose: true, isOwner: true, reason: "owner-did" }
    }
    if (await hasGrant(session.id, user)) {
        return { canCompose: true, isOwner: false, reason: "grant" }
    }
    return { canCompose: false, isOwner: false, reason: "denied" }
}

/**
 * Convenience for API routes: resolve session row, current user, did, and
 * the compose decision in one call.
 */
export async function resolveSessionAuth(
    req: NextRequest,
    sessionId: string,
): Promise<
    | { ok: true; session: SessionRow; user: AuthedUser | null; auth: ComposeAuth }
    | { ok: false; status: number; error: string }
> {
    const session = await fetchSessionRow(sessionId)
    if (!session) {
        return { ok: false, status: 404, error: "NOT_FOUND" }
    }
    const [user, did] = await Promise.all([
        getUserFromAuthHeader(req),
        readAndVerifyDid(),
    ])
    const auth = await checkComposeAuth({
        session,
        user,
        requestDid: did,
    })
    return { ok: true, session, user, auth }
}
