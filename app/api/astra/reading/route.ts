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
import { readingStrength, STRENGTH_NOTE } from "@/lib/astra/confidence"
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

/**
 * Her voice is as much the model as the prompt, so it is switchable without a
 * deploy — set ASTRA_MODEL to any id the gateway serves to try another one.
 */
const MODEL = process.env.ASTRA_MODEL || "deepseek/deepseek-v4-pro"

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
    /**
     * The thread so far, oldest first, so a follow-up is answered as one.
     * A single trailing bubble was not enough: she re-asked what they had
     * already told her and contradicted what she had already said.
     */
    transcript: z
        .array(
            z.object({
                role: z.enum(["astra", "them"]),
                text: z.string().max(4000),
            }),
        )
        .max(24)
        .optional(),
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
/**
 * How she sounds, and how much of it there is.
 *
 * Four bubbles of placements on every turn is what made her read like a
 * machine reciting a chart: the answer to what was asked arrived third, every
 * reply named a planet whether or not it earned one, and a follow-up repeated
 * the whole apparatus instead of just answering.
 */
const VOICE = `HOW TO SPEAK.

Answer the question that was actually asked, in the first bubble, in plain words. Everything else is optional.

One to three bubbles. One is often the right number, especially for a follow-up. Each bubble is one or two short sentences. If you can say it in six words, say it in six words.

Give a reason only when it adds something, and never the same reason twice in a thread — if you explained it a turn ago, they heard you. A follow-up usually needs no reason at all, just the answer.

Talk the way a reader talks across a table: direct, warm, a little dry. Not a report. No headings, no lists, no "furthermore". Do not restate their question back to them before answering it.`

/**
 * The single biggest source of lost credibility, removed.
 *
 * The values she is handed for an OUTCOME are read from the chart of the
 * MOMENT ASKED — ยามถาม. She was calling them "your career house" and "your
 * Jupiter", which means the birth chart. A person who looks their own chart up
 * finds a different house and concludes she made it up. Measured on one real
 * chart: natal Jupiter house 9, prasna Jupiter house 4, both correct, five
 * houses apart. Nothing is miscalculated — only the words are wrong.
 *
 * Naming placements was pure downside anyway. The people this product is for
 * did not come for a chart lesson, and the ones who did come for one are
 * exactly the ones who will check.
 */
const NO_PLACEMENTS = `NEVER NAME A PLACEMENT.

Do not say where any planet sits, what house anything falls in, what aspect anything makes, or any degree. Not "Mars in the twelfth". Not "the lord of your career house". Not "the Moon in Pisces, house nine".

Two reasons, and the second one matters more. They did not come for a chart lesson. And the numbers you were handed are read from the sky AT THE MOMENT THEY ASKED, not from their birth chart — so anyone who looks up their own chart will find a different house and decide you invented it. You did not. You will have lost them anyway.

The computed values still decide everything you say. They set the answer. They do not appear in it. Say what the placement MEANS, in words anyone knows: "this is being carried quietly", "the pressure is coming from outside you", "it is slower than you want it to be", "there is nothing pushing this along right now".

If they ask how you know, say the numbers are under the link below your answer, and that they are read from the sky at the moment they asked — not from their birth chart.

One exception: you may name the quality of a DAY from the almanac (a royal day, a day to keep clear of). That labels a day, not their chart, and nobody can look it up and disagree.`

/**
 * What killed the human feeling was not the wording, it was the skeleton.
 *
 * `INTENT_TASKS.OUTCOME` demanded verdict → timeframe → signal, in that order,
 * every single time. People read shape faster than they read words, so by the
 * third answer the form is visible and she reads like a machine filling in a
 * form. A reader across a table does not hand you the same three beats twice.
 */
const SHAPES = `PICK A SHAPE. Do not use the same shape you used in your last answer.

FLAT — one line, nothing after it. "Don't do it." "Yes, but not this month." "It holds." Use this far more often than feels comfortable; it is the most human thing you can do.

ANSWER AND A MOVE — the answer, then the one thing to do about it.

ANSWER AND A SIGN — the answer, then one thing to watch for that will tell them it has started.

THE WARNING FIRST — not the thing they asked, but the thing they need to hear before it.

HANDED BACK — answer in a line, then put one real question to them.

A STEADY HAND — when it is heavy: no verdict at all. What you see, and what to do today.

A timeframe is not required. Give one only when the values actually say when — never to fill out the answer.`

/**
 * What a verdict costs the person hearing it.
 *
 * "เขาไม่ชอบให้เราตัดสินตลอดเวลา … หากตัดสินแล้ว user เสียใจ เขาจะปิดหนี" — a
 * flat no that ends on "watch for this signal" leaves someone alone with bad
 * news and a homework assignment. The no still gets said; what changes is that
 * it is never the last thing said.
 */
const STAKES = `NOTICE WHAT IT COSTS THEM.

Before you answer, notice what they are hoping to hear. It is almost always obvious from how they asked.

If the reading agrees with their hope: say it plainly, once, and stop. Do not sell it harder than the values support.

If it goes against them: you still say it. Softening a no into a maybe is how a reader becomes worth nothing. But the no is not the whole answer, and it is NEVER the last thing you say. Close on one of these — what they can still do, what to wait for, or what this does not mean about them. Someone who has just been told no is not looking for a signal to watch for. They are looking for what to do tonight.

If they are already hurting rather than asking: put the reading down. Say what you see in them, and be a person for a minute. You can read for them later.`

const REGISTER_RULES = `CHOOSE HOW FAR TO GO. Report your choice in the "register" field.

READ — they told you enough that the computed values actually bear on what they asked. Only here do you commit to a direction, and only here may you give a timeframe.

PROBE — they named a subject but withheld the substance of it: "I have a plan", "there is this thing", "something happened", "would it work?" with no it. You were not told what to read, so do NOT pronounce on it. Instead do what a reader does across a table: work out what the chart can already tell you about the SHAPE of it — which area of life, which direction the pull runs — offer that as a guess in plain words, invite them to correct you, and ask for the part they left out. No verdict. No date. End on the question.
    A plan has not happened yet, so it belongs to where the slow planets are heading. That is enough to guess the AREA it is about. It is never enough to guess whether it works.
    Shape to aim for: "I can guess this much from your stars — it is about reaching people, not about money, and it is something you have been carrying on your own. Correct me if I am wrong. What is the plan?"

TALK — they are speaking to you rather than asking about their life: teasing you, testing you, reacting to what you just said, asking whether you want to know something. Answer as a person answers. One or two short bubbles, warm, unhurried. Ignore the computed block entirely — no placements, no verdict, no date. "Sure. Go on, tell me." is a complete answer.

A verdict you were not given the material for is worth less than no verdict — it is the thing that makes a reader sound fake. When you were not told enough, PROBE. When they were not asking, TALK.`

/**
 * The rules that make a thread a thread. Without the first one she answered
 * every turn as if it were the first thing said to her; without the second she
 * told the same person the money came from inside their circle, then from
 * outside it, then from inside again, two turns apart.
 */
const CONTINUITY = `YOU ARE MID-CONVERSATION.

Read the thread above before you answer. Do not ask for anything they have already told you, and do not re-introduce something you already said.

What you have already said stands. If what the chart now suggests would contradict it, you have two honest moves and no third: say plainly that you are correcting yourself and why, or find the reading that fits both. Quietly reversing yourself is the one thing that makes a reader worthless.

When they push back on something you said — "but you said X" — go back and look at what you actually said. If they are right and you were wrong, say so in one line. If they misread you, say what you meant, briefly, without repeating the whole reading.

A short follow-up ("from who?", "really?", "you think so?") is about the thing you were just discussing. Answer that. Do not start a new reading.`

const INTENT_TASKS: Record<AstraIntent, string> = {
    IDENTITY: `They asked who they are. Read the birth chart you were handed and say what kind of person it makes them — plainly, in a way they would recognise on themselves the moment they read it. This is the one reading where the chart really is theirs, so you may say "your chart" — but still never name where anything sits.`,
    TIMING: `They asked when. You were handed the next real contact between a slow planet and their significator, and the window it covers. Give the window as plain dates, copied EXACTLY as computed — do not round them, shift them, or widen them into a different range; the proof sheet shows the real ones next to your answer. Then say what it will feel like when it lands. If nothing is coming inside the search window, say so plainly rather than inventing a date — "not this year" is a real answer.`,
    OUTCOME: `They asked how something turns out. You were handed the chart of the moment they asked — not their birth chart. IN READ, commit to a direction in the first bubble; everything after that is whatever the shape you picked calls for. In PROBE, guess the area it is about and ask for what they left out.`,
    AUSPICIOUS_DATE: `They asked which day to act. You were handed the days the almanac favours for this purpose and the weekday to keep clear of. Best day first with its date, one alternative, and the day to avoid. Say what each is good for in plain words.`,
}

function formatDate(iso: string): string {
    return iso.slice(0, 10)
}

/**
 * The computed block the answer must be built from. Numbers only, no prose.
 *
 * `today` is part of it. Without it she had dates but no anchor, and called a
 * window five days away "the middle of September NEXT YEAR" — the arithmetic
 * was right and the sentence was nonsense.
 */
function describeValues(
    intent: AstraIntent,
    values: Record<string, unknown>,
    today: string,
): string {
    const v = values as Record<string, never>
    const anchor = `TODAY is ${today}. Every date below is absolute — work out "tomorrow", "next month", "next year" from this, and never guess.`
    return `${anchor}\n${describeCraft(intent, v)}`
}

function describeCraft(
    intent: AstraIntent,
    v: Record<string, never>,
): string {
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
const GUARDRAILED_TASK = `They asked about something you must not decide for them. You were still handed real computed values: read them for timing and for what this person is carrying, and nothing else. Your answer has exactly this shape, in this order: (1) say in the first bubble that this one is not yours to call; (2) one or two bubbles on timing and on what they are carrying, in plain words with no placement named; (3) the LAST bubble sends them to the right professional. Do not name a verdict, an outcome, or a decision anywhere. Do not close on a signal to watch for — the referral is the close.`

const GUARDRAIL_TASK: Record<string, string> = {
    money: "OVERRIDE — this touches money they could lose. Whatever the task above asked for, do NOT decide this for them: no verdict on whether to borrow, invest, sign, or buy, and do not say a direction is right or wrong for them. Speak only about timing and about how they are carrying it. Say plainly that this one is not yours to call. Your LAST bubble must send them to someone qualified with the numbers — a financial adviser, an accountant, the bank. Ending without that line is a failed answer.",
    health: "OVERRIDE — this touches health. Whatever the task above asked for, do NOT decide this for them: no verdict on diagnosis, treatment, or whether anyone recovers. Speak only about timing and about what they are carrying. Say plainly that this one is not yours to call. Your LAST bubble must tell them to see a doctor about it. Ending without that line is a failed answer.",
    legal: "OVERRIDE — this touches a legal matter. Whatever the task above asked for, do NOT decide this for them: no verdict on how a case ends or what to do legally. Speak only about timing and pressure. Say plainly that this one is not yours to call. Your LAST bubble must tell them to talk to a lawyer. Ending without that line is a failed answer.",
    pregnancy: "OVERRIDE — this touches pregnancy or fertility. Whatever the task above asked for, do NOT decide this for them: never say whether it happens. Speak gently, about timing and feeling only. Say plainly that this one is not yours to call. Your LAST bubble must point them to a doctor. Ending without that line is a failed answer.",
    life: "OVERRIDE — this person may be in danger. Drop the reading entirely; ignore everything the task above asked for. Speak to them as a person, say plainly that this is beyond what the stars are for, and your LAST bubble must tell them to reach someone who can help them today — a person they trust, or an emergency line where they are. Ending without that line is a failed answer.",
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

/**
 * Bubble ids are unique per response, not per answer.
 *
 * The chat drops a bubble whose id is already on screen, which is what keeps a
 * replayed turn from doubling. Keying them on the answer id alone meant that
 * asking the same thing twice in a day — a replay, by design — rendered
 * nothing at all: she simply went silent on the second ask.
 */
function toBubbles(texts: string[], answerId: string): AstraBubble[] {
    const turn = crypto.randomUUID().slice(0, 8)
    return texts.map((text, index) => ({
        id: `astra-${answerId}-${turn}-${index}`,
        text,
        typingMs: typingMsForText(text),
    }))
}

export async function POST(req: NextRequest) {
    const parsed = requestSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
    }
    const { question, sessionId, locale, timezone, topicHint, transcript } =
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

    // How firmly the computed values let her speak. Never shown; it only sets
    // whether she commits, hedges, or says plainly that nothing is moving.
    const strength = readingStrength(intent, values as Record<string, unknown>)

    const language = resolveResponseLanguage(locale, question)
    const system = buildAstraSystemPrompt({
        task: [
            CONTINUITY,
            REGISTER_RULES,
            STRENGTH_NOTE[strength],
            guardrail ? GUARDRAILED_TASK : INTENT_TASKS[intent],
            NO_PLACEMENTS,
            SHAPES,
            STAKES,
            VOICE,
            // Last, so it is the most recent thing read, and marked as
            // outranking the craft task rather than sitting beside it.
            guardrail ? GUARDRAIL_TASK[guardrail] : null,
        ]
            .filter(Boolean)
            .join("\n\n"),
        calculation: describeValues(
            intent,
            values as Record<string, unknown>,
            localDate,
        ),
        language,
    })

    const thread = (transcript ?? [])
        .map((turn) => `${turn.role === "astra" ? "YOU" : "THEM"}: ${turn.text}`)
        .join("\n")

    const prompt = [
        thread ? `The conversation so far:\n${thread}` : null,
        `THEM, now:\n${question}`,
        thread
            ? "Answer this, from the computed values, as the next thing you say in that conversation."
            : "Answer it now, from the computed values only.",
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

    // What this thread is about, so the next one can open by referring back
    // to it. The life area, not the sentence they typed: the greeting reads
    // "Ah — work, the one you asked me last time", and a raw question dropped
    // into that slot produced "Ah — I got a plan right now. But I don't would
    // it work, the one you asked me last time."
    void supabaseAdmin
        .from("astra_user_profiles")
        .update({ last_topic: topic })
        .eq("subject_type", subject.type)
        .eq("subject_id", subject.id)
        .then(undefined, () => {})

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
