import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin!.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { data: profile, error } = await supabaseAdmin!
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()

        if (error && error.code !== "PGRST116") {
            return NextResponse.json(
                { error: "Failed to fetch profile" },
                { status: 500 }
            )
        }

        return NextResponse.json({ profile: profile || null })
    } catch (error) {
        console.error("Profile fetch error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.split(" ")[1]
        const {
            data: { user },
            error: authError,
        } = await supabaseAdmin!.auth.getUser(token)

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { name, bio, birthDate, birthTime, birthPlace, job, gender } =
            body

        // Prepare profile data
        const profileData = {
            id: user.id,
            name: name || null,
            bio: bio || null,
            birth_date: birthDate || null,
            birth_time: birthTime || null,
            birth_place: birthPlace || null,
            job: job || null,
            gender: gender || null,
            updated_at: new Date().toISOString(),
        }

        // Upsert profile data
        const { data: profile, error } = await supabaseAdmin!
            .from("profiles")
            .upsert(profileData, { onConflict: "id" })
            .select()
            .single()

        if (error) {
            console.error("Profile update error:", error)
            return NextResponse.json(
                { error: "Failed to update profile" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            profile,
            message: "Profile updated successfully",
        })
    } catch (error) {
        console.error("Profile update error:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
