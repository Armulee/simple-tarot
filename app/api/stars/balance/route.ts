import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getOrCreateAnonymousId, attachAnonymousIdCookie } from "@/lib/anonymous-id"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const { anonymousId, isNew } = getOrCreateAnonymousId(req)

        // Get current stars balance
        const { data: starsData, error: starsError } = await supabase
            .rpc('get_or_create_user_stars', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId
            })

        if (starsError) {
            console.error('Error getting user stars:', starsError)
            return NextResponse.json({ error: 'Failed to get stars balance' }, { status: 500 })
        }

        const currentStars = starsData?.[0]?.stars || 0

        // Check if user can claim daily stars
        const { data: canClaimData, error: canClaimError } = await supabase
            .rpc('can_claim_daily_stars', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId
            })

        if (canClaimError) {
            console.error('Error checking daily claim:', canClaimError)
            return NextResponse.json({ error: 'Failed to check daily claim status' }, { status: 500 })
        }

        const canClaimDaily = canClaimData || false

        // Get today's daily claim
        const { data: dailyStarsClaimed, error: dailyClaimErr } = await supabase
            .rpc('get_today_daily_claim_amount', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId
            })

        // Get today's ad watches count
        const { data: adWatchesData, error: adWatchesError } = await supabase
            .rpc('get_daily_ad_watch_count', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId
            })

        if (adWatchesError) {
            console.error('Error getting ad watch count:', adWatchesError)
            return NextResponse.json({ error: 'Failed to get ad watch count' }, { status: 500 })
        }

        const dailyAdWatches = adWatchesData || 0

        const res = NextResponse.json({
            success: true,
            stars: currentStars,
            canClaimDaily,
            dailyStarsClaimed: dailyStarsClaimed || 0,
            dailyAdWatches,
        })
        if (isNew) {
            attachAnonymousIdCookie(res, anonymousId)
        }
        return res
    } catch (error) {
        console.error('Error in balance API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}