import type { NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { POST as renderShareImage } from "../route"

export const runtime = "nodejs"

/**
 * Public by-id poster renders. `og` (1200×630) backs the share pages'
 * Open Graph cards so link shares unfurl into the reading image; `story`
 * backs Pinterest's `media` parameter. Loads the reading from whichever
 * table the id belongs to and delegates the painting to the sibling
 * POST renderer (sharing its warm caches).
 */
const STYLE_SIZES: Record<string, { width: number; height: number }> = {
    og: { width: 1200, height: 630 },
    story: { width: 1080, height: 1920 },
    post: { width: 1080, height: 1440 },
    square: { width: 1080, height: 1080 },
    landscape: { width: 1920, height: 1080 },
}

type StoredReading = {
    question: string | null
    cards: string[] | null
    interpretation: string | null
    insights?: string[] | null
}

/** Share links carry either a shared_tarot id or a tarot_readings id. */
async function loadReading(id: string): Promise<StoredReading | null> {
    const { data: shared } = await supabase
        .from("shared_tarot")
        .select("question, cards, interpretation, insights")
        .eq("id", id)
        .maybeSingle()
    if (shared) return shared as StoredReading

    const { data: reading } = await supabase
        .from("tarot_readings")
        .select("question, cards, interpretation")
        .eq("id", id)
        .maybeSingle()
    return (reading as StoredReading | null) ?? null
}

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
) {
    const { id } = await ctx.params
    if (!/^[\w-]{1,64}$/.test(id)) {
        return new Response("Invalid id", { status: 400 })
    }

    const style = req.nextUrl.searchParams.get("style") ?? "og"
    const size = STYLE_SIZES[style] ?? STYLE_SIZES.og

    const reading = await loadReading(id)
    if (!reading) return new Response("Not found", { status: 404 })

    const rendered = await renderShareImage(
        new Request(new URL("/api/share-image", req.nextUrl.origin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: reading.question ?? "",
                cards: Array.isArray(reading.cards) ? reading.cards : [],
                interpretation: reading.interpretation ?? "",
                insights: Array.isArray(reading.insights)
                    ? reading.insights
                    : [],
                ...size,
            }),
        }),
    )
    if (!rendered.ok) return rendered

    // Readings are immutable once shared — let scrapers and CDNs hold on.
    const headers = new Headers(rendered.headers)
    headers.set(
        "Cache-Control",
        "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    )
    return new Response(rendered.body, { status: 200, headers })
}
