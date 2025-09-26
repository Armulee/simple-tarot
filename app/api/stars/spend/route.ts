import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  const did = await readAndVerifyDid()
  if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })
  const { amount } = await req.json()
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "BAD_AMOUNT" }, { status: 400 })
  const cookieStore = await cookies()
  const userId = cookieStore.get("sb-user-id")?.value || null
  const { data, error } = await supabase.rpc("star_spend", {
    p_anon_device_id: userId ? null : did,
    p_amount: amount,
    p_user_id: userId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

