import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateObject, generateText } from "ai"
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
import { textToBubbles, tidyBubbles } from "@/lib/astra/bubbles"
import {
    typingMsForText,
    type AstraBubble,
} from "@/lib/astra/opening-contract"
import {
    ASTRA_REGISTERS,
    type AstraReadingResponse,
    type AstraReadingSource,
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

/**
 * Deliberately loose. Length limits on generated prose belong in the prompt,
 * not in the schema: a schema that rejects a 241-character bubble throws the
 * whole reading away over a sentence, and no other route here does that.
 * Shaping happens in `tidyBubbles` after the model has spoken.
 */
const replySchema = z.object({
    bubbles: z
        .array(z.string())
        .describe(
            "What she says, split into short bubbles of 1-3 lines each, in order. Two to four of them.",
        ),
    verdict: z
        .string()
        .describe(
            "The direction she committed to, in one plain line. Internal record, not shown.",
        ),
    register: z
        .enum(ASTRA_REGISTERS)
        .describe(
            "How far you went: READ if you committed, PROBE if you guessed the shape and asked for more, TALK if they were not asking about their life.",
        ),
    dueInDays: z
        .number()
        .nullable()
        .describe(
            "Whole days until the outcome should be visible. Null unless you were in READ and committed to something that can actually be checked later — a probe, a chat, or an answer with no forecast in it is always null.",
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

/**
 * How far she is entitled to go on what she was actually told.
 *
 * The craft tasks below describe how to read a chart. This describes when to.
 * Without it every message got a verdict and a date, including "I have a plan,
 * would it work?" — which names no plan — and "don't you wanna know my plan?",
 * which is not a question about their life at all. Committing there is not
 * fortune telling, it is guessing with a straight face, and a date written
 * down under every line of small talk reads as nagging rather than care.
 */
const REGISTER_RULES = `CHOOSE HOW FAR TO GO. Report your choice in the "register" field.

READ — they told you enough that the computed values actually bear on what they asked. Only here do you commit to a direction, and only here may you give a timeframe.

PROBE — they named a subject but withheld the substance of it: "I have a plan", "there is this thing", "something happened", "would it work?" with no it. You were not told what to read, so do NOT pronounce on it. Instead do what a reader does across a table: work out what the chart can already tell you about the SHAPE of it — which area of life, which direction the pull runs — offer that as a guess with the placement behind it named in one short clause, invite them to correct you, and ask for the part they left out. No verdict. No date. End on the question.
    A plan has not happened yet, so it belongs to where the slow planets are heading. That is enough to guess the AREA it is about. It is never enough to guess whether it works.
    Shape to aim for: "I can guess from where your stars sit — this is about reaching people, not about money. Jupiter is moving into the house that widens a circle. Correct me if I am wrong. What is the plan?"

TALK — they are speaking to you rather than asking about their life: teasing you, testing you, reacting to what you just said, asking whether you want to know something. Answer as a person answers. One or two short bubbles, warm, unhurried. Ignore the computed block entirely — no placements, no verdict, no date. "Sure. Go on, tell me." is a complete answer.

A verdict you were not given the material for is worth less than no verdict — it is the thing that makes a reader sound fake. When you were not told enough, PROBE. When they were not asking, TALK.`

const INTENT_TASKS: Record<AstraIntent, string> = {
    IDENTITY: `They asked who they are. Read the birth chart you were handed: say what kind of person it makes them, plainly, in a way they would recognise on themselves. Name at most one placement as the reason. End by asking them something back.`,
    TIMING: `They asked when. You were handed the next real contact between a slow planet and their significator, with the window it covers. Give the window in plain dates, say what it will feel like when it arrives, and say plainly if nothing is coming inside the search window rather than inventing a date. Ask them something back.`,
    OUTCOME: `They asked how something turns out. You were handed the chart of the moment they asked. IN READ your answer must contain all three of these, in this order: (1) which way it goes, committed, in the first bubble; (2) the timeframe in which it shows; (3) one concrete signal for them to watch for, so they can tell whether it is happening. Name the reason from the craft in one short clause only. In PROBE none of that applies — guess the shape and ask.`,
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

/**
 * These override the craft's own task above them, and say so: the OUTCOME task
 * demands a committed verdict in the first bubble, and on these subjects that
 * demand is exactly what must not be met. Stated as a plain instruction it
 * loses to the MUST above it — a real reading came back deciding a loan.
 */
/**
 * On a flagged subject the craft task is replaced, not argued with.
 *
 * `INTENT_TASKS.OUTCOME` demands a committed verdict and closes on a signal to
 * watch for. Leaving it in and appending "but do not decide" produced readings
 * that decided anyway, or that dropped the referral to make room for the
 * signal. So a flagged question gets its own shape from the start.
 */
const GUARDRAILED_TASK = `They asked about something you must not decide for them. You were still handed real computed values: read them for timing and for what this person is carrying, and nothing else. Your answer has exactly this shape, in this order: (1) say in the first bubble that this one is not yours to call; (2) one or two bubbles on timing and on what they are carrying, naming the reason from the craft in one short clause; (3) the LAST bubble sends them to the right professional. Do not name a verdict, an outcome, or a decision anywhere. Do not close on a signal to watch for — the referral is the close.`

const GUARDRAIL_TASK: Record<string, string> = {
    money: "OVERRIDE — this touches money they could lose. Whatever the task above asked for, do NOT decide this for them: no verdict on whether to borrow, invest, sign, or buy, and do not say a direction is right or wrong for them. Speak only about timing and about how they are carrying it. Say plainly that this one is not yours to call. Your LAST bubble must send them to someone qualified with the numbers — a financial adviser, an accountant, the bank. Ending without that line is a failed answer.",
    health: "OVERRIDE — this touches health. Whatever the task above asked for, do NOT decide this for them: no verdict on diagnosis, treatment, or whether anyone recovers. Speak only about timing and about what they are carrying. Say plainly that this one is not yours to call. Your LAST bubble must tell them to see a doctor about it. Ending without that line is a failed answer.",
    legal: "OVERRIDE — this touches a legal matter. Whatever the task above asked for, do NOT decide this for them: no verdict on how a case ends or what to do legally. Speak only about timing and pressure. Say plainly that this one is not yours to call. Your LAST bubble must tell them to talk to a lawyer. Ending without that line is a failed answer.",
    pregnancy: "OVERRIDE — this touches pregnancy or fertility. Whatever the task above asked for, do NOT decide this for them: never say whether it happens. Speak gently, about timing and feeling only. Say plainly that this one is not yours to call. Your LAST bubble must point them to a doctor. Ending without that line is a failed answer.",
    life: "OVERRIDE — this person may be in danger. Drop the reading entirely; ignore everything the task above asked for. Speak to them as a person, say plainly that this is beyond what the stars are for, and and your LAST bubble must tell them to reach someone who can help them today — a person they trust, or an emergency line where they are. Ending without that line is a failed answer.",
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
            quickReplies: [
                { id: "work", label: t("opening.topicWork"), topic: "career" },
                { id: "people", label: t("opening.topicPeople"), topic: "love" },
                { id: "money", label: t("opening.topicMoney"), topic: "money" },
            ],
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
            REGISTER_RULES,
            guardrail ? GUARDRAILED_TASK : INTENT_TASKS[intent],
            GLOSSARY,
            "Return 2-4 bubbles. Each bubble is one or two short sentences — never a paragraph.",
            // Last, so it is the most recent thing read, and marked as
            // outranking the craft task rather than sitting beside it.
            guardrail ? GUARDRAIL_TASK[guardrail] : null,
        ]
            .filter(Boolean)
            .join("\n\n"),
        calculation: describeValues(intent, values as Record<string, unknown>),
        language,
    })

    const prompt = [
        context ? `You had just said:\n${context}` : null,
        `Their question:\n${question}`,
        "Answer it now, from the computed values only.",
    ]
        .filter(Boolean)
        .join("\n\n")

    let reply: z.infer<typeof replySchema>
    try {
        const result = await generateObject({
            model: MODEL,
            schema: replySchema,
            system,
            prompt,
            temperature: 0.5,
            // Reasoning off: a thinker in front of structured output is the
            // difference between four seconds and forty.
            providerOptions: deepseekThinking(false),
        })
        reply = result.object
    } catch (structuredError) {
        console.error("[astra] structured reading failed", {
            intent,
            topic,
            message:
                structuredError instanceof Error
                    ? structuredError.message
                    : String(structuredError),
            // NoObjectGeneratedError carries what the model actually said.
            text: (structuredError as { text?: string })?.text,
            cause: String((structuredError as { cause?: unknown })?.cause ?? ""),
        })

        // Losing the JSON envelope is not a reason to lose the reading: ask
        // again in plain text and cut it into bubbles ourselves.
        try {
            const spoken = await generateText({
                model: MODEL,
                system,
                prompt: `${prompt}\n\nWrite it as two to four short paragraphs separated by blank lines. Plain text only — no JSON, no bullet points, no headings.`,
                temperature: 0.5,
                providerOptions: deepseekThinking(false),
            })
            const bubbles = textToBubbles(spoken.text ?? "")
            if (bubbles.length === 0) throw new Error("EMPTY_REPLY")
            reply = {
                bubbles,
                verdict: bubbles[0],
                register: "PROBE",
                dueInDays: null,
            }
        } catch (plainError) {
            const reason =
                plainError instanceof Error
                    ? plainError.message
                    : String(plainError)
            console.error("[astra] plain-text reading failed too", { reason })
            // The reason rides along so a failure is diagnosable from the
            // network tab instead of only from the platform logs.
            return NextResponse.json(
                { error: "READING_FAILED", reason },
                { status: 502 },
            )
        }
    }

    const spokenBubbles = tidyBubbles(reply.bubbles)
    if (spokenBubbles.length === 0) {
        return NextResponse.json(
            { error: "READING_FAILED", reason: "EMPTY_BUBBLES" },
            { status: 502 },
        )
    }

    // She was talking, not reading. No chart behind it, so no proof link, and
    // nothing to write down.
    if (reply.register === "TALK") {
        return NextResponse.json({
            kind: "talk",
            bubbles: toBubbles(spokenBubbles, answerId),
        } satisfies AstraReadingResponse)
    }

    // Forecasts are written down with the day she will come back and ask —
    // but only the ones she actually made. Three things have to hold: she
    // committed (READ), the craft is one that forecasts, and the subject is
    // not one she is required to stay out of. A date under every message
    // reads as nagging, not as care.
    const tracksOutcome =
        reply.register === "READ" &&
        (intent === "OUTCOME" || intent === "TIMING") &&
        !guardrail

    const timingWindow =
        intent === "TIMING"
            ? (values as { window: { endIso: string } | null }).window
            : null
    const dueFromWindow = timingWindow ? timingWindow.endIso.slice(0, 10) : null
    // A null `dueInDays` is the model saying there is no forecast here. It
    // used to be replaced with a fortnight, which is how small talk ended up
    // with a follow-up date attached.
    const hasForecast = dueFromWindow != null || reply.dueInDays != null

    const source: AstraReadingSource = {
        intent,
        register: reply.register,
        replayable: tracksOutcome && hasForecast,
        topic,
        answerId,
        seed,
        computedAtIso: now.toISOString(),
        label: t(`reading.sourceLabel.${intent}`),
        values: values as unknown as Record<string, unknown>,
    }

    let dueDateIso: string | null = null
    if (tracksOutcome && hasForecast) {
        const days = Math.min(
            180,
            Math.max(1, Math.round(reply.dueInDays ?? 14)),
        )
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
                bubbles: spokenBubbles,
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
        bubbles: toBubbles(spokenBubbles, answerId),
        source,
        guardrail,
        prediction: dueDateIso ? { dueDateIso } : null,
    } satisfies AstraReadingResponse)
}
