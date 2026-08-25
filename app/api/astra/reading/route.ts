import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { getTranslations } from "next-intl/server"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveAstraSubject } from "@/lib/server/astra-subject"
import { resolveResponseLanguage } from "@/lib/i18n/ai-language"
import { deepseekThinking } from "@/lib/chat/model-options"
import { buildAstraSystemPrompt } from "@/lib/prompts/astra"
import { ASTRA_MESSAGES_NAMESPACE } from "@/lib/astra/identity"
import {
    ASTRA_TOPICS,
    classifyQuestion,
    type AstraIntent,
    type AstraTopic,
} from "@/lib/astra/intent"
import { seedHash } from "@/lib/astra/cold-read"
import {
    typingMsForText,
    type AstraBubble,
} from "@/lib/astra/opening-contract"
import type {
    AstraReadingResponse,
    AstraReadingSource,
} from "@/lib/astra/reading-contract"
import {
    readAuspicious,
    readIdentity,
    readPrasna,
    readTiming,
    type BirthInput,
} from "@/lib/astra/readings"

/**
 * One question in, one routed reading out.
 *
 * The question decides the craft (see `lib/astra/intent.ts`), the craft
 * computes real values (see `lib/astra/readings.ts`), and only then does a
 * model put those values into her voice. The model is never the source of a
 * claim — it is the reader of one.
 *
 * Asking the same thing twice in a day is not a re-roll: the answer is stored
 * under a seed of (person + question + date) and replayed verbatim.
 */

// This route blocks on an ephemeris pass plus a model call; the platform
// default function timeout is shorter than that on a cold start.
export const maxDuration = 60

const MODEL = "deepseek/deepseek-v4-pro"

const requestSchema = z.object({
    question: z.string().trim().min(1).max(2000),
    sessionId: z.string().max(64).nullable().optional(),
    locale: z.string().min(2).max(10).default("en"),
    /** Viewer's UTC offset in hours, so the watch and the date are theirs. */
    timezone: z.number().min(-12).max(14).optional(),
    /**
     * The life area a tapped chip already stands for. A one-word answer to her
     * own question carries no grammar to classify, so the chip says what it is.
     */
    topicHint: z.enum(ASTRA_TOPICS).optional(),
    /** What she had just said, so a reply of "Work" is read as the answer it is. */
    context: z.string().max(600).optional(),
})

const replySchema = z.object({
    bubbles: z
        .array(z.string().min(1).max(240))
        .min(2)
        .max(4)
        .describe(
            "What she says, split into short bubbles of 1-3 lines each, in order.",
        ),
    verdict: z
        .string()
        .min(2)
        .max(160)
        .describe(
            "The direction she committed to, in one plain line. Internal record, not shown.",
        ),
    dueInDays: z
        .number()
        .int()
        .min(1)
        .max(180)
        .nullable()
        .describe(
            "How many days until the outcome should be visible, or null when the answer is not a forecast.",
        ),
})

const STAR_NAMES_TH: Record<string, string> = {
    sun: "อาทิตย์",
    moon: "จันทร์",
    mars: "อังคาร",
    mercury: "พุธ",
    saturn: "เสาร์",
    jupiter: "พฤหัสบดี",
    rahu: "ราหู",
    venus: "ศุกร์",
}

const RUEK_NAMES_TH: Record<string, string> = {
    thalitho: "ทลิทโท",
    mahattano: "มหัทธโน",
    choro: "โจโร",
    phumipalo: "ภูมิปาโล",
    thesatri: "เทศาตรี",
    thewi: "เทวี",
    phetchakhat: "เพชฌฆาต",
    racha: "ราชา",
    samano: "สมโณ",
}

const GLOSSARY = `NAMES (use the Thai name when writing Thai): ${Object.entries(
    STAR_NAMES_TH,
)
    .map(([key, thai]) => `${key}=${thai}`)
    .join(", ")}. ฤกษ์: ${Object.entries(RUEK_NAMES_TH)
    .map(([key, thai]) => `${key}=${thai}`)
    .join(", ")}.`

const INTENT_TASKS: Record<AstraIntent, string> = {
    IDENTITY: `They asked who they are. Read the birth chart you were handed: say what kind of person it makes them, plainly, in a way they would recognise on themselves. Name at most one placement as the reason. End by asking them something back.`,
    TIMING: `They asked when. You were handed the next real contact between a slow planet and their significator, with the window it covers. Give the window in plain dates, say what it will feel like when it arrives, and say plainly if nothing is coming inside the search window rather than inventing a date. Ask them something back.`,
    OUTCOME: `They asked how something turns out. You were handed the chart of the moment they asked. Your answer MUST contain all three of these, in this order: (1) which way it goes, committed, in the first bubble; (2) the timeframe in which it shows; (3) one concrete signal for them to watch for, so they can tell whether it is happening. Name the reason from the craft in one short clause only.`,
    AUSPICIOUS_DATE: `They asked which day to act. You were handed the days the almanac favours for this purpose and the weekday to avoid. Give them the best day first with its date, one alternative, and the day to keep away from. Say what each is good for in plain words, not in almanac jargon.`,
}

function formatDate(iso: string): string {
    return iso.slice(0, 10)
}

/** The computed block the answer must be built from. Numbers only, no prose. */
function describeValues(
    intent: AstraIntent,
    values: Record<string, unknown>,
): string {
    const v = values as Record<string, never>
    switch (intent) {
        case "IDENTITY":
            return [
                `ลัคนา (ascendant): ${v.lagnaSign ?? "UNKNOWN — birth time not given, do not name an ascendant"}${
                    v.lagnaDegree != null ? ` ${v.lagnaDegree}°` : ""
                }`,
                `Sun in ${v.sunSign}, Moon in ${v.moonSign} (sidereal, Lahiri)`,
                `ดาวประจำวันเกิด (day star): ${v.dayStar}`,
                `ดาวเสวยอายุ (star consuming their age now): ${v.ageStar}, from age ${v.ageFrom} to ${v.ageTo}; they are ${v.age}`,
                `ธาตุที่พร่อง (thinnest element in the chart): ${v.missingElement ?? "none — evenly spread"}`,
            ].join("\n")
        case "OUTCOME":
            return [
                `asked at: ${v.askedAtIso}`,
                `ยาม (watch of the question): ${(v.watch as unknown as { isNight: boolean }).isNight ? "night" : "day"} watch ${(v.watch as unknown as { index: number }).index} of 8, ruled by ${(v.watch as unknown as { star: string }).star}`,
                `ลัคนาเวลาถาม (ascendant at the question): ${v.lagnaSign} ${v.lagnaDegree}°`,
                `the question falls in house ${v.house}, sign ${v.houseSign}`,
                `เจ้าเรือน (lord of that house): ${v.houseLord}, now in ${v.lordSign}, house ${v.lordHouse}${
                    v.lordRetrograde ? ", RETROGRADE (พักร์)" : ""
                }`,
                `closest contacts to that lord: ${
                    (v.contacts as unknown as {
                        planet: string
                        aspect: string
                        orb: number
                    }[]).length === 0
                        ? "none within 3°"
                        : (v.contacts as unknown as {
                              planet: string
                              aspect: string
                              orb: number
                          }[])
                              .map(
                                  (c) =>
                                      `${c.planet} ${c.aspect} (orb ${c.orb}°)`,
                              )
                              .join("; ")
                }`,
            ].join("\n")
        case "TIMING": {
            const window = v.window as unknown as {
                startIso: string
                peakIso: string
                endIso: string
                transitPlanet: string
                aspect: string
            } | null
            return [
                `significator for this subject: natal ${v.significator} in ${v.natalSign}`,
                window
                    ? `next contact: transiting ${window.transitPlanet} ${window.aspect} natal ${v.significator}; window ${formatDate(
                          window.startIso,
                      )} → ${formatDate(window.endIso)}, closest ${formatDate(window.peakIso)}`
                    : `NO contact within the next ${v.searchedDays} days — say plainly that no turn is visible that far out`,
            ].join("\n")
        }
        case "AUSPICIOUS_DATE": {
            const days = v.days as unknown as {
                dateIso: string
                ruek: string
                weekdayStar: string
                isKalakiniDay: boolean
            }[]
            return [
                `purpose: ${v.purpose}`,
                `กาลกิณี star for this person: ${v.kalakini} — keep away from its weekday`,
                days.length === 0
                    ? `NO favourable day found in the next ${v.searchedDays} days — say so plainly`
                    : `favourable days: ${days
                          .map(
                              (day) =>
                                  `${day.dateIso} (ฤกษ์ ${day.ruek}, weekday star ${day.weekdayStar})`,
                          )
                          .join("; ")}`,
            ].join("\n")
        }
    }
}

const GUARDRAIL_TASK: Record<string, string> = {
    money: "This touches money they could lose. Speak about timing and about how they are carrying it, never about whether to borrow, invest, or sign — and tell them to take the numbers to someone qualified.",
    health: "This touches health. You may speak about timing and about what they are carrying, never about diagnosis, treatment, or whether they recover — and tell them to see a doctor.",
    legal: "This touches a legal matter. Speak about timing and pressure only, never about the outcome of a case or what to do legally — and tell them to talk to a lawyer.",
    pregnancy: "This touches pregnancy or fertility. Speak gently about timing and feeling only, never about whether it happens — and point them to a doctor.",
    life: "This person may be in danger. Drop the reading. Speak to them as a person, say plainly that this is beyond what the stars are for, and tell them to reach someone who can help them today — a person they trust, or an emergency line where they are.",
}

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
}

function toBirthInput(row: ProfileRow): BirthInput | null {
    if (row.birth_year == null || row.birth_month == null || row.birth_day == null) {
        return null
    }
    return {
        year: row.birth_year,
        month: row.birth_month,
        day: row.birth_day,
        hour: row.birth_hour,
        minute: row.birth_minute,
        timeKnown: Boolean(row.birth_time_known),
        timezone: row.birth_timezone,
        lat: row.birth_lat,
        lng: row.birth_lng,
    }
}

/** Same wording, same day, same answer — punctuation and case do not matter. */
function normalizeQuestion(question: string): string {
    return question
        .toLowerCase()
        .replace(/[\s ]+/g, " ")
        .replace(/[.,!?;:"'“”‘’()[\]]/g, "")
        .trim()
}

function toBubbles(texts: string[], answerId: string): AstraBubble[] {
    return texts.map((text, index) => ({
        id: `astra-${answerId}-${index}`,
        text,
        typingMs: typingMsForText(text),
    }))
}

export async function POST(req: NextRequest) {
    const parsed = requestSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }
    const { question, sessionId, locale, timezone, topicHint, context } =
        parsed.data

    const classified = classifyQuestion(question)
    if (classified.kind === "tarot" || classified.kind === "passthrough") {
        return NextResponse.json({ kind: "tarot" } satisfies AstraReadingResponse)
    }

    // A tapped chip answers the question she just asked: it is never unclear,
    // and its own topic beats whatever a single word looks like to a regex.
    const routed =
        classified.kind === "unsure"
            ? topicHint
                ? {
                      kind: "reading" as const,
                      intent: "OUTCOME" as AstraIntent,
                      topic: topicHint as AstraTopic,
                      guardrail: null,
                  }
                : classified
            : {
                  ...classified,
                  topic: topicHint ?? classified.topic,
              }

    const t = await getTranslations({
        locale,
        namespace: ASTRA_MESSAGES_NAMESPACE,
    })

    if (routed.kind === "unsure") {
        const text = t("reading.askBack")
        return NextResponse.json({
            kind: "unsure",
            bubbles: toBubbles([text], "ask-back"),
        } satisfies AstraReadingResponse)
    }

    const subject = await resolveAstraSubject(req)
    if (!subject || !supabaseAdmin) {
        return NextResponse.json({ kind: "needs_birth" } satisfies AstraReadingResponse)
    }

    const { data: profileRow } = await supabaseAdmin
        .from("astra_user_profiles")
        .select(
            "birth_year, birth_month, birth_day, birth_hour, birth_minute, birth_time_known, birth_timezone, birth_lat, birth_lng",
        )
        .eq("subject_type", subject.type)
        .eq("subject_id", subject.id)
        .maybeSingle()

    const birth = profileRow ? toBirthInput(profileRow as ProfileRow) : null
    if (!birth) {
        return NextResponse.json({ kind: "needs_birth" } satisfies AstraReadingResponse)
    }

    const now = new Date()
    const tz = timezone ?? birth.timezone ?? 7
    const localDate = new Date(now.getTime() + tz * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
    const seed = `${subject.type}:${subject.id}|${normalizeQuestion(question)}|${localDate}`
    const answerId = seedHash(seed).toString(16)

    // Anti-reroll: the same question on the same day gets the same answer back.
    const { data: stored } = await supabaseAdmin
        .from("astra_predictions")
        .select("bubbles, basis, intent, topic, guardrail, due_date, answer_id")
        .eq("subject_type", subject.type)
        .eq("subject_id", subject.id)
        .eq("seed", seed)
        .maybeSingle()

    if (stored && Array.isArray(stored.bubbles) && stored.bubbles.length > 0) {
        const source = stored.basis as unknown as AstraReadingSource
        return NextResponse.json({
            kind: "reading",
            bubbles: toBubbles(stored.bubbles as string[], stored.answer_id),
            source,
            guardrail: routed.guardrail,
            prediction: stored.due_date
                ? { dueDateIso: String(stored.due_date) }
                : null,
        } satisfies AstraReadingResponse)
    }

    const { intent, topic, guardrail } = routed
    const values =
        intent === "IDENTITY"
            ? await readIdentity(birth, now)
            : intent === "OUTCOME"
              ? await readPrasna(
                    topic,
                    now,
                    tz,
                    birth.lat ?? undefined,
                    birth.lng ?? undefined,
                )
              : intent === "TIMING"
                ? await readTiming(birth, topic, now)
                : await readAuspicious(birth, topic, now)

    const language = resolveResponseLanguage(locale, question)
    const system = buildAstraSystemPrompt({
        task: [
            INTENT_TASKS[intent],
            guardrail ? GUARDRAIL_TASK[guardrail] : null,
            GLOSSARY,
            "Return 2-4 bubbles. Each bubble is one or two short sentences — never a paragraph.",
        ]
            .filter(Boolean)
            .join("\n\n"),
        calculation: describeValues(intent, values as Record<string, unknown>),
        language,
    })

    let reply: z.infer<typeof replySchema>
    try {
        const result = await generateObject({
            model: MODEL,
            schema: replySchema,
            system,
            prompt: [
                context ? `You had just said:\n${context}` : null,
                `Their question:\n${question}`,
                "Answer it now, from the computed values only.",
            ]
                .filter(Boolean)
                .join("\n\n"),
            temperature: 0.5,
            // Reasoning off: a thinker in front of structured output is the
            // difference between four seconds and forty.
            providerOptions: deepseekThinking(false),
        })
        reply = result.object
    } catch (error) {
        console.error("[astra] reading generation failed", {
            intent,
            topic,
            error: error instanceof Error ? error.message : String(error),
        })
        return NextResponse.json({ error: "READING_FAILED" }, { status: 502 })
    }

    const source: AstraReadingSource = {
        intent,
        topic,
        answerId,
        seed,
        computedAtIso: now.toISOString(),
        label: t(`reading.sourceLabel.${intent}`),
        values: values as unknown as Record<string, unknown>,
    }

    // Forecasts are written down with the day she will come back and ask.
    const tracksOutcome = intent === "OUTCOME" || intent === "TIMING"
    let dueDateIso: string | null = null
    if (tracksOutcome) {
        const timingWindow =
            intent === "TIMING"
                ? (values as { window: { endIso: string } | null }).window
                : null
        const dueFromWindow = timingWindow
            ? timingWindow.endIso.slice(0, 10)
            : null
        const days = reply.dueInDays ?? 14
        dueDateIso =
            dueFromWindow ??
            new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)

        const { error: insertError } = await supabaseAdmin
            .from("astra_predictions")
            .insert({
                subject_type: subject.type,
                subject_id: subject.id,
                session_id: sessionId ?? null,
                seed,
                answer_id: answerId,
                intent,
                topic,
                guardrail,
                question,
                verdict: reply.verdict,
                bubbles: reply.bubbles,
                basis: source,
                due_date: dueDateIso,
            })
        if (insertError) {
            // The reading still goes out; only the written record was lost.
            console.error("[astra] prediction insert failed", insertError.message)
        }
    }

    return NextResponse.json({
        kind: "reading",
        bubbles: toBubbles(reply.bubbles, answerId),
        source,
        guardrail,
        prediction: dueDateIso ? { dueDateIso } : null,
    } satisfies AstraReadingResponse)
}
