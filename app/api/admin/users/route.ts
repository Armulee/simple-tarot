import { NextRequest, NextResponse } from "next/server"
import { readPaging, requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export type AdminUserItem = {
    id: string
    type: "authenticated" | "anonymous"
    name: string | null
    avatarUrl: string | null
    createdAt: string | null
    stars: number | null
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const filterParam = request.nextUrl.searchParams.get("filter")
    const filter =
        filterParam === "anonymous" || filterParam === "authenticated"
            ? filterParam
            : "all"
    const { limit, offset } = readPaging(request)
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
    const like = `%${q}%`
    const SEARCH_CAP = 1000

    try {
        let items: AdminUserItem[] = []
        let total = 0

        if (filter === "authenticated") {
            let query = admin
                .from("profiles")
                .select("id, name, avatar_url, created_at", { count: "exact" })
            if (q) query = query.ilike("name", like)
            const { data, count, error } = await query
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1)
            if (error) throw error
            total = count ?? 0
            items = (data ?? []).map((p) => ({
                id: p.id as string,
                type: "authenticated",
                name: (p.name as string) ?? null,
                avatarUrl: (p.avatar_url as string) ?? null,
                createdAt: (p.created_at as string) ?? null,
                stars: null,
            }))
        } else if (filter === "anonymous") {
            let query = admin
                .from("stars")
                .select("anon_device_id, current_stars, created_at", {
                    count: "exact",
                })
                .is("user_id", null)
            if (q) query = query.ilike("anon_device_id", like)
            const { data, count, error } = await query
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1)
            if (error) throw error
            total = count ?? 0
            items = (data ?? []).map((s) => ({
                id: (s.anon_device_id as string) ?? "",
                type: "anonymous",
                name: null,
                avatarUrl: null,
                createdAt: (s.created_at as string) ?? null,
                stars: (s.current_stars as number) ?? null,
            }))
        } else if (q) {
            // All users + search: match signed-in users by profile name and
            // guests by device id, then merge / sort / page in memory (the
            // result set for a name query is small).
            const [{ data: profs }, { data: anons }] = await Promise.all([
                admin
                    .from("profiles")
                    .select("id, name, avatar_url, created_at")
                    .ilike("name", like)
                    .order("created_at", { ascending: false })
                    .limit(SEARCH_CAP),
                admin
                    .from("stars")
                    .select("anon_device_id, current_stars, created_at")
                    .is("user_id", null)
                    .ilike("anon_device_id", like)
                    .order("created_at", { ascending: false })
                    .limit(SEARCH_CAP),
            ])
            const merged: AdminUserItem[] = [
                ...(profs ?? []).map((p) => ({
                    id: p.id as string,
                    type: "authenticated" as const,
                    name: (p.name as string) ?? null,
                    avatarUrl: (p.avatar_url as string) ?? null,
                    createdAt: (p.created_at as string) ?? null,
                    stars: null,
                })),
                ...(anons ?? []).map((s) => ({
                    id: (s.anon_device_id as string) ?? "",
                    type: "anonymous" as const,
                    name: null,
                    avatarUrl: null,
                    createdAt: (s.created_at as string) ?? null,
                    stars: (s.current_stars as number) ?? null,
                })),
            ].sort((a, b) =>
                (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
            )
            total = merged.length
            items = merged.slice(offset, offset + limit)
        } else {
            // All users: every stars row, enriched with the profile (name +
            // avatar) when the row belongs to a signed-in user.
            const { data, count, error } = await admin
                .from("stars")
                .select("user_id, anon_device_id, current_stars, created_at", {
                    count: "exact",
                })
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1)
            if (error) throw error
            total = count ?? 0

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

            items = (data ?? []).map((r) => {
                const uid = r.user_id as string | null
                const prof = uid ? profiles.get(uid) : undefined
                return {
                    id: (uid || (r.anon_device_id as string) || "") as string,
                    type: prof ? "authenticated" : "anonymous",
                    name: prof?.name ?? null,
                    avatarUrl: prof?.avatar_url ?? null,
                    createdAt: (r.created_at as string) ?? null,
                    stars: (r.current_stars as number) ?? null,
                }
            })
        }

        return NextResponse.json(
            { items, total, hasMore: offset + items.length < total },
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/users] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
