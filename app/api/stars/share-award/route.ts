import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase, supabaseAdmin } from "@/lib/supabase"

// Award 1 star for sharing, ignoring refill caps.
// If authenticated, adds to user balance; otherwise, adds to device id (DID).
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as {
            user_id?: string | null
            owner_user_id?: string | null
            owner_did?: string | null
            shared_id?: string | null
        }
        const viewerUserId: string | null = body?.user_id ?? null
        const ownerUserId: string | null = body?.owner_user_id ?? null
        const ownerDid: string | null = body?.owner_did ?? null
        const sharedId: string | null = body?.shared_id ?? null

        const db = supabaseAdmin || supabase

        const getBangkokDateKey = (): string => {
            const offsetMs = 7 * 60 * 60 * 1000
            const bkk = new Date(Date.now() + offsetMs)
            const y = bkk.getUTCFullYear()
            const m = String(bkk.getUTCMonth() + 1).padStart(2, "0")
            const d = String(bkk.getUTCDate()).padStart(2, "0")
            return `${y}-${m}-${d}`
        }
        const dateKey = getBangkokDateKey()

        if (viewerUserId) {
            const visitorId = viewerUserId
            const ownerId = ownerUserId || ownerDid || null
            if (!ownerId)
                return NextResponse.json(
                    { error: "MISSING_OWNER" },
                    { status: 400 }
                )
            // If visitor is the owner, do not award
            if (ownerId === visitorId) {
                return NextResponse.json({ data: { ok: true, skipped: true } })
            }
            // Global visitor daily cap: only one award per visitor per day across all shares/owners
            {
                const { count: vCount, error: vErr } = await db
                    .from("share_visit_awards")
                    .select("id", { count: "exact", head: true })
                    .eq("date_key", dateKey)
                    .eq("visitor_id", visitorId)
                if (!vErr && typeof vCount === "number" && vCount >= 1) {
                    return NextResponse.json({
                        data: { ok: true, visitor_capped: true },
                    })
                }
            }
            // Check duplicate for this share today by visitor_user_id
            if (sharedId) {
                const { data: visit, error: visitErr } = await db
                    .from("share_visit_awards")
                    .select("id")
                    .eq("shared_id", sharedId)
                    .eq("visitor_id", visitorId)
                    .eq("date_key", dateKey)
                    .maybeSingle()
                if (visit)
                    return NextResponse.json({
                        data: { ok: true, duplicate: true },
                    })
                if (visitErr && visitErr.message) {
                    // continue; we'll attempt to insert and let DB enforce constraints if any
                }
                // Cap total awards for the owner to 5 per day across all shares
                if (ownerId) {
                    const { count, error: cntErr } = await db
                        .from("share_visit_awards")
                        .select("id", { count: "exact", head: true })
                        .eq("date_key", dateKey)
                        .eq("owner_id", ownerId)
                    if (!cntErr && typeof count === "number" && count >= 5) {
                        return NextResponse.json({
                            data: { ok: true, owner_capped: true },
                        })
                    }
                }
                await db.from("share_visit_awards").insert({
                    shared_id: sharedId,
                    visitor_id: visitorId,
                    date_key: dateKey,
                    owner_id: ownerId,
                })
            }
            // Award to owner (user or DID)
            if (ownerUserId) {
            const { data: currentData, error: currentErr } = await db
                .rpc("star_get_or_create", {
                    p_anon_device_id: null,
                    p_user_id: ownerUserId,
                })
                if (currentErr)
                    return NextResponse.json(
                        { error: currentErr.message },
                        { status: 400 }
                    )
                const row = (currentData?.[0] ?? {}) as {
                    current_stars?: number
                }
                const current = Number.isFinite(row.current_stars as number)
                    ? (row.current_stars as number)
                    : 0
                const next = Math.max(0, current + 1)
                const { data, error } = await db.rpc("star_set", {
                    p_anon_device_id: null,
                    p_new_balance: next,
                    p_user_id: ownerUserId,
                })
                if (error)
                    return NextResponse.json(
                        { error: error.message },
                        { status: 400 }
                    )
                // Create/aggregate notification for logged-in owners
                try {
                    const link = `/tarot/${sharedId || ""}`
                    const title = `New visitor to your tarot page`
                    const body = `You have a new visitor. Tap to view.`
                    if (sharedId) {
                        // Aggregate by (user_id, shared_id, date_key)
                        const { data: existing } = await db
                            .from("notifications")
                            .select("id, visits_count")
                            .eq("user_id", ownerUserId)
                            .eq("type", "share_visit")
                            .eq("shared_id", sharedId)
                            .eq("date_key", dateKey)
                            .maybeSingle()
                        if (existing?.id) {
                            await db
                                .from("notifications")
                                .update({
                                    title,
                                    body,
                                    link,
                                    visits_count:
                                        (existing.visits_count || 1) + 1,
                                    updated_at: new Date().toISOString(),
                                })
                                .eq("id", existing.id)
                        } else {
                            await db.from("notifications").insert({
                                user_id: ownerUserId,
                                type: "share_visit",
                                title,
                                body,
                                link,
                                shared_id: sharedId,
                                date_key: dateKey,
                                visits_count: 1,
                            })
                        }
                    }
                } catch {}
                return NextResponse.json({ data })
            } else if (ownerDid) {
                const { data, error } = await db.rpc("star_add", {
                    p_anon_device_id: ownerDid,
                    p_amount: 1,
                    p_user_id: null,
                })
                if (error)
                    return NextResponse.json(
                        { error: error.message },
                        { status: 400 }
                    )
                return NextResponse.json({ data })
            }
            return NextResponse.json({ data: { ok: true } })
        }

        // Anonymous: use DID and increment by 1 (unified ids)
        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })
        const visitorId = did
        const ownerId = ownerUserId || ownerDid || null
        if (!ownerId)
            return NextResponse.json(
                { error: "MISSING_OWNER" },
                { status: 400 }
            )
        // If visitor is the owner, do not award
        if (ownerId === visitorId) {
            return NextResponse.json({ data: { ok: true, skipped: true } })
        }
        // Global visitor daily cap: only one award per visitor per day across all shares/owners
        {
            const { count: vCount, error: vErr } = await db
                .from("share_visit_awards")
                .select("id", { count: "exact", head: true })
                .eq("date_key", dateKey)
                .eq("visitor_id", visitorId)
            if (!vErr && typeof vCount === "number" && vCount >= 1) {
                return NextResponse.json({
                    data: { ok: true, visitor_capped: true },
                })
            }
        }
        if (sharedId) {
            const { data: visit, error: visitErr } = await db
                .from("share_visit_awards")
                .select("id")
                .eq("shared_id", sharedId)
                .eq("visitor_id", visitorId)
                .eq("date_key", dateKey)
                .maybeSingle()
            if (visit)
                return NextResponse.json({
                    data: { ok: true, duplicate: true },
                })
            if (visitErr && visitErr.message) {
                // continue
            }
            // Owner cap 5/day
            if (ownerId) {
                const { count, error: cntErr } = await db
                    .from("share_visit_awards")
                    .select("id", { count: "exact", head: true })
                    .eq("date_key", dateKey)
                    .eq("owner_id", ownerId)
                if (!cntErr && typeof count === "number" && count >= 5) {
                    return NextResponse.json({
                        data: { ok: true, owner_capped: true },
                    })
                }
            }
            await db.from("share_visit_awards").insert({
                shared_id: sharedId,
                visitor_id: visitorId,
                date_key: dateKey,
                owner_id: ownerId,
            })
        }
        // Award to owner (user or DID)
        if (ownerUserId) {
            const { data: currentData, error: currentErr } = await db
                .rpc("star_get_or_create", {
                    p_anon_device_id: null,
                    p_user_id: ownerUserId,
                })
            if (currentErr)
                return NextResponse.json(
                    { error: currentErr.message },
                    { status: 400 }
                )
            const row = (currentData?.[0] ?? {}) as { current_stars?: number }
            const current = Number.isFinite(row.current_stars as number)
                ? (row.current_stars as number)
                : 0
            const next = Math.max(0, current + 1)
            const { data, error } = await db.rpc("star_set", {
                p_anon_device_id: null,
                p_new_balance: next,
                p_user_id: ownerUserId,
            })
            if (error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                )
            return NextResponse.json({ data })
        } else if (ownerDid) {
            const { data, error } = await db.rpc("star_add", {
                p_anon_device_id: ownerDid,
                p_amount: 1,
                p_user_id: null,
            })
            if (error)
                return NextResponse.json(
                    { error: error.message },
                    { status: 400 }
                )
            return NextResponse.json({ data })
        }
        return NextResponse.json({ data: { ok: true } })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
