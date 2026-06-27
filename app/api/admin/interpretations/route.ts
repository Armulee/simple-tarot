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

const COLS = "id, question, cards, interpretation, owner_user_id, created_at"
const SEARCH_CAP = 1000
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ReadingRow = {
    id: string
    question: string | null
    cards: string[] | null
    interpretation: string | null
    owner_user_id: string | null
    created_at: string | null
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth
    const { limit, offset } = readPaging(request)
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim()

    try {
        let rows: ReadingRow[] = []
        let total = 0

        if (q) {
            // Search matches the session topic (question) or the owner's
            // name. Run both as separate queries (no user input in .or()
            // filter strings), merge, dedupe, then page in memory.
            const like = `%${q}%`
            const { data: namedProfiles } = await admin
                .from("profiles")
                .select("id")
                .ilike("name", like)
                .limit(SEARCH_CAP)
            const ownerIdsByName = (namedProfiles ?? []).map(
                (p) => p.id as string,
            )
            const [byQuestion, byOwner] = await Promise.all([
                admin
                    .from("tarot_readings")
                    .select(COLS)
                    .not("interpretation", "is", null)
                    .ilike("question", like)
                    .order("created_at", { ascending: false })
                    .limit(SEARCH_CAP),
                ownerIdsByName.length > 0
                    ? admin
                          .from("tarot_readings")
                          .select(COLS)
                          .not("interpretation", "is", null)
                          .in("owner_user_id", ownerIdsByName)
                          .order("created_at", { ascending: false })
                          .limit(SEARCH_CAP)
                    : Promise.resolve({ data: [] as ReadingRow[] }),
            ])
            const byId = new Map<string, ReadingRow>()
            for (const r of [
                ...((byQuestion.data ?? []) as ReadingRow[]),
                ...((byOwner.data ?? []) as ReadingRow[]),
            ]) {
                byId.set(r.id, r)
            }
            const merged = Array.from(byId.values()).sort((a, b) =>
                (b.created_at ?? "").localeCompare(a.created_at ?? ""),
            )
            total = merged.length
            rows = merged.slice(offset, offset + limit)
        } else {
            const { data, count, error } = await admin
                .from("tarot_readings")
                .select(COLS, { count: "exact" })
                .not("interpretation", "is", null)
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1)
            if (error) throw error
            rows = (data ?? []) as ReadingRow[]
            total = count ?? 0
        }

        // owner_user_id is a free-text column; only real auth UUIDs can be
        // joined to profiles.id (a uuid), so filter to that shape.
        const ownerIds = Array.from(
            new Set(
                rows
                    .map((r) => r.owner_user_id)
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

        const items: AdminInterpretationItem[] = rows.map((r) => {
            const owner = r.owner_user_id
            const prof = owner ? profiles.get(owner) : undefined
            const interpretation = String(r.interpretation ?? "")
            return {
                id: r.id,
                question: r.question ?? "",
                cards: Array.isArray(r.cards) ? r.cards : [],
                snippet:
                    interpretation.length > 160
                        ? `${interpretation.slice(0, 157).trimEnd()}…`
                        : interpretation,
                createdAt: r.created_at ?? null,
                ownerName: prof?.name ?? null,
                ownerAvatarUrl: prof?.avatar_url ?? null,
                isAuthenticated: !!owner,
            }
        })

        return NextResponse.json(
            { items, total, hasMore: offset + items.length < total },
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/interpretations] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
