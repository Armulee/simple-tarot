import { NextResponse } from "next/server"
import { BirthChartGenerator } from "vedic-astrology-api/lib/utils/birthchart"

import {
    calculatePlanetaryPositions,
    calculateAscendant,
    createDate,
} from "vedic-astrology-api/lib/utils/common"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const day = searchParams.get("day")
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const hour = searchParams.get("hour")
    const minute = searchParams.get("minute")
    const timezone = searchParams.get("timezone")
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

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

    // Create instance
    const birthChartGenerator = new BirthChartGenerator()

    // Create date (library expects numeric values)
    const date = createDate(
        parseInt(year),
        parseInt(month),
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseFloat(timezone)
    )

    // Get planetary positions
    const { positions } = calculatePlanetaryPositions(
        date,
        Number(lat),
        Number(lng)
    )
    const ascendant = calculateAscendant(date, Number(lat), Number(lng))

    // Generate chart
    const birthChart = birthChartGenerator.generateBirthChart(
        positions,
        ascendant
    )

    return NextResponse.json(
        {
            houses: birthChart.houses,
            planets: birthChart.planets,
        },
        { status: 200 }
    )
}
