import { NextRequest, NextResponse } from "next/server"
import { readPaging, requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export type AdminRevenueItem = {
    id: string
    userId: string | null
    name: string | null
    avatarUrl: string | null
    amountUsd: number
    currency: string
    type: string | null
    status: string | null
    createdAt: string | null
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth
    const { limit, offset } = readPaging(request)
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim()

    try {
        // Searching by member name → resolve matching profile ids first.
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
            .from("billing_transactions")
            .select(
                "id, user_id, amount_cents, currency, type, status, created_at",
                { count: "exact" },
            )
        if (nameMatchIds) query = query.in("user_id", nameMatchIds)
        const { data, count, error } = await query
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)
        if (error) throw error

        const userIds = Array.from(
            new Set(
                (data ?? [])
                    .map((r) => r.user_id as string | null)
                    .filter((id): id is string => !!id),
            ),
        )
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

        const items: AdminRevenueItem[] = (data ?? []).map((r) => {
            const uid = r.user_id as string | null
            const prof = uid ? profiles.get(uid) : undefined
            return {
                id: r.id as string,
                userId: uid,
                name: prof?.name ?? null,
                avatarUrl: prof?.avatar_url ?? null,
                amountUsd: ((r.amount_cents as number) ?? 0) / 100,
                currency: ((r.currency as string) ?? "USD").toUpperCase(),
                type: (r.type as string) ?? null,
                status: (r.status as string) ?? null,
                createdAt: (r.created_at as string) ?? null,
            }
        })

        return NextResponse.json(
            {
                items,
                total: count ?? 0,
                hasMore: offset + items.length < (count ?? 0),
            },
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/revenue] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}

/** Bulk-delete transaction records by id. Admin only. */
export async function DELETE(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    try {
        const body = (await request.json().catch(() => null)) as {
            ids?: unknown
        } | null
        const ids = Array.isArray(body?.ids)
            ? body.ids.filter((x): x is string => typeof x === "string")
            : []
        if (ids.length === 0) {
            return NextResponse.json({ error: "NO_IDS" }, { status: 400 })
        }

        const { error } = await admin
            .from("billing_transactions")
            .delete()
            .in("id", ids)
        if (error) throw error

        return NextResponse.json({ deleted: ids.length }, { status: 200 })
    } catch (error) {
        console.error("[admin/revenue] delete failed", error)
        return NextResponse.json({ error: "FAILED_TO_DELETE" }, { status: 500 })
    }
}
