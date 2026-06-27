import { z } from "zod"

export const innerEnergyShapeSchema = z.enum([
    "vortex",
    "eclipse",
    "fog",
    "wave",
    "flame",
    "spiral",
    "ember",
    "tide",
])

export type InnerEnergyShape = z.infer<typeof innerEnergyShapeSchema>

/**
 * Schema field order matters: `streamObject` emits keys in declaration order.
 * The order below mirrors the on-screen reveal so each section appears as soon
 * as its first character lands:
 *
 *   1. innerEnergy    → drives the symbolic hero (vortex / eclipse / fog ...)
 *   2. heroTitle      → emotionally intuitive headline above the orb
 *   3. innerDirection → short subtext for the mood pill
 *   4. reflection     → 1-3 paragraph emotional interpretation (HTML)
 *   5. currents       → 2-3 small "inner current" cards
 *   6. whisper        → closing intuitive line
 *   7. suggestions    → 3-4 follow-up tap chips
 */
export const generalReplySchema = z.object({
    innerEnergy: innerEnergyShapeSchema.describe(
        "One symbolic shape that best evokes the user's current inner state. 'vortex' = swirling pull / pressure they cannot name. 'eclipse' = something hidden, ending, or about to reveal. 'fog' = unclear path, suspended discernment. 'wave' = rising emotion or incoming change. 'flame' = active desire, restlessness, courage. 'spiral' = a returning lesson or deepening pattern. 'ember' = quiet resilience, low-burning hope. 'tide' = gentle pull toward a transition. Choose the SINGLE shape that feels most true. Default to 'fog' only when the message is too vague to read.",
    ),
    heroTitle: z
        .string()
        .describe(
            "The hero title shown above the symbolic orb. 3-7 words. Emotionally intuitive, slightly mysterious, never literal. SAME language as the user's message. Plain text only — no markdown, no quotes, no astrology jargon. Examples (English): 'A quiet pull underneath', 'Something is turning inward', 'The current is shifting'. NEVER sound like 'Daily Horoscope' or 'Today's energy'.",
        ),
    innerDirection: z
        .string()
        .describe(
            "Short subtext for the mood pill that reflects the user's INNER emotional direction (not the day, not the weather, not a forecast). One short sentence, ideally 6-14 words. SAME language as the message. Plain text. Examples (English): 'You are between two versions of yourself', 'The decision is already forming beneath the surface'.",
        ),
    reflection: z
        .string()
        .describe(
            "A short decorated HTML reflection (1-3 short paragraphs) that ANSWERS the user's question, grounded in the supplied astrology_activities (the live transit-to-natal aspects). Lead with emotional interpretation — invisible pressure, transition energy, inner shifts — but DO give the user a felt answer to what they actually asked. Weave in EXACTLY ONE short, real astrological reference as the 'why': name the transiting planet and the natal planet it touches plus the gist of the contact in plain words (e.g. 'Mars pressing your Moon is stirring this'), then translate it straight into feeling. ONE reference only — no degrees, no house numbers, no zodiac sign names, no technical aspect names (conjunction/trine/square), no chart-jargon dumps. NOT horoscope-style 'today you will…' phrasing, not advice lists. Speak TO the user directly. ALLOWED TAGS ONLY: <p>, <strong>, <em>, <ul>, <ol>, <li>, <br>, and <span class=\"highlight-gold\">. NO headings. Use <span class=\"highlight-gold\">…</span> to highlight 1-3 key phrases. SAME language as the user's message.",
        ),
    currents: z
        .array(
            z.object({
                label: z
                    .string()
                    .describe(
                        "1-3 word label for this inner current (e.g. 'Hidden pressure', 'Quiet pull', 'A door closing'). Title case. SAME language as the message.",
                    ),
                text: z
                    .string()
                    .describe(
                        "One short sentence (10-18 words) that names what this current feels like INSIDE the user. SAME language as the message. Plain text, no markdown.",
                    ),
            }),
        )
        .min(2)
        .max(3)
        .describe(
            "2-3 'inner currents' — small cards that name the invisible forces moving under the user's message. Each card should feel distinct (one direction, one tension, one rising thing).",
        ),
    whisper: z
        .string()
        .describe(
            "A single closing intuitive line — short (≤14 words), almost whispered. Not advice. Not a command. Just a felt truth. SAME language as the message.",
        ),
    suggestions: z
        .array(z.string())
        .min(3)
        .max(4)
        .describe(
            "EXACTLY 3-4 follow-up QUESTIONS the user would tap to ask next, written in the user's own voice and ending like a question (\"...ไหม\" / \"...?\"). NOT advice, to-do items, or a restatement of the closing line — never tell the user what to do; ask what they'd want to know next. Each item a single line, ≤10 Thai words or ≤8 English words when possible. SAME language as the message. All MUST differ in angle.",
        ),
})

export type GeneralReply = z.infer<typeof generalReplySchema>

/**
 * Streaming-friendly partial schema for `useObject`. Every field is optional so
 * the UI can render whatever has arrived so far.
 */
export const streamingGeneralReplySchema = z.object({
    innerEnergy: innerEnergyShapeSchema.optional(),
    heroTitle: z.string().optional(),
    innerDirection: z.string().optional(),
    reflection: z.string().optional(),
    currents: z
        .array(
            z.object({
                label: z.string().optional(),
                text: z.string().optional(),
            }),
        )
        .optional(),
    whisper: z.string().optional(),
    suggestions: z.array(z.string()).optional(),
})

export type StreamingGeneralReply = z.infer<typeof streamingGeneralReplySchema>
