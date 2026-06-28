import { NextRequest, NextResponse } from "next/server"
import { readPaging, requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** Statuses that still need review ("on progress"). */
export const PENDING_STATUSES = ["pending", "manual_review"] as const

export type AdminContentSubmissionItem = {
    id: string
    userId: string | null
    name: string | null
    avatarUrl: string | null
    title: string | null
    url: string
    platform: string | null
    status: string
    createdAt: string | null
}

const COLS = "id, user_id, url, title, platform, verification_status, created_at"
const SEARCH_CAP = 1000

type Row = {
    id: string
    user_id: string | null
    url: string
    title: string | null
    platform: string | null
    verification_status: string
    created_at: string | null
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth
    const { limit, offset } = readPaging(request)
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim()
    const pendingOnly = request.nextUrl.searchParams.get("pending") === "1"

    const base = () => {
        const query = admin
            .from("content_submissions")
            .select(COLS, { count: "exact" })
        return pendingOnly
            ? query.in("verification_status", [...PENDING_STATUSES])
            : query
    }

    try {
        let rows: Row[] = []
        let total = 0

        if (q) {
            const like = `%${q}%`
            const { data: named } = await admin
                .from("profiles")
                .select("id")
                .ilike("name", like)
                .limit(SEARCH_CAP)
            const ownerIds = (named ?? []).map((p) => p.id as string)

            const [byTitle, byOwner] = await Promise.all([
                base().ilike("title", like).limit(SEARCH_CAP),
                ownerIds.length > 0
                    ? base().in("user_id", ownerIds).limit(SEARCH_CAP)
                    : Promise.resolve({ data: [] as Row[] }),
            ])
            const byId = new Map<string, Row>()
            for (const r of [
                ...(((byTitle as { data?: Row[] }).data ?? []) as Row[]),
                ...(((byOwner as { data?: Row[] }).data ?? []) as Row[]),
            ]) {
                byId.set(r.id, r)
            }
            const merged = Array.from(byId.values()).sort((a, b) =>
                (b.created_at ?? "").localeCompare(a.created_at ?? ""),
            )
            total = merged.length
            rows = merged.slice(offset, offset + limit)
        } else {
            const { data, count, error } = await base()
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1)
            if (error) throw error
            rows = (data ?? []) as Row[]
            total = count ?? 0
        }

        const userIds = Array.from(
            new Set(
                rows
                    .map((r) => r.user_id)
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

        const items: AdminContentSubmissionItem[] = rows.map((r) => {
            const prof = r.user_id ? profiles.get(r.user_id) : undefined
            return {
                id: r.id,
                userId: r.user_id,
                name: prof?.name ?? null,
                avatarUrl: prof?.avatar_url ?? null,
                title: r.title,
                url: r.url,
                platform: r.platform,
                status: r.verification_status,
                createdAt: r.created_at,
            }
        })

        return NextResponse.json(
            { items, total, hasMore: offset + items.length < total },
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/content-submissions] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
