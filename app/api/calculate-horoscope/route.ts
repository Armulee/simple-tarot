import { NextResponse } from "next/server"
import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import type { AstrologySystem } from "@/lib/astrology/types"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)

        const day = searchParams.get("day")
        const month = searchParams.get("month")
        const year = searchParams.get("year")
        const hour = searchParams.get("hour")
        const minute = searchParams.get("minute")
        const timezone = searchParams.get("timezone")
        const lat = searchParams.get("lat")
        const lng = searchParams.get("lng")
        const systemParam =
            searchParams.get("system")?.toLowerCase() ?? "vedic_sidereal"
        const system: AstrologySystem =
            systemParam === "western_tropical"
                ? "western_tropical"
                : "vedic_sidereal"

        if (
            !day ||
            !month ||
            !year ||
            !hour ||
            !minute ||
            timezone == null ||
            !lat ||
            !lng
        ) {
            return NextResponse.json(
                { error: "Missing required query parameters" },
                { status: 400 }
            )
        }

        const chart = await calculateSwissEphChart(
            {
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day),
                hour: parseInt(hour),
                minute: parseInt(minute),
                timezone: parseFloat(timezone),
                lat: Number(lat),
                lng: Number(lng),
            },
            system
        )

        return NextResponse.json(
            {
                houses: chart.houses,
                planets: chart.planets,
                ascendant: chart.ascendant,
                mc: chart.mc,
                aspects: chart.aspects,
                system: chart.system,
                ayanamsa: chart.ayanamsa,
            },
            { status: 200 }
        )
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to calculate chart"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
