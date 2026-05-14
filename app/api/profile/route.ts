import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

const MIN_AGE_YEARS = 13

function calculateAge(isoDate: string, today = new Date()): number | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate)
    if (!match) return null
    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)
    const day = Number.parseInt(match[3], 10)
    if (
        !Number.isFinite(year) ||
        !Number.isFinite(month) ||
        !Number.isFinite(day)
    ) {
        return null
    }
    let age = today.getFullYear() - year
    const monthDelta = today.getMonth() + 1 - month
    const dayDelta = today.getDate() - day
    if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
        age -= 1
    }
    return age
}

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
        const {
            name,
            bio,
            birthDate,
            birthTime,
            birthPlace,
            job,
            gender,
            consentedAt,
        } = body

        // Server-side enforcement: a non-null birth date must be >= 13 years old.
        if (birthDate) {
            const age = calculateAge(String(birthDate))
            if (age === null) {
                return NextResponse.json(
                    { error: "invalid_birth_date" },
                    { status: 400 },
                )
            }
            if (age < MIN_AGE_YEARS) {
                return NextResponse.json(
                    { error: "under_13" },
                    { status: 400 },
                )
            }
        }

        // Look up existing consent timestamp so we don't overwrite it on every save.
        const { data: existing } = await supabaseAdmin!
            .from("profiles")
            .select("consented_at")
            .eq("id", user.id)
            .single()

        const nowIso = new Date().toISOString()
        const nextConsentedAt =
            consentedAt === true
                ? existing?.consented_at ?? nowIso
                : existing?.consented_at ?? null

        const profileData = {
            id: user.id,
            name: name || null,
            bio: bio || null,
            birth_date: birthDate || null,
            birth_time: birthTime || null,
            birth_place: birthPlace || null,
            job: job || null,
            gender: gender || null,
            consented_at: nextConsentedAt,
            updated_at: nowIso,
        }

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
