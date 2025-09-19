import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
    try {
        const { userId, code } = await req.json()

        if (!userId || !code) {
            return NextResponse.json({ 
                success: false, 
                message: 'User ID and referral code are required' 
            })
        }

        // Check if user has already used a referral code
        const { data: existingReferral, error: existingError } = await supabase
            .from('referrals')
            .select('id')
            .eq('referee_id', userId)
            .single()

        if (existingError && existingError.code !== 'PGRST116') {
            console.error('Error checking existing referral:', existingError)
            return NextResponse.json({ error: 'Failed to check existing referral' }, { status: 500 })
        }

        if (existingReferral) {
            return NextResponse.json({ 
                success: false, 
                message: 'You have already used a referral code' 
            })
        }

        // Find the referral code
        const { data: referralData, error: referralError } = await supabase
            .from('referrals')
            .select('id, referrer_id, referral_code')
            .eq('referral_code', code)
            .single()

        if (referralError || !referralData) {
            return NextResponse.json({ 
                success: false, 
                message: 'Invalid referral code' 
            })
        }

        // Check if user is trying to use their own referral code
        if (referralData.referrer_id === userId) {
            return NextResponse.json({ 
                success: false, 
                message: 'You cannot use your own referral code' 
            })
        }

        // Add stars to referee (person using the code)
        const starsPerReferral = 5
        const { data: addStarsData, error: addStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: userId,
                p_amount: starsPerReferral,
                p_transaction_type: 'referral',
                p_description: `Used referral code - ${starsPerReferral} stars`
            })

        if (addStarsError) {
            console.error('Error adding stars to referee:', addStarsError)
            return NextResponse.json({ error: 'Failed to add stars' }, { status: 500 })
        }

        // Add stars to referrer (person who created the code)
        const { error: addReferrerStarsError } = await supabase
            .rpc('add_stars', {
                p_user_id: referralData.referrer_id,
                p_amount: starsPerReferral,
                p_transaction_type: 'referral_reward',
                p_description: `Referral reward - ${starsPerReferral} stars`
            })

        if (addReferrerStarsError) {
            console.error('Error adding stars to referrer:', addReferrerStarsError)
            return NextResponse.json({ error: 'Failed to add referrer stars' }, { status: 500 })
        }

        // Update referral record with referee
        const { error: updateError } = await supabase
            .from('referrals')
            .update({ referee_id: userId })
            .eq('id', referralData.id)

        if (updateError) {
            console.error('Error updating referral record:', updateError)
            return NextResponse.json({ error: 'Failed to update referral record' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Referral code used successfully! You and the referrer both earned ${starsPerReferral} stars!`,
            stars: addStarsData
        })
    } catch (error) {
        console.error('Error in use-referral API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}