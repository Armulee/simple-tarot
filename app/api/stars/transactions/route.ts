import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getClientIP } from "@/lib/ip-utils"

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const ipAddress = getClientIP(req)

        // Get star transactions
        const { data: transactions, error: transactionsError } = await supabase
            .from('star_transactions')
            .select('*')
            .eq(userId ? 'user_id' : 'ip_address', userId || ipAddress)
            .order('created_at', { ascending: false })
            .limit(50)

        if (transactionsError) {
            console.error('Error getting transactions:', transactionsError)
            return NextResponse.json({ error: 'Failed to get transactions' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            transactions: transactions || []
        })
    } catch (error) {
        console.error('Error in transactions API:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}