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

const COLS = "id, question, topic, messages, owner_user_id, created_at"
const SEARCH_CAP = 1000
const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ChatMessage = {
    role?: string | null
    text?: string | null
    cards?: { name?: string | null }[] | null
}

type SessionRow = {
    id: string
    question: string | null
    topic: string | null
    messages: ChatMessage[] | null
    owner_user_id: string | null
    created_at: string | null
}

/** Latest assistant reply is the "interpretation" we surface as a snippet. */
function deriveSnippet(row: SessionRow): string {
    const msgs = Array.isArray(row.messages) ? row.messages : []
    const lastAssistant = [...msgs]
        .reverse()
        .find((m) => m?.role === "assistant" && (m?.text ?? "").trim())
    const base = (
        lastAssistant?.text ??
        row.topic ??
        row.question ??
        ""
    ).trim()
    return base.length > 160 ? `${base.slice(0, 157).trimEnd()}…` : base
}

/** Cards from the most recent message that drew any (mirrors reading history). */
function deriveCards(row: SessionRow): string[] {
    const msgs = Array.isArray(row.messages) ? row.messages : []
    const withCards = [...msgs]
        .reverse()
        .find((m) => Array.isArray(m?.cards) && m.cards.length > 0)
    return (withCards?.cards ?? [])
        .map((c) => (typeof c?.name === "string" ? c.name : null))
        .filter((n): n is string => !!n)
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth
    const { limit, offset } = readPaging(request)
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim()

    try {
        let rows: SessionRow[] = []
        let total = 0

        if (q) {
            // Search matches the session topic/question or the owner's name.
            // Run each as a separate query (no user input in .or() filter
            // strings), merge, dedupe, then page in memory.
            const like = `%${q}%`
            const { data: namedProfiles } = await admin
                .from("profiles")
                .select("id")
                .ilike("name", like)
                .limit(SEARCH_CAP)
            const ownerIdsByName = (namedProfiles ?? []).map(
                (p) => p.id as string,
            )
            const [byQuestion, byTopic, byOwner] = await Promise.all([
                admin
                    .from("chat_sessions")
                    .select(COLS)
                    .ilike("question", like)
                    .order("created_at", { ascending: false })
                    .limit(SEARCH_CAP),
                admin
                    .from("chat_sessions")
                    .select(COLS)
                    .ilike("topic", like)
                    .order("created_at", { ascending: false })
                    .limit(SEARCH_CAP),
                ownerIdsByName.length > 0
                    ? admin
                          .from("chat_sessions")
                          .select(COLS)
                          .in("owner_user_id", ownerIdsByName)
                          .order("created_at", { ascending: false })
                          .limit(SEARCH_CAP)
                    : Promise.resolve({ data: [] as SessionRow[] }),
            ])
            const byId = new Map<string, SessionRow>()
            for (const r of [
                ...((byQuestion.data ?? []) as SessionRow[]),
                ...((byTopic.data ?? []) as SessionRow[]),
                ...((byOwner.data ?? []) as SessionRow[]),
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
                .from("chat_sessions")
                .select(COLS, { count: "exact" })
                .order("created_at", { ascending: false })
                .range(offset, offset + limit - 1)
            if (error) throw error
            rows = (data ?? []) as SessionRow[]
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
            return {
                id: r.id,
                question: r.topic ?? r.question ?? "",
                cards: deriveCards(r),
                snippet: deriveSnippet(r),
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

/** Bulk-delete sessions by id (cascades to access rows). Admin only. */
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
            .from("chat_sessions")
            .delete()
            .in("id", ids)
        if (error) throw error

        return NextResponse.json({ deleted: ids.length }, { status: 200 })
    } catch (error) {
        console.error("[admin/interpretations] delete failed", error)
        return NextResponse.json({ error: "FAILED_TO_DELETE" }, { status: 500 })
    }
}
