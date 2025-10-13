import { NextResponse } from "next/server"
import { readAndVerifyDid } from "@/lib/server/did"

export async function GET() {
    try {
        const did = await readAndVerifyDid()
        return NextResponse.json({ did })
    } catch {
        return NextResponse.json({ did: null })
    }
}