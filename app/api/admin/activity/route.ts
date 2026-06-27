import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { supabaseAdmin } from "@/lib/supabase"

type AdminClient = NonNullable<typeof supabaseAdmin>

export const dynamic = "force-dynamic"

export type ActivityGranularity = "day" | "week" | "month"

export type ActivityPoint = {
    /** Bucket start as an ISO date (UTC midnight / month start). */
    date: string
    plays: number
    signups: number
}

export type AdminActivityResponse = {
    granularity: ActivityGranularity
    points: ActivityPoint[]
    totals: { plays: number; signups: number }
}

const DAY_MS = 24 * 60 * 60 * 1000
const PAGE = 1000
const MAX_PAGES = 60 // safety cap (≤ 60k rows per series)

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`
}

function dayKey(d: Date): string {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function monthKey(d: Date): string {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

function startOfDayUTC(d: Date): Date {
    return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    )
}

/** Monday-based week start (UTC). */
function startOfWeekUTC(d: Date): Date {
    const day = startOfDayUTC(d)
    const dow = (day.getUTCDay() + 6) % 7 // 0 = Monday
    return new Date(day.getTime() - dow * DAY_MS)
}

function startOfMonthUTC(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function pickGranularity(spanDays: number): ActivityGranularity {
    if (spanDays <= 45) return "day"
    if (spanDays <= 400) return "week"
    return "month"
}

/** Key a timestamp into the bucket it belongs to. */
function bucketKeyFor(iso: string, gran: ActivityGranularity): string {
    const d = new Date(iso)
    if (gran === "day") return dayKey(startOfDayUTC(d))
    if (gran === "week") return dayKey(startOfWeekUTC(d))
    return monthKey(startOfMonthUTC(d))
}

/** Ordered, gap-free list of bucket keys spanning [from, to]. */
function enumerateBuckets(
    from: Date,
    to: Date,
    gran: ActivityGranularity,
): { key: string; date: string }[] {
    const out: { key: string; date: string }[] = []
    if (gran === "month") {
        let cur = startOfMonthUTC(from)
        const end = startOfMonthUTC(to)
        while (cur <= end) {
            out.push({ key: monthKey(cur), date: cur.toISOString() })
            cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1))
        }
        return out
    }
    const step = gran === "week" ? 7 : 1
    let cur = gran === "week" ? startOfWeekUTC(from) : startOfDayUTC(from)
    const end = gran === "week" ? startOfWeekUTC(to) : startOfDayUTC(to)
    while (cur <= end) {
        out.push({ key: dayKey(cur), date: cur.toISOString() })
        cur = new Date(cur.getTime() + step * DAY_MS)
    }
    return out
}

/** Page through a table's created_at within [fromISO, toISO). */
async function fetchCreatedAts(
    admin: AdminClient,
    table: string,
    fromISO: string,
    toISO: string,
): Promise<string[]> {
    const out: string[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
        const offset = page * PAGE
        const { data, error } = await admin
            .from(table)
            .select("created_at")
            .gte("created_at", fromISO)
            .lt("created_at", toISO)
            .order("created_at", { ascending: true })
            .range(offset, offset + PAGE - 1)
        if (error) throw error
        const rows = (data ?? []) as { created_at: string | null }[]
        for (const r of rows) if (r.created_at) out.push(r.created_at)
        if (rows.length < PAGE) break
    }
    return out
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const sp = request.nextUrl.searchParams
    const now = new Date()
    const toParam = sp.get("to")
    const fromParam = sp.get("from")

    // `to` is exclusive of the following day so "today" is fully included.
    const toDate = toParam ? new Date(toParam) : now
    const fromDate = fromParam
        ? new Date(fromParam)
        : new Date(now.getTime() - 6 * DAY_MS) // default: last 7 days
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        return NextResponse.json({ error: "BAD_RANGE" }, { status: 400 })
    }

    // Normalise to whole-day boundaries; query window is [fromStart, toEnd).
    const fromStart = startOfDayUTC(fromDate)
    const toEndExclusive = new Date(startOfDayUTC(toDate).getTime() + DAY_MS)
    const spanDays = Math.max(
        1,
        Math.round((toEndExclusive.getTime() - fromStart.getTime()) / DAY_MS),
    )
    const granularity = pickGranularity(spanDays)

    try {
        const [playAts, signupAts] = await Promise.all([
            fetchCreatedAts(
                admin,
                "chat_sessions",
                fromStart.toISOString(),
                toEndExclusive.toISOString(),
            ),
            fetchCreatedAts(
                admin,
                "profiles",
                fromStart.toISOString(),
                toEndExclusive.toISOString(),
            ),
        ])

        const buckets = enumerateBuckets(fromStart, toDate, granularity)
        const index = new Map<string, number>()
        const points: ActivityPoint[] = buckets.map((b, i) => {
            index.set(b.key, i)
            return { date: b.date, plays: 0, signups: 0 }
        })

        for (const iso of playAts) {
            const i = index.get(bucketKeyFor(iso, granularity))
            if (i !== undefined) points[i].plays++
        }
        for (const iso of signupAts) {
            const i = index.get(bucketKeyFor(iso, granularity))
            if (i !== undefined) points[i].signups++
        }

        const totals = {
            plays: playAts.length,
            signups: signupAts.length,
        }

        return NextResponse.json(
            { granularity, points, totals } satisfies AdminActivityResponse,
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/activity] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
