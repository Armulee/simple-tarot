import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { referralCode, userId } = body

        if (!referralCode || !userId) {
            return NextResponse.json({ error: "Missing referral code or user ID" }, { status: 400 })
        }

        // Check if this user has already been processed for this referral
        const { data: existingReferral, error: checkError } = await supabase
            .from("referral_bonuses")
            .select("*")
            .eq("referred_user_id", userId)
            .eq("referrer_id", referralCode)
            .single()

        if (checkError && checkError.code !== "PGRST116") {
            return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        if (existingReferral) {
            return NextResponse.json({ error: "Referral already processed" }, { status: 400 })
        }

        // Verify the referrer exists
        const { data: referrer, error: referrerError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", referralCode)
            .single()

        if (referrerError || !referrer) {
            return NextResponse.json({ error: "Invalid referral code" }, { status: 400 })
        }

        // Check if referrer and referee are the same person
        if (referralCode === userId) {
            return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 })
        }

        // Process the referral bonus
        const { data: result, error: processError } = await supabase.rpc("process_referral_bonus", {
            p_referrer_id: referralCode,
            p_referred_user_id: userId,
            p_bonus_amount: 5
        })

        if (processError) {
            console.error("Error processing referral bonus:", processError)
            return NextResponse.json({ error: "Failed to process referral bonus" }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            message: "Referral bonus processed successfully",
            data: result 
        })

    } catch (error) {
        console.error("Referral processing error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}