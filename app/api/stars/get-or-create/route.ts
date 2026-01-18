import { NextRequest, NextResponse } from "next/server"
import { readAndVerifyDid, generateDid, setDidCookie } from "@/lib/server/did"
import { supabase } from "@/lib/supabase"
// import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get("user_id")
    // If logged in, resolve strictly by user_id; otherwise require DID
    if (userId) {
        // Pass DID if present so first-login can grant (anon current + 10) to a new user row
        const did = await readAndVerifyDid()
        const { data, error } = await supabase.rpc("star_get_or_create", {
            p_anon_device_id: did,
            p_user_id: userId,
        })
        if (error) {
            console.error("star_get_or_create(user) error", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                userId,
                hasDid: Boolean(did),
            })
            return NextResponse.json({ error: error.message }, { status: 400 })
        }
        return NextResponse.json({ data })
    }

    let did = await readAndVerifyDid()
    if (!did) {
        const newDid = generateDid()
        await setDidCookie(newDid)
        did = newDid
    }
    const { data, error } = await supabase.rpc("star_get_or_create", {
        p_anon_device_id: did,
        p_user_id: null,
    })
    if (error) {
        console.error("star_get_or_create(anon) error", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            hasDid: Boolean(did),
        })
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ data })
}
