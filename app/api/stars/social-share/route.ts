import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getOrCreateAnonymousId, attachAnonymousIdCookie } from "@/lib/anonymous-id"

export async function POST(req: NextRequest) {
    try {
        const { userId, platform, shareUrl } = await req.json()
        const { anonymousId, isNew } = getOrCreateAnonymousId(req)

        if (!platform) {
            return NextResponse.json({ 
                success: false, 
                message: 'Platform is required' 
            })
        }

        // Add stars for social share
        const starsPerShare = 2
        const { data: addStarsData, error: addStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: userId || null,
                p_anonymous_id: anonymousId,
                p_amount: starsPerShare,
                p_transaction_type: 'social_share',
                p_description: `Shared on ${platform} - ${starsPerShare} stars`
            })

        if (addStarsError) {
            console.error('Error adding stars:', addStarsError)
            return NextResponse.json({ error: 'Failed to add stars' }, { status: 500 })
        }

        // Record social share
        const { error: shareError } = await supabase
            .from('social_shares')
            .insert({
                user_id: userId || null,
                anonymous_id: anonymousId,
                platform,
                share_url: shareUrl || null,
                stars_earned: starsPerShare
            })

        if (shareError) {
            console.error('Error recording social share:', shareError)
            return NextResponse.json({ error: 'Failed to record social share' }, { status: 500 })
        }

        const res = NextResponse.json({
            success: true,
            message: `Thanks for sharing! You earned ${starsPerShare} stars!`,
            stars: addStarsData
        })
        if (isNew) {
            attachAnonymousIdCookie(res, anonymousId)
        }
        return res
    } catch (error) {
        console.error('Error in social-share API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}