import { NextResponse } from "next/server"
import { generateDid, setDidCookie } from "@/lib/server/did"

export async function POST() {
  const did = generateDid()
  await setDidCookie(did)
  return NextResponse.json({ ok: true })
}

