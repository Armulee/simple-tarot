import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  const did = await readAndVerifyDid()
  const userId = req.nextUrl.searchParams.get("user_id")
  if (!did && !userId) return NextResponse.json({ error: "NO_ID" }, { status: 400 })
  const { data, error } = await supabase.rpc("star_get_or_create", {
    p_anon_device_id: did,
    p_user_id: userId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

