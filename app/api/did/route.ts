import { NextResponse } from "next/server"
import { readAndVerifyDid, generateDid, setDidCookie } from "@/lib/server/did"

export async function GET() {
    try {
        const did = await readAndVerifyDid()
        return NextResponse.json({ did })
    } catch {
        return NextResponse.json({ did: null })
    }
}

export async function POST() {
    try {
        const did = generateDid()
        await setDidCookie(did)
        return NextResponse.json({ did })
    } catch (error) {
        console.error("Failed to generate DID:", error)
        return NextResponse.json({ error: "Failed to generate DID" }, { status: 500 })
    }
}