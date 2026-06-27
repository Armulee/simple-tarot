import { NextRequest, NextResponse } from "next/server"
import { readPaging, requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export type AdminInterpretationItem = {
    id: string
    question: string
    cards: string[]
    snippet: string
    createdAt: string | null
    ownerName: string | null
    ownerAvatarUrl: string | null
    isAuthenticated: boolean
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth
    const { limit, offset } = readPaging(request)

    try {
        const { data, count, error } = await admin
            .from("tarot_readings")
            .select("id, question, cards, interpretation, owner_user_id, created_at", {
                count: "exact",
            })
            .not("interpretation", "is", null)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1)
        if (error) throw error

        // owner_user_id is a free-text column; only real auth UUIDs can be
        // joined to profiles.id (a uuid), so filter to that shape.
        const UUID_RE =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const ownerIds = Array.from(
            new Set(
                (data ?? [])
                    .map((r) => r.owner_user_id as string | null)
                    .filter((id): id is string => !!id && UUID_RE.test(id)),
            ),
        )
        const profiles = new Map<
            string,
            { name: string | null; avatar_url: string | null }
        >()
        if (ownerIds.length > 0) {
            const { data: profs } = await admin
                .from("profiles")
                .select("id, name, avatar_url")
                .in("id", ownerIds)
            for (const p of profs ?? []) {
                profiles.set(p.id as string, {
                    name: (p.name as string) ?? null,
                    avatar_url: (p.avatar_url as string) ?? null,
                })
            }
        }

        const items: AdminInterpretationItem[] = (data ?? []).map((r) => {
            const owner = r.owner_user_id as string | null
            const prof = owner ? profiles.get(owner) : undefined
            const interpretation = String(r.interpretation ?? "")
            return {
                id: r.id as string,
                question: (r.question as string) ?? "",
                cards: Array.isArray(r.cards) ? (r.cards as string[]) : [],
                snippet:
                    interpretation.length > 160
                        ? `${interpretation.slice(0, 157).trimEnd()}…`
                        : interpretation,
                createdAt: (r.created_at as string) ?? null,
                ownerName: prof?.name ?? null,
                ownerAvatarUrl: prof?.avatar_url ?? null,
                isAuthenticated: !!owner,
            }
        })

        return NextResponse.json(
            { items, total: count ?? 0, hasMore: offset + items.length < (count ?? 0) },
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/interpretations] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
