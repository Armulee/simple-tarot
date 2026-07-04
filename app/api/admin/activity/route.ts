import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
    type ActivityGranularity,
    type ActivityPoint,
    type AdminActivityResponse,
    type MetricKey,
} from "@/lib/admin/activity-metrics"

type AdminClient = NonNullable<typeof supabaseAdmin>

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000
const PAGE = 1000
const MAX_PAGES = 60 // safety cap (≤ 60k rows per query)

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
            cur = new Date(
                Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1),
            )
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

type Row = { created_at: string | null; user_id?: string | null }

/** Page through a table's rows within [fromISO, toISO). */
async function fetchRows(
    admin: AdminClient,
    table: string,
    columns: string,
    fromISO: string,
    toISO: string,
): Promise<Row[]> {
    const out: Row[] = []
    for (let page = 0; page < MAX_PAGES; page++) {
        const offset = page * PAGE
        const { data, error } = await admin
            .from(table)
            .select(columns)
            .gte("created_at", fromISO)
            .lt("created_at", toISO)
            .order("created_at", { ascending: true })
            .range(offset, offset + PAGE - 1)
        if (error) throw error
        const rows = (data ?? []) as unknown as Row[]
        out.push(...rows)
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
    const fromISO = fromStart.toISOString()
    const toISO = toEndExclusive.toISOString()
    const spanDays = Math.max(
        1,
        Math.round((toEndExclusive.getTime() - fromStart.getTime()) / DAY_MS),
    )
    const granularity = pickGranularity(spanDays)

    try {
        const [stars, sessions, subs] = await Promise.all([
            fetchRows(admin, "stars", "created_at, user_id", fromISO, toISO),
            fetchRows(admin, "chat_sessions", "created_at", fromISO, toISO),
            fetchRows(
                admin,
                "billing_subscriptions",
                "created_at",
                fromISO,
                toISO,
            ),
        ])

        const buckets = enumerateBuckets(fromStart, toDate, granularity)
        const index = new Map<string, number>()
        const points: ActivityPoint[] = buckets.map((b, i) => {
            index.set(b.key, i)
            return {
                date: b.date,
                totalUsers: 0,
                anonymousUsers: 0,
                authenticatedUsers: 0,
                interpretations: 0,
                paidSubscribers: 0,
            }
        })

        const totals: Record<MetricKey, number> = {
            totalUsers: 0,
            anonymousUsers: 0,
            authenticatedUsers: 0,
            interpretations: 0,
            paidSubscribers: 0,
        }

        const bump = (iso: string | null, key: MetricKey) => {
            if (!iso) return
            const i = index.get(bucketKeyFor(iso, granularity))
            if (i === undefined) return
            points[i][key]++
            totals[key]++
        }

        // Stars rows are "users"; split into anonymous vs authenticated so
        // anonymous + authenticated always reconciles to total.
        for (const r of stars) {
            bump(r.created_at, "totalUsers")
            if (r.user_id) bump(r.created_at, "authenticatedUsers")
            else bump(r.created_at, "anonymousUsers")
        }
        for (const r of sessions) bump(r.created_at, "interpretations")
        for (const r of subs) bump(r.created_at, "paidSubscribers")

        return NextResponse.json(
            { granularity, points, totals } satisfies AdminActivityResponse,
            { status: 200 },
        )
    } catch (error) {
        console.error("[admin/activity] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
