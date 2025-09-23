import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getOrCreateAnonymousId, attachAnonymousIdCookie } from "@/lib/anonymous-id"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const { anonymousId, isNew } = getOrCreateAnonymousId(req)

        // Get star transactions
        const { data: transactions, error: transactionsError } = await supabase
            .from('star_transactions')
            .select('*')
            .eq(userId ? 'user_id' : 'anonymous_id', userId || anonymousId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (transactionsError) {
            console.error('Error getting transactions:', transactionsError)
            return NextResponse.json({ error: 'Failed to get transactions' }, { status: 500 })
        }

        const res = NextResponse.json({
            success: true,
            transactions: transactions || []
        })
        if (isNew) {
            attachAnonymousIdCookie(res, anonymousId)
        }
        return res
    } catch (error) {
        console.error('Error in transactions API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}