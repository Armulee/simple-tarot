import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json()
        const ipAddress = getClientIP(req)

        // Check daily ad watch limit
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
        const maxDailyAds = 10

        if (dailyAdWatches >= maxDailyAds) {
            return NextResponse.json({ 
                success: false, 
                message: 'Daily ad limit reached (10 ads per day)' 
            })
        }

        // Add stars for watching ad
        const starsPerAd = 2
        const { data: addStarsData, error: addStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: userId || null,
                p_ip_address: ipAddress,
                p_amount: starsPerAd,
                p_transaction_type: 'ad_watch',
                p_description: `Watched ad - ${starsPerAd} stars`
            })

        if (addStarsError) {
            console.error('Error adding stars:', addStarsError)
            return NextResponse.json({ error: 'Failed to add stars' }, { status: 500 })
        }

        // Record ad watch
        const { error: adWatchError } = await supabase
            .from('ad_watches')
            .insert({
                user_id: userId || null,
                ip_address: ipAddress,
                ad_count: 1,
                stars_earned: starsPerAd
            })

        if (adWatchError) {
            console.error('Error recording ad watch:', adWatchError)
            return NextResponse.json({ error: 'Failed to record ad watch' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Thanks for watching! You earned ${starsPerAd} stars!`,
            stars: addStarsData,
            dailyAdWatches: dailyAdWatches + 1
        })
    } catch (error) {
        console.error('Error in watch-ad API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}