import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      planLabel,
      amountUsd,
      payMethod,
      card,
      userId,
      starsToAdd,
    }: {
      planLabel: string
      amountUsd: number
      payMethod: "apple" | "google" | "paypal" | "card"
      card?: { name: string; number: string; expiry: string; cvc: string }
      userId?: string | null
      starsToAdd?: number | null
    } = body || {}

    if (!planLabel || !Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 })
    }
    if (!payMethod) {
      return NextResponse.json({ error: "PAYMENT_METHOD_REQUIRED" }, { status: 400 })
    }
    if (payMethod === "card" && (!card?.name || !card?.number || !card?.expiry || !card?.cvc)) {
      return NextResponse.json({ error: "CARD_REQUIRED" }, { status: 400 })
    }

    // Checkout.com Payments API (sandbox)
    const secretKey = process.env.CHECKOUT_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: "NO_CHECKOUT_SECRET" }, { status: 500 })
    }

    const amountMinor = Math.round(amountUsd * 100)
    let paymentOk = false
    let txId: string | null = null

    if (payMethod === "card") {
      // Parse MM/YY
      const [mm, yy] = (card!.expiry || "").split("/").map((s) => s.trim())
      const expiry_month = parseInt(mm, 10)
      const expiry_year = parseInt((yy?.length === 2 ? `20${yy}` : yy) || "0", 10)

      const resp = await fetch("https://api.sandbox.checkout.com/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: secretKey,
        },
        body: JSON.stringify({
          source: {
            type: "card",
            number: card!.number.replace(/\s+/g, ""),
            expiry_month,
            expiry_year,
            cvv: card!.cvc,
            name: card!.name,
          },
          amount: amountMinor,
          currency: "USD",
          reference: `stars-${Date.now()}`,
          capture: true,
        }),
      })
      const json = await resp.json().catch(() => ({}))
      if (resp.ok && (json?.approved === true || json?.status === "Authorized" || json?.status === "Captured")) {
        paymentOk = true
        txId = json?.id || null
      } else {
        return NextResponse.json({ error: "PAYMENT_FAILED", details: json }, { status: 402 })
      }
    } else {
      // Not implemented wallet flows yet
      return NextResponse.json({ error: "METHOD_NOT_IMPLEMENTED" }, { status: 501 })
    }

    // Credit stars for packs if provided; allow exceeding 12 (cap applies only to refill)
    if (paymentOk && starsToAdd && Number.isFinite(starsToAdd) && starsToAdd > 0) {
      if (userId) {
        await supabase.rpc("star_add", { p_anon_device_id: null, p_amount: Math.floor(starsToAdd), p_user_id: userId })
      } else {
        const did = await readAndVerifyDid()
        if (did) {
          await supabase.rpc("star_add", { p_anon_device_id: did, p_amount: Math.floor(starsToAdd), p_user_id: null })
        }
      }
    }

    return NextResponse.json({ ok: true, transactionId: txId })
  } catch (_err) {
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 })
  }
}

