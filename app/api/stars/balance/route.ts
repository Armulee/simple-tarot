import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const ipAddress = getClientIP(req)

        // Get current stars balance
        const { data: starsData, error: starsError } = await supabase
            .rpc('get_or_create_user_stars', {
                p_user_id: userId || null,
                p_ip_address: ipAddress
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
                p_ip_address: ipAddress
            })

        if (canClaimError) {
            console.error('Error checking daily claim:', canClaimError)
            return NextResponse.json({ error: 'Failed to check daily claim status' }, { status: 500 })
        }

        const canClaimDaily = canClaimData || false

        // Get today's daily claim
        const { data: dailyClaimData, error: dailyClaimError } = await supabase
            .from('daily_claims')
            .select('stars_claimed')
            .eq(userId ? 'user_id' : 'ip_address', userId || ipAddress)
            .eq('claim_date', new Date().toISOString().split('T')[0])
            .single()

        const dailyStarsClaimed = dailyClaimData?.stars_claimed || 0

        // Get today's ad watches count
        const { data: adWatchesData, error: adWatchesError } = await supabase
            .rpc('get_daily_ad_watch_count', {
                p_user_id: userId || null,
                p_ip_address: ipAddress
            })

        if (adWatchesError) {
            console.error('Error getting ad watch count:', adWatchesError)
            return NextResponse.json({ error: 'Failed to get ad watch count' }, { status: 500 })
        }

        const dailyAdWatches = adWatchesData || 0

        return NextResponse.json({
            success: true,
            stars: currentStars,
            canClaimDaily,
            dailyStarsClaimed,
            dailyAdWatches,
        })
    } catch (error) {
        console.error('Error in balance API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}