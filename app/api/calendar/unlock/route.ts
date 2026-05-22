import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase"
import { getActiveSubscriptionInfo } from "@/lib/server/subscription"

const UNLOCK_COST = 1

const requestSchema = z.object({
    user_id: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: Request) {
    let payload: z.infer<typeof requestSchema>
    try {
        payload = requestSchema.parse(await req.json())
    } catch (err) {
        return NextResponse.json(
            { error: (err as Error).message || "BAD_REQUEST" },
            { status: 400 },
        )
    }

    const { user_id: userId, date } = payload

    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SUPABASE_ADMIN_UNAVAILABLE" },
            { status: 500 },
        )
    }

    // Idempotency: if this date was already paid for, return success without
    // touching the star balance.
    const { data: existing, error: existingErr } = await supabaseAdmin
        .from("calendar_unlocks")
        .select("id, unlocked_date, stars_spent, created_at")
        .eq("user_id", userId)
        .eq("unlocked_date", date)
        .maybeSingle()
    if (existingErr) {
        return NextResponse.json(
            { error: existingErr.message },
            { status: 500 },
        )
    }
    if (existing) {
        return NextResponse.json({
            ok: true,
            already_unlocked: true,
            unlock: existing,
        })
    }

    // Reuse the same star accounting that /api/stars/spend implements, so the
    // daily / plan / addon buckets stay consistent.
    const subscription = await getActiveSubscriptionInfo(userId)
    const { data: currentData, error: currentErr } = await supabaseAdmin.rpc(
        "star_get_or_create",
        { p_anon_device_id: null, p_user_id: userId },
    )
    if (currentErr) {
        return NextResponse.json(
            { error: currentErr.message },
            { status: 500 },
        )
    }

    const row = (currentData?.[0] ?? {}) as {
        daily_stars?: number
        plan_stars?: number
        addon_stars?: number
        engagement_stars_current?: number
        engagement_stars_total?: number
        daily_last_refill_at?: string | null
        plan_last_refill_at?: string | null
        addon_last_refill_at?: string | null
    }
    const dailyStars = Number(row.daily_stars ?? 0)
    let planStars = Number(row.plan_stars ?? 0)
    let addonStars = Number(row.addon_stars ?? 0)
    const engagementStarsCurrent = Number(row.engagement_stars_current ?? 0)
    const engagementStarsTotal = Number(row.engagement_stars_total ?? 0)
    let planLastRefillMs = row.plan_last_refill_at
        ? new Date(row.plan_last_refill_at).getTime()
        : null
    let addonLastRefillMs = row.addon_last_refill_at
        ? new Date(row.addon_last_refill_at).getTime()
        : null
    let dailyLastRefillAt = row.daily_last_refill_at ?? null

    if (
        subscription?.currentPeriodStart &&
        subscription.currentPeriodStart > 0
    ) {
        if (
            !planLastRefillMs ||
            planLastRefillMs < subscription.currentPeriodStart
        ) {
            planStars = subscription.baseStars
            planLastRefillMs = subscription.currentPeriodStart
        }
        if (
            !addonLastRefillMs ||
            addonLastRefillMs < subscription.currentPeriodStart
        ) {
            addonStars = subscription.addonStars
            addonLastRefillMs = subscription.currentPeriodStart
        }
    } else if (planStars > 0 || addonStars > 0) {
        planStars = 0
        addonStars = 0
        planLastRefillMs = null
        addonLastRefillMs = null
    }

    const totalBefore = dailyStars + planStars + addonStars
    if (totalBefore < UNLOCK_COST) {
        return NextResponse.json(
            {
                ok: false,
                error: "INSUFFICIENT_STARS",
                current_stars: totalBefore,
                cost: UNLOCK_COST,
            },
            { status: 402 },
        )
    }

    let remaining = UNLOCK_COST
    let nextDaily = dailyStars
    let nextPlan = planStars
    let nextAddon = addonStars
    if (nextDaily >= remaining) {
        nextDaily -= remaining
        remaining = 0
    } else {
        remaining -= nextDaily
        nextDaily = 0
    }
    if (remaining > 0) {
        if (nextPlan >= remaining) {
            nextPlan -= remaining
            remaining = 0
        } else {
            remaining -= nextPlan
            nextPlan = 0
        }
    }
    if (remaining > 0) {
        if (nextAddon >= remaining) {
            nextAddon -= remaining
            remaining = 0
        } else {
            remaining -= nextAddon
            nextAddon = 0
        }
    }

    if (dailyStars >= 6 && nextDaily < 6) {
        dailyLastRefillAt = new Date().toISOString()
    }

    // Insert the unlock row first. If a duplicate slipped past the earlier
    // SELECT (race), the unique index will reject it and we return success
    // without charging.
    const { error: insertErr } = await supabaseAdmin
        .from("calendar_unlocks")
        .insert({
            user_id: userId,
            unlocked_date: date,
            stars_spent: UNLOCK_COST,
        })
    if (insertErr) {
        const isDuplicate =
            insertErr.code === "23505" ||
            /duplicate/i.test(insertErr.message || "")
        if (isDuplicate) {
            return NextResponse.json({
                ok: true,
                already_unlocked: true,
            })
        }
        return NextResponse.json(
            { error: insertErr.message },
            { status: 500 },
        )
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
        .from("stars")
        .update({
            daily_stars: nextDaily,
            plan_stars: nextPlan,
            addon_stars: nextAddon,
            engagement_stars_current: Math.max(
                0,
                engagementStarsCurrent - UNLOCK_COST,
            ),
            engagement_stars_total: engagementStarsTotal,
            plan_last_refill_at: planLastRefillMs
                ? new Date(planLastRefillMs).toISOString()
                : null,
            addon_last_refill_at: addonLastRefillMs
                ? new Date(addonLastRefillMs).toISOString()
                : null,
            daily_last_refill_at: dailyLastRefillAt,
            last_refill_at: dailyLastRefillAt,
            current_stars: nextDaily + nextPlan + nextAddon,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select(
            "daily_stars,plan_stars,addon_stars,engagement_stars_current,engagement_stars_total,current_stars,daily_last_refill_at",
        )
        .maybeSingle()

    if (updateErr) {
        // Roll back the unlock so the user isn't credited a free day if the
        // star deduction failed.
        await supabaseAdmin
            .from("calendar_unlocks")
            .delete()
            .eq("user_id", userId)
            .eq("unlocked_date", date)
        return NextResponse.json(
            { error: updateErr.message },
            { status: 500 },
        )
    }

    // Mirror the response shape used by /api/stars/spend so the client can
    // reuse the same star-state plumbing if needed.
    return NextResponse.json({
        ok: true,
        already_unlocked: false,
        unlocked_date: date,
        stars_spent: UNLOCK_COST,
        stars: {
            daily_stars: updated?.daily_stars ?? nextDaily,
            plan_stars: updated?.plan_stars ?? nextPlan,
            addon_stars: updated?.addon_stars ?? nextAddon,
            engagement_stars_current:
                updated?.engagement_stars_current ??
                Math.max(0, engagementStarsCurrent - UNLOCK_COST),
            engagement_stars_total:
                updated?.engagement_stars_total ?? engagementStarsTotal,
            current_stars:
                updated?.current_stars ?? nextDaily + nextPlan + nextAddon,
            daily_last_refill_at:
                updated?.daily_last_refill_at ?? dailyLastRefillAt,
        },
    })
}

export async function GET(req: Request) {
    if (!supabaseAdmin) {
        return NextResponse.json(
            { error: "SUPABASE_ADMIN_UNAVAILABLE" },
            { status: 500 },
        )
    }
    const url = new URL(req.url)
    const userId = url.searchParams.get("user_id")
    if (!userId) {
        return NextResponse.json({ unlocks: [] })
    }
    const { data, error } = await supabaseAdmin
        .from("calendar_unlocks")
        .select("unlocked_date, stars_spent, created_at")
        .eq("user_id", userId)
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({
        unlocks:
            data?.map((r) => ({
                date: r.unlocked_date,
                starsSpent: r.stars_spent,
                createdAt: r.created_at,
            })) ?? [],
    })
}
