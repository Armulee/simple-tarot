import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

export async function POST(req: NextRequest) {
    try {
        const { userId, amount, transaction_type } = await req.json()
        const ipAddress = getClientIP(req)

        if (!amount || amount <= 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Invalid amount' 
            })
        }

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

        if (currentStars < amount) {
            return NextResponse.json({ 
                success: false, 
                message: 'Not enough stars' 
            })
        }

        // Deduct stars (negative amount)
        const { data: addStarsData, error: addStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: userId || null,
                p_ip_address: ipAddress,
                p_amount: -amount, // Negative amount to deduct
                p_transaction_type: transaction_type || 'reading_cost',
                p_description: `Used ${amount} stars for ${transaction_type || 'reading'}`
            })

        if (addStarsError) {
            console.error('Error deducting stars:', addStarsError)
            return NextResponse.json({ error: 'Failed to deduct stars' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Successfully used ${amount} stars`,
            stars: addStarsData
        })
    } catch (error) {
        console.error('Error in use-stars API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}