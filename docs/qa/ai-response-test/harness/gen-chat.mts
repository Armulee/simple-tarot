/**
 * Harness: reproduce the EXACT prompts three chat API routes send to their model.
 *
 * Routes replicated (read their source at runtime for private constants):
 *   1. app/api/chat/question/route.ts  — "inner energy reflection" (streamObject)
 *   2. app/api/chat/oracle/route.ts    — oracle fortune card        (streamObject)
 *   3. app/api/chat/talk/route.ts      — conversational reply       (streamObject)
 *
 * Fidelity strategy:
 *   - Long private template-literal constants (the three SYSTEM prompts) and the
 *     `return \`...\`` template inside each route's private buildPrompt() are
 *     extracted from the route source files at runtime and evaluated as real
 *     template literals (new Function) with the same variables in scope — zero
 *     transcription drift.
 *   - The routes' local detectQuestionLanguage() (oracle + talk have their own
 *     identical private copy) is likewise extracted and evaluated from source so
 *     the exact unicode ranges are used.
 *   - Shared helpers are imported from the real repo modules via the "@/" alias:
 *     resolveResponseLanguage, PRIVACY_REDACTION_PROMPT_RULE, deepseekThinking.
 *
 * Fixed "now": 2026-07-03. NOTE: none of the three routes call new Date()
 * anywhere in prompt assembly (the question route's resolveTargetDateIso only
 * reads body.transit / body.questionRange, both absent in our cases, and with
 * birth === null the astrology context is skipped entirely), so the constant
 * exists for spec parity but never enters any prompt string.
 *
 * Run: cd /home/user/simple-tarot && npx tsx <this file>
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { resolveResponseLanguage } from "@/lib/i18n/ai-language"
import { PRIVACY_REDACTION_PROMPT_RULE } from "@/lib/privacy/prompt-redaction"
import { deepseekThinking } from "@/lib/chat/model-options"

const REPO = "/home/user/simple-tarot"
const SP =
    "/tmp/claude-0/-home-user-simple-tarot/7d1b6962-2970-5a7a-81a0-15dcf3b6f016/scratchpad"
const OUT_DIR = path.join(SP, "out")

/** Fixed current date (unused by these routes — see header note). */
const FIXED_NOW_ISO = "2026-07-03"

const MODEL = "deepseek/deepseek-v4-pro" // `const MODEL` in all three routes

// ---------------------------------------------------------------------------
// Runtime extraction of route-private template literals
// ---------------------------------------------------------------------------

/**
 * Return the RAW body (escapes preserved) of the first template literal that
 * starts after `marker` (searching from `from`). Scans for the first unescaped
 * closing backtick — the route templates contain escaped backticks (\`) but no
 * backticks inside ${...} interpolations, so this is exact.
 */
function extractTemplateLiteral(
    source: string,
    marker: string,
    from = 0,
): string {
    const mi = source.indexOf(marker, from)
    if (mi === -1) throw new Error(`marker not found: ${JSON.stringify(marker)}`)
    const open = source.indexOf("`", mi + marker.length - 1)
    if (open === -1) throw new Error(`no template after marker: ${marker}`)
    let i = open + 1
    while (i < source.length) {
        const c = source[i]
        if (c === "\\") {
            i += 2
            continue
        }
        if (c === "`") return source.slice(open + 1, i)
        i += 1
    }
    throw new Error(`unterminated template literal after marker: ${marker}`)
}

/** Evaluate a raw template-literal body with the given variables in scope. */
function evalTemplate(rawBody: string, scope: Record<string, unknown>): string {
    const keys = Object.keys(scope)
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, "return `" + rawBody + "`")
    return fn(...keys.map((k) => scope[k])) as string
}

/** Extract a route's private `function detectQuestionLanguage` and compile it. */
function extractDetector(source: string): (text: string) => string {
    const m = source.match(
        /function detectQuestionLanguage\(text: string\): string \{([\s\S]*?)\n\}/,
    )
    if (!m) throw new Error("detectQuestionLanguage not found in source")
    // Body is plain JS (regex literals + returns) once the signature types go.
    // eslint-disable-next-line no-new-func
    return new Function("text", m[1]) as (text: string) => string
}

const questionSrc = readFileSync(
    path.join(REPO, "app/api/chat/question/route.ts"),
    "utf8",
)
const oracleSrc = readFileSync(
    path.join(REPO, "app/api/chat/oracle/route.ts"),
    "utf8",
)
const talkSrc = readFileSync(
    path.join(REPO, "app/api/chat/talk/route.ts"),
    "utf8",
)

// System prompts — evaluated with the same interpolations the routes use.
const GENERAL_REPLY_SYSTEM_PROMPT = evalTemplate(
    extractTemplateLiteral(questionSrc, "const GENERAL_REPLY_SYSTEM_PROMPT ="),
    { PRIVACY_REDACTION_PROMPT_RULE },
)
const ORACLE_SYSTEM_PROMPT = evalTemplate(
    extractTemplateLiteral(oracleSrc, "const ORACLE_SYSTEM_PROMPT ="),
    { PRIVACY_REDACTION_PROMPT_RULE },
)
const TALK_SYSTEM_PROMPT = evalTemplate(
    extractTemplateLiteral(talkSrc, "const TALK_SYSTEM_PROMPT ="),
    { PRIVACY_REDACTION_PROMPT_RULE },
)

// buildPrompt() return-templates, raw (evaluated per case below).
const questionPromptTemplate = extractTemplateLiteral(
    questionSrc,
    "return `",
    questionSrc.indexOf("function buildPrompt"),
)
const oraclePromptTemplate = extractTemplateLiteral(
    oracleSrc,
    "return `",
    oracleSrc.indexOf("function buildPrompt"),
)
const talkPromptTemplate = extractTemplateLiteral(
    talkSrc,
    "return `",
    talkSrc.indexOf("function buildPrompt"),
)

// Route-local language detectors (oracle and talk each define their own copy).
const oracleDetectQuestionLanguage = extractDetector(oracleSrc)
const talkDetectQuestionLanguage = extractDetector(talkSrc)

// ---------------------------------------------------------------------------
// Request body shape shared by all three routes (per their zod requestSchema),
// with our fixed case assumptions: no birth data, no history, no
// contextSummary, isFollowUp = false → questionRange/transit absent → the
// question route's resolveTargetDateIso() yields null and astrology is null,
// so astrologyBlock = "" (route: astrologyContext?.promptBlock ?? "").
// ---------------------------------------------------------------------------

type HistoryMessage = { role: "user" | "assistant"; text: string }

type RequestBody = {
    question: string
    isFollowUp?: boolean
    history?: HistoryMessage[]
    contextSummary?: string | null
    locale?: string
    birth?: null
}

// --- /api/chat/question — mirrors buildPrompt(body, astrologyBlock) ---------
function buildQuestionPrompt(body: RequestBody, astrologyBlock: string) {
    const { question, isFollowUp, history, contextSummary, locale } = body
    const historyText =
        history && history.length
            ? history
                  .slice(-6)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings / interactions):\n${contextSummary.trim()}\n\n`
            : ""

    const detectedLang = resolveResponseLanguage(locale, question)
    const astrologySection = astrologyBlock ? `${astrologyBlock}\n\n` : ""

    const prompt = evalTemplate(questionPromptTemplate, {
        contextBlock,
        astrologySection,
        historyText,
        question,
        isFollowUp,
        detectedLang,
    })
    return { prompt, resolvedLanguage: detectedLang }
}

// --- /api/chat/oracle — mirrors buildPrompt(body) ---------------------------
function buildOraclePrompt(body: RequestBody) {
    const lang = oracleDetectQuestionLanguage(body.question)
    const historyBlock =
        Array.isArray(body.history) && body.history.length > 0
            ? `\nRecent conversation (oldest first — background only):\n${body.history
                  .slice(-10)
                  .map((m) => `- ${m.role}: ${m.text}`)
                  .join("\n")}\n`
            : ""
    const contextBlock = body.contextSummary?.trim()
        ? `\nSession context summary (background only):\n${body.contextSummary.trim()}\n`
        : ""
    const followUpHint = body.isFollowUp
        ? "\nThis is a follow-up to the previous turn — let the new reading dance with what was just said, not repeat it.\n"
        : ""

    const prompt = evalTemplate(oraclePromptTemplate, {
        lang,
        historyBlock,
        contextBlock,
        followUpHint,
        body,
    })
    return { prompt, resolvedLanguage: lang }
}

// --- /api/chat/talk — mirrors buildPrompt(body) ------------------------------
function buildTalkPrompt(body: RequestBody) {
    const { question, isFollowUp, history, contextSummary } = body
    const historyText =
        history && history.length
            ? history
                  .slice(-8)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"
    const contextBlock =
        contextSummary && contextSummary.trim()
            ? `Session context (previous readings / interactions — background for continuity):\n${contextSummary.trim()}\n\n`
            : ""
    const detectedLang = talkDetectQuestionLanguage(question)

    const prompt = evalTemplate(talkPromptTemplate, {
        contextBlock,
        historyText,
        question,
        isFollowUp,
        detectedLang,
    })
    return { prompt, resolvedLanguage: detectedLang }
}

// ---------------------------------------------------------------------------
// Zod output-schema summaries (from lib/chat/*.ts)
// ---------------------------------------------------------------------------

const GENERAL_REPLY_SCHEMA_FIELDS =
    "generalReplySchema (lib/chat/general-reply-schema.ts), key order = streaming reveal order: " +
    "innerEnergy: enum(vortex|eclipse|fog|wave|flame|spiral|ember|tide); " +
    "heroTitle: string (3-7 words, plain text, same language as user, no astrology jargon); " +
    "innerDirection: string (one short sentence, ~6-14 words, plain text); " +
    "reflection: string (HTML fragment, 1-3 short paragraphs; allowed tags only: <p>,<strong>,<em>,<ul>,<ol>,<li>,<br>,<span class=\"highlight-gold\">; exactly ONE plain-words astrological reference, no degrees/houses/sign names/aspect names); " +
    "currents: array of {label: string (1-3 words, title case), text: string (one 10-18-word sentence)} .min(2).max(3); " +
    "whisper: string (single closing line, <=14 words, not advice); " +
    "suggestions: array(string) .min(3).max(4) (follow-up QUESTIONS in the user's voice, each <=10 Thai / <=8 English words, all differing in angle)"

const ORACLE_READING_SCHEMA_FIELDS =
    "oracleReadingSchema (lib/chat/oracle-reading-schema.ts), field order matters for streaming: " +
    "energy: enum(reflection|transformation|letting_go|new_beginnings|hidden_truths|patience|healing|self_discovery|divine_timing|emotional_release|intuition|alignment|courage|boundary|gratitude); " +
    "energyLabel: string .min(2).max(40) (2-5 word tag/chip in the user's language, not a sentence); " +
    "message: string .min(6).max(120) (THE HEADLINE: 3-8 words, one line, directly answers the question, clarity over mysticism, no semicolons/em-dash splits); " +
    "deeperMeaning: string .min(40).max(600) (1-2 short paragraphs, HTML fragment; allowed tags only: <p>,<strong>,<em>,<br>,<span class=\"highlight-gold\">; interpretation only, never supernatural certainty); " +
    "guidance: array(string .min(4).max(160)) .min(3).max(5) (single-sentence practical empowering bullets, plain text); " +
    "closing: string .min(4).max(200) OPTIONAL (one-sentence closing whisper, plain text)"

const TALK_REPLY_SCHEMA_FIELDS =
    "talkReplySchema (lib/chat/talk-schema.ts), reply streams before suggestions: " +
    "reply: string (plain text, calm oracle voice, 2-4 short sentences, no markdown/headings/astro-tarot jargon, same language as user); " +
    "suggestions: array(string) .min(2).max(4) (gentle next-step prompts written as QUESTIONS in the user's voice, ending '?' or Thai question word, all differing in angle)"

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

type Case = {
    caseId: string
    endpoint: "/api/chat/question" | "/api/chat/oracle" | "/api/chat/talk"
    question: string
    locale: string
}

const CASES: Case[] = [
    {
        caseId: "C1",
        endpoint: "/api/chat/question",
        question: "Why do I feel so drained lately?",
        locale: "en",
    },
    {
        caseId: "C2",
        endpoint: "/api/chat/question",
        question: "ช่วงนี้รู้สึกเหนื่อยกับทุกอย่างเลย ทำไมถึงเป็นแบบนี้",
        locale: "th",
    },
    {
        caseId: "C3",
        endpoint: "/api/chat/question",
        question: "Does my crush like me back?",
        locale: "en",
    },
    {
        caseId: "O1",
        endpoint: "/api/chat/oracle",
        question: "What lesson is the universe trying to teach me right now?",
        locale: "en",
    },
    {
        caseId: "O2",
        endpoint: "/api/chat/oracle",
        question: "ปีนี้ฉันจะโชคดีไหม",
        locale: "th",
    },
    {
        caseId: "O3",
        endpoint: "/api/chat/oracle",
        question: "¿Qué me depara el destino este año?",
        locale: "es",
    },
    {
        caseId: "K1",
        endpoint: "/api/chat/talk",
        question:
            "I don't want a reading, I just need someone to talk to. Today was awful.",
        locale: "en",
    },
    {
        caseId: "K2",
        endpoint: "/api/chat/talk",
        question: "ขอบคุณนะ ที่ผ่านมาช่วยได้เยอะเลย",
        locale: "th",
    },
]

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true })

const providerOptions = deepseekThinking(false)

for (const c of CASES) {
    // zod: question: z.string().trim().min(1) — .trim() transforms the value.
    const body: RequestBody = {
        question: c.question.trim(),
        isFollowUp: false,
        locale: c.locale,
        birth: null, // → astrologyContext = null → astrologyBlock = ""
    }

    let system: string
    let prompt: string
    let resolvedLanguage: string
    let schemaName: string
    let schemaFields: string

    if (c.endpoint === "/api/chat/question") {
        const built = buildQuestionPrompt(body, "") // astrologyContext?.promptBlock ?? ""
        system = GENERAL_REPLY_SYSTEM_PROMPT
        prompt = built.prompt
        resolvedLanguage = built.resolvedLanguage
        schemaName = "generalReplySchema"
        schemaFields = GENERAL_REPLY_SCHEMA_FIELDS
    } else if (c.endpoint === "/api/chat/oracle") {
        const built = buildOraclePrompt(body)
        system = ORACLE_SYSTEM_PROMPT
        prompt = built.prompt
        resolvedLanguage = built.resolvedLanguage
        schemaName = "oracleReadingSchema"
        schemaFields = ORACLE_READING_SCHEMA_FIELDS
    } else {
        const built = buildTalkPrompt(body)
        system = TALK_SYSTEM_PROMPT
        prompt = built.prompt
        resolvedLanguage = built.resolvedLanguage
        schemaName = "talkReplySchema"
        schemaFields = TALK_REPLY_SCHEMA_FIELDS
    }

    const record = {
        caseId: c.caseId,
        endpoint: c.endpoint,
        model: MODEL,
        params: {
            api: "streamObject",
            schema: schemaName,
            providerOptions, // deepseekThinking(false) → thinking disabled
            resolvedLanguage,
            fixedNowIso: FIXED_NOW_ISO,
            requestBody: body,
            notes: [
                "birth=null → buildGeneralAstrologyContext skipped → astrologyBlock=\"\" (question route only)",
                "history/contextSummary absent → history block renders as \"None\" (question/talk) or empty (oracle)",
                "no new Date() is used in any of the three routes' prompt assembly; fixedNowIso never enters the prompt",
            ],
        },
        system,
        prompt,
        schemaFields,
    }

    const file = path.join(OUT_DIR, `${c.caseId}.chat.json`)
    writeFileSync(file, JSON.stringify(record, null, 2) + "\n", "utf8")
    console.log(
        `${c.caseId}  ${c.endpoint}  lang=${resolvedLanguage}  system=${system.length} chars  prompt=${prompt.length} chars  -> ${file}`,
    )
}

console.log("\nDone: " + CASES.length + " files in " + OUT_DIR)
