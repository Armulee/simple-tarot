import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ 
                success: false, 
                message: 'User ID is required' 
            })
        }

        // Check if user already has a referral code
        const { data: existingCode, error: existingError } = await supabase
            .from('referrals')
            .select('referral_code')
            .eq('referrer_id', userId)
            .single()

        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Error checking existing referral code:', existingError)
            return NextResponse.json({ error: 'Failed to check referral code' }, { status: 500 })
        }

        if (existingCode) {
            return NextResponse.json({
                success: true,
                code: existingCode.referral_code,
                message: 'Referral code retrieved successfully'
            })
        }

        // Generate new referral code
        const referralCode = generateReferralCode()

        // Create referral record
        const { error: createError } = await supabase
            .from('referrals')
            .insert({
                referrer_id: userId,
                referral_code: referralCode
            })

        if (createError) {
            console.error('Error creating referral code:', createError)
            return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            code: referralCode,
            message: 'Referral code created successfully'
        })
    } catch (error) {
        console.error('Error in referral-code API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}