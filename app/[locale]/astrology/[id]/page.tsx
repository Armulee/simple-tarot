import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import AstrologyDisplay from "@/components/astrology/display"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>
}): Promise<Metadata> {
    const { id } = await params
    return {
        title: `Astrology - ${id}`,
        description: "Your astrology reading (birth + transit).",
        openGraph: {
            title: `Astrology - ${id}`,
            description: "Your astrology reading (birth + transit).",
            type: "website",
        },
        twitter: {
            card: "summary_large_image",
            title: `Astrology - ${id}`,
            description: "Your astrology reading (birth + transit).",
        },
    }
}

export default async function AstrologyPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    if (!supabaseAdmin) return notFound()

    const { data, error } = await supabaseAdmin
        .from("astrology_readings")
        .select("*")
        .eq("id", id)
        .maybeSingle()

    if (error || !data) {
        console.error("Error fetching astrology reading:", error)
        return notFound()
    }

    const parsed = {
        ...data,
        birth_houses:
            typeof data.birth_houses === "string"
                ? JSON.parse(data.birth_houses)
                : data.birth_houses,
        birth_planets:
            typeof data.birth_planets === "string"
                ? JSON.parse(data.birth_planets)
                : data.birth_planets,
        transit_houses:
            typeof data.transit_houses === "string"
                ? JSON.parse(data.transit_houses)
                : data.transit_houses,
        transit_planets:
            typeof data.transit_planets === "string"
                ? JSON.parse(data.transit_planets)
                : data.transit_planets,
    }

    return <AstrologyDisplay reading={parsed} />
}
