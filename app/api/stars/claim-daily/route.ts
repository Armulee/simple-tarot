import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json()
        const ipAddress = getClientIP(req)

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

        if (!canClaimData) {
            return NextResponse.json({ 
                success: false, 
                message: 'Daily stars already claimed today' 
            })
        }

        // Determine stars to give (5 for anonymous, 10 for logged in users)
        const starsToGive = userId ? 10 : 5

        // Add stars to user
        const { data: addStarsData, error: addStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: userId || null,
                p_ip_address: ipAddress,
                p_amount: starsToGive,
                p_transaction_type: 'daily_claim',
                p_description: `Daily stars claim - ${starsToGive} stars`
            })

        if (addStarsError) {
            console.error('Error adding stars:', addStarsError)
            return NextResponse.json({ error: 'Failed to add stars' }, { status: 500 })
        }

        // Record daily claim
        const { error: claimError } = await supabase
            .from('daily_claims')
            .insert({
                user_id: userId || null,
                ip_address: ipAddress,
                stars_claimed: starsToGive
            })

        if (claimError) {
            console.error('Error recording daily claim:', claimError)
            return NextResponse.json({ error: 'Failed to record daily claim' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully claimed ${starsToGive} daily stars!`,
            stars: addStarsData,
            dailyStarsClaimed: starsToGive
        })
    } catch (error) {
        console.error('Error in claim-daily API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}