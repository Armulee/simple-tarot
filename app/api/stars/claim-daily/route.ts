import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getOrCreateAnonymousId, attachAnonymousIdCookie } from "@/lib/anonymous-id"

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json()
        const { anonymousId, isNew } = getOrCreateAnonymousId(req)

        // Atomically claim daily stars
        const { data: newBalance, error: claimError } = await supabase
            .rpc('claim_daily_stars', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId
            })

        if (claimError) {
            console.error('Error claiming daily stars:', claimError)
            return NextResponse.json({ error: 'Failed to claim daily stars' }, { status: 500 })
        }

        // Fetch today's claimed amount
        const { data: todaysClaim, error: todayErr } = await supabase
            .rpc('get_today_daily_claim_amount', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId
            })

        if (todayErr) {
            console.error('Error reading today claim amount:', todayErr)
        }

        const res = NextResponse.json({
            success: true,
            message: `Daily stars updated`,
            stars: newBalance,
            dailyStarsClaimed: todaysClaim || 0
        })

        if (isNew) {
            attachAnonymousIdCookie(res, anonymousId)
        }

        return res
    } catch (error) {
        console.error('Error in claim-daily API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}