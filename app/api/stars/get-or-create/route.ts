import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid, generateDid, setDidCookie } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  let did = await readAndVerifyDid()
  const userId = req.nextUrl.searchParams.get("user_id")
  // If anonymous and no DID cookie (e.g., admin deleted row/cookie missing), create a new DID and set cookie
  if (!userId && !did) {
    const newDid = generateDid()
    await setDidCookie(newDid)
    did = newDid
  }
  const { data, error } = await supabase.rpc("star_get_or_create", {
    p_anon_device_id: did,
    p_user_id: userId,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}

