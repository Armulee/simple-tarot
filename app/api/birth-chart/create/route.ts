import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { readAndVerifyDid } from "@/lib/server/did"
import { nanoid } from "nanoid"
import { BirthChartGenerator } from "vedic-astrology-api/lib/utils/birthchart"
import {
    calculatePlanetaryPositions,
    calculateAscendant,
    createDate,
} from "vedic-astrology-api/lib/utils/common"

// Create a new birth chart entry and return the ID
export async function POST(req: NextRequest) {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json(
                { error: "SUPABASE_NOT_CONFIGURED" },
                { status: 500 }
            )
        }

        const did = await readAndVerifyDid()
        if (!did) return NextResponse.json({ error: "NO_DID" }, { status: 400 })

        const body = await req.json()
        const day = parseInt(body?.day)
        const month = parseInt(body?.month)
        const year = parseInt(body?.year)
        const hour = parseInt(body?.hour)
        const minute = parseInt(body?.minute)
        const timezone = parseFloat(body?.timezone)
        const lat = parseFloat(body?.lat)
        const lng = parseFloat(body?.lng)
        const country = body?.country || null
        const stateProv = body?.state_prov || null
        const ownerUserId: string | null =
            typeof body?.user_id === "string" && body.user_id
                ? body.user_id
                : null

        if (
            !day ||
            !month ||
            !year ||
            hour === undefined ||
            minute === undefined ||
            timezone === undefined ||
            !lat ||
            !lng
        ) {
            return NextResponse.json(
                { error: "MISSING_REQUIRED_FIELDS" },
                { status: 400 }
            )
        }

        // Validate date and time ranges
        if (
            day < 1 ||
            day > 31 ||
            month < 1 ||
            month > 12 ||
            year < 1900 ||
            year > new Date().getFullYear() ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            return NextResponse.json(
                { error: "INVALID_DATE_OR_TIME" },
                { status: 400 }
            )
        }

        // Calculate birth chart
        const birthChartGenerator = new BirthChartGenerator()
        const date = createDate(year, month, day, hour, minute, timezone)
        const { positions } = calculatePlanetaryPositions(date, lat, lng)
        const ascendant = calculateAscendant(date, lat, lng)
        const birthChart = birthChartGenerator.generateBirthChart(
            positions,
            ascendant
        )

        // Generate a random short ID
        const shortId = nanoid(7)

        // Check if ID already exists and generate a new one if needed
        let attempts = 0
        let finalId = shortId
        while (attempts < 5) {
            const { data: existing } = await supabaseAdmin
                .from("birth_charts")
                .select("id")
                .eq("id", finalId)
                .maybeSingle()

            if (!existing) break

            finalId = nanoid(7)
            attempts++
        }

        const { error } = await supabaseAdmin.from("birth_charts").insert({
            id: finalId,
            did,
            owner_user_id: ownerUserId,
            day,
            month,
            year,
            hour,
            minute,
            timezone,
            lat,
            lng,
            country,
            state_prov: stateProv,
            houses: birthChart.houses,
            planets: birthChart.planets,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ id: finalId })
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "INTERNAL_ERROR"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
