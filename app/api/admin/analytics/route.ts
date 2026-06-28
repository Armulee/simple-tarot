import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { supabaseAdmin } from "@/lib/supabase"
import type {
    ActiveAnalytics,
    AdminAnalyticsResponse,
    AnalyticsContext,
    ConversionAnalytics,
    EngagementAnalytics,
    HeatmapAnalytics,
    HeroKpi,
    KpiFormat,
    ReadingAnalytics,
    RetentionAnalytics,
    ReturningAnalytics,
    TrendPoint,
} from "@/lib/admin/analytics-shared"

export const dynamic = "force-dynamic"

type AdminClient = NonNullable<typeof supabaseAdmin>
const DAY_MS = 24 * 60 * 60 * 1000

/** Bangkok-anchored ISO bound for a YYYY-MM-DD date. */
function bound(date: string, end: boolean): string {
    return `${date}T${end ? "23:59:59" : "00:00:00"}+07:00`
}

function addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00+07:00`)
    const n = new Date(d.getTime() + days * DAY_MS)
    // format back to YYYY-MM-DD in Bangkok
    const local = new Date(n.getTime() + 7 * 60 * 60 * 1000)
    return local.toISOString().slice(0, 10)
}

async function rpc<T>(
    admin: AdminClient,
    fn: string,
    args: Record<string, string>,
): Promise<T> {
    const { data, error } = await admin.rpc(fn, args)
    if (error) throw new Error(`${fn}: ${error.message}`)
    return data as T
}

function changePct(value: number, prev: number | null): number | null {
    if (prev === null || prev === 0) return null
    return (value - prev) / prev
}

function sparkValues(trend: TrendPoint[] | undefined): number[] {
    return (trend ?? []).map((p) => p.value)
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request)
    if (!auth.ok) return auth.response
    const { admin } = auth

    const sp = request.nextUrl.searchParams
    const todayBkk = new Date(Date.now() + 7 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    const to = sp.get("to") || todayBkk
    const from = sp.get("from") || addDays(to, -6)

    // Previous equal-length window, immediately preceding the current one.
    const lenDays =
        Math.round(
            (new Date(`${to}T00:00:00+07:00`).getTime() -
                new Date(`${from}T00:00:00+07:00`).getTime()) /
                DAY_MS,
        ) + 1
    const prevEnd = addDays(from, -1)
    const prevStart = addDays(prevEnd, -(lenDays - 1))

    // Trailing 14 days (for the week-over-week momentum metric).
    const wowStart = addDays(todayBkk, -14)

    const cur = { p_start: bound(from, false), p_end: bound(to, true) }
    const prev = {
        p_start: bound(prevStart, false),
        p_end: bound(prevEnd, true),
    }

    try {
        const [
            returning,
            active,
            reading,
            engagement,
            retention,
            conversion,
            heatmap,
            context,
            // previous-period values for hero deltas
            returningPrev,
            activePrev,
            readingPrev,
            retentionPrev,
            conversionPrev,
            // trailing-14d readings for WoW
            wowReading,
        ] = await Promise.all([
            rpc<ReturningAnalytics>(admin, "admin_analytics_returning", cur),
            rpc<ActiveAnalytics>(admin, "admin_analytics_active", cur),
            rpc<ReadingAnalytics>(admin, "admin_analytics_reading", cur),
            rpc<EngagementAnalytics>(admin, "admin_analytics_engagement", cur),
            rpc<RetentionAnalytics>(admin, "admin_analytics_retention", cur),
            rpc<ConversionAnalytics>(admin, "admin_analytics_conversion", cur),
            rpc<HeatmapAnalytics>(admin, "admin_analytics_heatmap", cur),
            rpc<AnalyticsContext>(admin, "admin_analytics_context", {
                ...cur,
                p_prev_start: bound(prevStart, false),
                p_prev_end: bound(prevEnd, true),
            }),
            rpc<ReturningAnalytics>(admin, "admin_analytics_returning", prev),
            rpc<ActiveAnalytics>(admin, "admin_analytics_active", prev),
            rpc<ReadingAnalytics>(admin, "admin_analytics_reading", prev),
            rpc<RetentionAnalytics>(admin, "admin_analytics_retention", prev),
            rpc<ConversionAnalytics>(admin, "admin_analytics_conversion", prev),
            rpc<ReadingAnalytics>(admin, "admin_analytics_reading", {
                p_start: bound(wowStart, false),
                p_end: bound(todayBkk, true),
            }),
        ])

        // Week-over-week readings growth from the trailing-14d daily series.
        const wv = sparkValues(wowReading.trend)
        const last7 = wv.slice(-7).reduce((a, b) => a + b, 0)
        const prev7 = wv.slice(-14, -7).reduce((a, b) => a + b, 0)
        const wowGrowth = prev7 > 0 ? (last7 - prev7) / prev7 : null

        // Free → paid = of registered actors in range, how many subscribed.
        const stageCount = (c: ConversionAnalytics, key: string) =>
            c.stages.find((s) => s.key === key)?.count ?? 0
        const freeToPaid = (c: ConversionAnalytics) => {
            const reg = stageCount(c, "registered")
            return reg > 0 ? stageCount(c, "subscribed") / reg : 0
        }

        const k = (
            key: string,
            value: number,
            prevValue: number | null,
            format: KpiFormat,
            spark: number[],
            available = true,
        ): HeroKpi => ({
            key,
            value,
            prevValue,
            changePct: changePct(value, prevValue),
            format,
            spark,
            available,
        })

        const hero: HeroKpi[] = [
            // headline investor metrics
            k("d7Retention", retention.d7, retentionPrev.d7, "percent",
                retention.curve.map((c) => c.rolling ?? 0)),
            k("stickiness", active.stickiness, activePrev.stickiness, "percent",
                sparkValues(active.trend)),
            k("wowGrowth", wowGrowth ?? 0, null, "percent", wv),
            k("repeatRate", returning.repeatRate, returningPrev.repeatRate, "percent",
                sparkValues(returning.trend)),
            k("freeToPaid", freeToPaid(conversion), freeToPaid(conversionPrev), "percent", []),
            // context totals
            k("totalUsers", context.totalUsers, context.totalUsersPrev, "number",
                sparkValues(context.newUsersTrend)),
            k("totalReadings", reading.total, readingPrev.total, "number",
                sparkValues(reading.trend)),
            k("subscribers", context.subscribers, context.subscribersPrev, "number",
                sparkValues(context.subscribersTrend)),
            k("revenue", context.revenueUsd, context.revenuePrev, "currency",
                sparkValues(context.revenueTrend), context.revenueAvailable),
        ]

        const payload: AdminAnalyticsResponse = {
            hero,
            returning,
            active,
            reading,
            engagement,
            retention,
            conversion,
            heatmap,
            context,
            flags: {
                revenueAvailable: context.revenueAvailable,
                categoriesAvailable: false, // no category column — placeholder
                mrrAvailable: false, // no plan→price mapping — placeholder
            },
        }
        return NextResponse.json(payload, { status: 200 })
    } catch (error) {
        console.error("[admin/analytics] failed", error)
        return NextResponse.json({ error: "FAILED_TO_LOAD" }, { status: 500 })
    }
}
