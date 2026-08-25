import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveAstraSubject } from "@/lib/server/astra-subject"
import { calculateSwissEphChart } from "@/lib/astrology/swisseph"
import {
    ageInYears,
    birthDayStar,
    missingElement,
    rulingAgeStar,
} from "@/lib/astra/thai-astrology"
import { pickColdReadLines, seedHash, type ColdReadRow } from "@/lib/astra/cold-read"
import {
    typingMsForText,
    type AstraBubble,
    type AstraOpeningPayload,
    type AstraQuickReply,
    type AstraReadingBasis,
} from "@/lib/astra/opening-contract"
import { ASTRA_MESSAGES_NAMESPACE } from "@/lib/astra/identity"

/**
 * The turn she opens with.
 *
 * She speaks first, always. What she says depends only on what is already
 * known about the person: with no birth date on file she introduces herself
 * and asks for it; with one, she goes straight into the cold read computed
 * from their chart. The lines themselves are hand-written rows in
 * `cold_read_lines` — nothing here is improvised by a model.
 */

/** Fallback birthplace when the person never told us: Bangkok. */
const DEFAULT_LAT = 13.7563
const DEFAULT_LNG = 100.5018
const DEFAULT_TZ = 7

const requestSchema = z.object({
    locale: z.string().min(2).max(10).default("en"),
    /** Current thread, so a callback line only fires in a NEW one. */
    sessionId: z.string().max(64).nullable().optional(),
})

type ProfileRow = {
    birth_year: number | null
    birth_month: number | null
    birth_day: number | null
    birth_hour: number | null
    birth_minute: number | null
    birth_time_known: boolean | null
    birth_timezone: number | null
    birth_lat: number | null
    birth_lng: number | null
    last_topic: string | null
    last_session_id: string | null
}

function bubble(id: string, text: string): AstraBubble {
    return { id, text, typingMs: typingMsForText(text) }
}

/**
 * Bubble ids are deduped on the client so a double render cannot double-speak.
 * That makes fixed ids dangerous for a turn she may need to repeat — asking
 * for the birth date a second time would be swallowed — so each turn gets its
 * own nonce.
 */
function turnId(): string {
    return Date.now().toString(36)
}

/** Sidereal placements for the cold-read key. Never throws — the read degrades. */
async function computeChart(row: ProfileRow) {
    const timeKnown = Boolean(row.birth_time_known)
    try {
        const chart = await calculateSwissEphChart(
            {
                year: row.birth_year!,
                month: row.birth_month!,
                day: row.birth_day!,
                // An unknown birth time reads at midday: it keeps every planet
                // except the Moon in the sign it actually occupied that day.
                hour: timeKnown ? (row.birth_hour ?? 12) : 12,
                minute: timeKnown ? (row.birth_minute ?? 0) : 0,
                timezone: row.birth_timezone ?? DEFAULT_TZ,
                lat: row.birth_lat ?? DEFAULT_LAT,
                lng: row.birth_lng ?? DEFAULT_LNG,
            },
            "vedic_sidereal",
        )
        const signs = Object.entries(chart.planets)
            .filter(([name]) => name !== "Ascendant")
            .map(([, point]) => point.sign)
        return {
            // The ascendant moves a degree every four minutes, so it is only
            // honest to name ลัคนา when the birth time is known.
            lagnaSign: timeKnown ? chart.ascendant.sign : null,
            lagnaDegree: timeKnown ? chart.ascendant.degree : null,
            ayanamsa: chart.ayanamsa,
            missing: missingElement(signs),
        }
    } catch {
        return {
            lagnaSign: null,
            lagnaDegree: null,
            ayanamsa: null,
            missing: null,
        }
    }
}

async function loadColdReadRows(locale: string): Promise<ColdReadRow[]> {
    if (!supabaseAdmin) return []
    const select =
        "id, slot, lagna_sign, missing_element, age_star, text, weight"
    const { data } = await supabaseAdmin
        .from("cold_read_lines")
        .select(select)
        .eq("active", true)
        .eq("locale", locale)
    if (data && data.length > 0) return data as ColdReadRow[]

    // A locale with no library yet still gets a written line, not a generated one.
    const { data: fallback } = await supabaseAdmin
        .from("cold_read_lines")
        .select(select)
        .eq("active", true)
        .eq("locale", "en")
    return (fallback ?? []) as ColdReadRow[]
}

export async function POST(req: NextRequest) {
    const parsed = requestSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }
    const { locale, sessionId } = parsed.data

    const t = await getTranslations({
        locale,
        namespace: ASTRA_MESSAGES_NAMESPACE,
    })
    const fullName = t("fullName")

    const subject = await resolveAstraSubject(req)
    let profile: ProfileRow | null = null
    if (subject && supabaseAdmin) {
        const { data } = await supabaseAdmin
            .from("astra_user_profiles")
            .select(
                "birth_year, birth_month, birth_day, birth_hour, birth_minute, birth_time_known, birth_timezone, birth_lat, birth_lng, last_topic, last_session_id",
            )
            .eq("subject_type", subject.type)
            .eq("subject_id", subject.id)
            .maybeSingle()
        profile = data as ProfileRow | null
    }

    const bubbles: AstraBubble[] = []

    // A forecast that came due outranks everything else she might open with:
    // she said something would show by now, so she asks how it went.
    if (subject && supabaseAdmin) {
        const today = new Date().toISOString().slice(0, 10)
        const { data: due } = await supabaseAdmin
            .from("astra_predictions")
            .select("id, question, verdict, due_date")
            .eq("subject_type", subject.type)
            .eq("subject_id", subject.id)
            .is("outcome", null)
            .is("asked_result_at", null)
            .lte("due_date", today)
            .order("due_date", { ascending: true })
            .limit(1)

        const prediction = due?.[0]
        if (prediction) {
            await supabaseAdmin
                .from("astra_predictions")
                .update({ asked_result_at: new Date().toISOString() })
                .eq("id", prediction.id)

            const payload: AstraOpeningPayload = {
                stage: "follow_up",
                bubbles: [
                    bubble(
                        `astra-followup-${prediction.id}`,
                        t("followUp.ask", {
                            question: String(prediction.question).slice(0, 120),
                            verdict: String(prediction.verdict),
                        }),
                    ),
                ],
                quickReplies: [
                    { id: "hit", label: t("followUp.hit") },
                    { id: "miss", label: t("followUp.miss") },
                    { id: "unclear", label: t("followUp.unclear") },
                ],
                basis: null,
                followUpPredictionId: String(prediction.id),
            }
            return NextResponse.json(payload)
        }
    }

    // A new thread opens by picking up the last one — she does not make people
    // re-tell a story she already heard.
    const isNewThread = Boolean(
        profile?.last_topic && profile.last_session_id !== sessionId,
    )
    if (isNewThread) {
        bubbles.push(
            bubble(
                "astra-callback",
                t("opening.returning", { topic: profile!.last_topic! }),
            ),
        )
    }

    const hasBirth =
        profile?.birth_year != null &&
        profile?.birth_month != null &&
        profile?.birth_day != null

    if (!hasBirth) {
        const turn = turnId()
        if (!isNewThread) {
            bubbles.push(
                bubble(`astra-hello-${turn}`, t("opening.greeting", { fullName })),
            )
            bubbles.push(
                bubble(`astra-hello-2-${turn}`, t("opening.greetingSecond")),
            )
        }
        bubbles.push(bubble(`astra-ask-birth-${turn}`, t("opening.askBirth")))
        const payload: AstraOpeningPayload = {
            stage: "ask_birth",
            bubbles,
            quickReplies: [],
            basis: null,
            followUpPredictionId: null,
        }
        return NextResponse.json(payload)
    }

    const row = profile!
    const birth = {
        year: row.birth_year!,
        month: row.birth_month!,
        day: row.birth_day!,
    }
    const chart = await computeChart(row)
    const dayStar = birthDayStar(birth, {
        hour: row.birth_time_known ? row.birth_hour : null,
    })
    const now = new Date()
    const age = ageInYears(birth, now)
    const ruling = rulingAgeStar(dayStar, age)

    // Same person, same day, same reading — asking twice is not a re-roll.
    const todayIso = now.toISOString().slice(0, 10)
    const seed = `${subject?.type ?? "anon"}:${subject?.id ?? "anon"}|${todayIso}`
    const rows = await loadColdReadRows(locale)
    const lines = pickColdReadLines(
        rows,
        {
            lagnaSign: chart.lagnaSign,
            missingElement: chart.missing,
            ageStar: ruling.star,
        },
        seed,
    )

    if (lines.length === 0) {
        // The library is empty or nothing matched this chart. She still
        // speaks — silence with three topic chips under it is the one thing
        // this whole turn exists to prevent.
        console.warn("[astra] no cold-read lines matched", {
            locale,
            rows: rows.length,
            key: {
                lagnaSign: chart.lagnaSign,
                missingElement: chart.missing,
                ageStar: ruling.star,
            },
        })
        const turn = Date.now().toString(36)
        bubbles.push(
            bubble(`astra-cold-fallback-${turn}`, t("opening.coldReadFallback")),
        )
    }

    for (const line of lines) {
        bubbles.push(bubble(`astra-cold-${line.slot}-${line.id}`, line.text))
    }

    const quickReplies: AstraQuickReply[] = [
        { id: "work", label: t("opening.topicWork"), topic: "career" },
        { id: "people", label: t("opening.topicPeople"), topic: "love" },
        { id: "both", label: t("opening.topicBoth"), topic: "general" },
    ]

    const basis: AstraReadingBasis = {
        answerId: seedHash(seed, lines.map((l) => l.id).join(",")).toString(16),
        seed,
        computedAtIso: now.toISOString(),
        birthTimeKnown: Boolean(row.birth_time_known),
        dayStar,
        ageStar: ruling.star,
        ageFrom: ruling.fromAge,
        ageTo: ruling.toAge,
        age,
        missingElement: chart.missing,
        lagnaSign: chart.lagnaSign,
        lagnaDegree: chart.lagnaDegree,
        ayanamsa: chart.ayanamsa,
        system: "vedic_sidereal",
    }

    const payload: AstraOpeningPayload = {
        stage: "cold_read",
        bubbles,
        quickReplies,
        basis,
        followUpPredictionId: null,
    }
    return NextResponse.json(payload)
}
