import { NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"

export async function GET() {
  const did = await readAndVerifyDid()
  if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })
  const cookieStore = await cookies()
  const userId = cookieStore.get("sb-user-id")?.value || null
  const { data, error } = await supabase.rpc("star_refresh", {
    p_anon_device_id: userId ? null : did,
    p_user_id: userId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

