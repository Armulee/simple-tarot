import { NextResponse } from "next/server"
import { generateDid, setDidCookie } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"

export async function POST() {
  const did = generateDid()
  await setDidCookie(did)
  try {
    await supabase.rpc("star_get_or_create", { p_anon_device_id: did, p_user_id: null })
  } catch {}
  return NextResponse.json({ ok: true })
}

