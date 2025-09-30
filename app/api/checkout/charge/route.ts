import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      planLabel,
      amountUsd,
      payMethod,
      card,
      userId,
    }: {
      planLabel: string
      amountUsd: number
      payMethod: "apple" | "google" | "paypal" | "card"
      card?: { name: string; number: string; expiry: string; cvc: string }
      userId?: string | null
    } = body || {}

    if (!planLabel || !Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
    }
    if (!payMethod) {
      return NextResponse.json({ error: "PAYMENT_METHOD_REQUIRED" }, { status: 400 })
    }
    if (payMethod === "card") {
      if (!card?.name || !card?.number || !card?.expiry || !card?.cvc) {
        return NextResponse.json({ error: "CARD_REQUIRED" }, { status: 400 })
      }
    }

    // TODO: integrate Checkout.com SDK/server-side call here.
    // For now, simulate an approval with a fake transaction id
    const txId = `tx_${Math.random().toString(36).slice(2, 10)}`

    return NextResponse.json({ ok: true, transactionId: txId })
  } catch (_err) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}

