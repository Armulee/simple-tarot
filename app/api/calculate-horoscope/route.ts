import { NextRequest, NextResponse } from "next/server"

// Temporarily disable swisseph for build compatibility
// import swe from "swisseph"

// swe.swe_set_ephe_path("public/ephe")

// ตั้งค่า sidereal zodiac + ayanamsa แบบ Lahiri
// swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0)

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")
    const time = searchParams.get("time")
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")

    if (!date || !time || !lat || !lon) {
        return NextResponse.json(
            { error: "Missing parameters" },
            { status: 400 }
        )
    }

    const result = getThaiAscendant(
        date,
        time,
        parseFloat(lat),
        parseFloat(lon)
    )

    return NextResponse.json(result)
}

export function getThaiAscendant(
    date: string,
    time: string,
    lat: number,
    lon: number
) {
    // Temporarily return mock data for build compatibility
    // TODO: Re-enable swisseph functionality
    return {
        ascDegree: "0.00",
        sign: "เมษ",
        degree: "0.00",
    }
}
