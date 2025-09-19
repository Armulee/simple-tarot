import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

export async function POST(req: NextRequest) {
    try {
        const { userId, platform, shareUrl } = await req.json()
        const ipAddress = getClientIP(req)

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
                p_ip_address: ipAddress,
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
                ip_address: ipAddress,
                platform,
                share_url: shareUrl || null,
                stars_earned: starsPerShare
            })

        if (shareError) {
            console.error('Error recording social share:', shareError)
            return NextResponse.json({ error: 'Failed to record social share' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Thanks for sharing! You earned ${starsPerShare} stars!`,
            stars: addStarsData
        })
    } catch (error) {
        console.error('Error in social-share API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}