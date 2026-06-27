import { NextRequest, NextResponse } from "next/server"
import { readPaging, requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export type AdminSubscriberItem = {
    userId: string
    name: string | null
    avatarUrl: string | null
    plan: string | null
    status: string
    currentPeriodEnd: string | null
    createdAt: string | null
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth
    const { limit, offset } = readPaging(request)
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim()

    try {
        const now = new Date().toISOString()

        // When searching by member name, resolve the matching profile ids
        // first and constrain the subscriptions to them.
        let nameMatchIds: string[] | null = null
        if (q) {
            const { data: profs } = await admin
                .from("profiles")
                .select("id")
                .ilike("name", `%${q}%`)
                .limit(1000)
            nameMatchIds = (profs ?? []).map((p) => p.id as string)
            if (nameMatchIds.length === 0) {
                return NextResponse.json(
                    { items: [], total: 0, hasMore: false },
                    { status: 200 },
                )
            }
        }

        let query = admin
            .from("billing_subscriptions")
            .select("user_id, plan, status, current_period_end, created_at", {
                count: "exact",
            })
            .or(
                `status.in.(active,trialing),and(status.eq.canceled,current_period_end.gt.${now})`,
            )
        if (nameMatchIds) query = query.in("user_id", nameMatchIds)
        const { data, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)
        if (error) throw error

        const userIds = (data ?? [])
            .map((r) => r.user_id as string | null)
            .filter((id): id is string => !!id)
        const profiles = new Map<
            string,
            { name: string | null; avatar_url: string | null }
        >()
        if (userIds.length > 0) {
            const { data: profs } = await admin
                .from("profiles")
                .select("id, name, avatar_url")
                .in("id", userIds)
            for (const p of profs ?? []) {
                profiles.set(p.id as string, {
                    name: (p.name as string) ?? null,
                    avatar_url: (p.avatar_url as string) ?? null,
                })
            }
        }

        const items: AdminSubscriberItem[] = (data ?? []).map((r) => {
            const uid = r.user_id as string
            const prof = profiles.get(uid)
            return {
                userId: uid,
                name: prof?.name ?? null,
                avatarUrl: prof?.avatar_url ?? null,
                plan: (r.plan as string) ?? null,
                status: (r.status as string) ?? "",
                currentPeriodEnd: (r.current_period_end as string) ?? null,
                createdAt: (r.created_at as string) ?? null,
            }
        })

        return NextResponse.json(
            { items, total: count ?? 0, hasMore: offset + items.length < (count ?? 0) },
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/subscribers] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
