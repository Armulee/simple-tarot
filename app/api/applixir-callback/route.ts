import { NextRequest, NextResponse } from "next/server"

// Optional Web Callback handler (Step 5)
// Configure this URL in Applixir dashboard and set a shared secret

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const secret = process.env.APPLIXIR_CALLBACK_SECRET

        const receivedSecret = searchParams.get("secret") || ""
        if (!secret || receivedSecret !== secret) {
            return NextResponse.json(
                { ok: false, error: "unauthorized" },
                { status: 401 }
            )
        }

        // Typical params (check Applixir docs for full list):
        // user_id, event, reward, tx, zoneId, gameId, accountId
        const userId = searchParams.get("user_id") || ""
        const event = searchParams.get("event") || ""
        const reward = Number(searchParams.get("reward") || 0)

        // TODO: Validate tx uniqueness to prevent replay (store and check)
        // TODO: Credit reward to userId in your DB

        return NextResponse.json({ ok: true, userId, event, reward })
    } catch {
        return NextResponse.json(
            { ok: false, error: "server_error" },
            { status: 500 }
        )
    }
}
