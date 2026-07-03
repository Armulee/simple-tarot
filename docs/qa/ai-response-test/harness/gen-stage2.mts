/**
 * Stage 2: reproduce the EXACT /api/interpret-cards/question prompt.
 * - getTarotReadingPrompt / TAROT_SYSTEM_PROMPT / buildRagContext /
 *   extractTopicsFromQuestion / resolveResponseLanguage are the REAL repo
 *   functions (imported).
 * - The route's inline instruction tail is extracted verbatim from the route
 *   source at runtime (between "ANSWER TARGET:" and the closing backtick),
 *   then `${lang}` / `${followUpPriorGuard}` are substituted the same way the
 *   route does — no hand transcription.
 * - The situation-branch glue (user_situation / reading_direction /
 *   card_energies blocks) replicates route lines 79-116.
 * - pickMeaning/splitIntoSentences replicate /api/situation lines 72-102 to
 *   derive cardEnergies from the simulated stage-1 situation output.
 */
import { getTarotReadingPrompt, TAROT_SYSTEM_PROMPT } from "@/lib/prompts"
import {
    buildRagContext,
    extractTopicsFromQuestion,
    getBaseCardName,
    isReversed,
    type TarotCodexRow,
} from "@/lib/tarot/rag"
import { isSensitiveQuestionDomain } from "@/lib/chat/situation-schema"
import { resolveResponseLanguage } from "@/lib/i18n/ai-language"
import { codexMapForCards } from "./codex.mts"
import { TAROT_CASES, type TarotCase } from "./cases.mts"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const ROUTE_SRC = readFileSync(
    "/home/user/simple-tarot/app/api/interpret-cards/question/route.ts",
    "utf8",
)

// Extract the inline instruction tail template verbatim from the route source.
const tailMatch = ROUTE_SRC.match(
    /prompt: `\$\{prompt\}\n\n([\s\S]*?)`,\n\s*\}\)/,
)
if (!tailMatch) throw new Error("could not extract instruction tail from route")
const TAIL_TEMPLATE = tailMatch[1]

// Extract the followUpPriorGuard template verbatim (route lines 136-143).
const guardMatch = ROUTE_SRC.match(
    /\? `\n(FOLLOW-UP — PRIOR READING IS BACKGROUND ONLY:[\s\S]*?)\n`\n\s*: ""/,
)
if (!guardMatch) throw new Error("could not extract followUpPriorGuard")
const GUARD_TEMPLATE = `\n${guardMatch[1]}\n`

type Situation = {
    topic: string
    intent: string
    emotion: string
    focus: string
    questionDomain: string
    cardReadingDirection: string
}

// --- replicate app/api/situation/route.ts:46-102 (pickMeaning et al.) ---
const LOVE_TOPICS = ["relationship", "love", "dating", "romance", "marriage", "partner", "ex"]
const CAREER_TOPICS = ["career", "job", "work", "project", "business", "promotion"]
const FINANCIAL_TOPICS = ["money", "financial", "finance", "wealth", "investment", "debt"]

function pickMeaning(row: TarotCodexRow, topic: string, reversed: boolean): string {
    const t = topic.toLowerCase()
    if (LOVE_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_love : row.meaning_love
        if (val) return val
    }
    if (CAREER_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_career : row.meaning_career
        if (val) return val
    }
    if (FINANCIAL_TOPICS.some((kw) => t.includes(kw))) {
        const val = reversed ? row.reversed_meaning_financial : row.meaning_financial
        if (val) return val
    }
    return reversed ? row.reversed_meaning_general : row.meaning_general
}

function splitIntoSentences(text: string): string[] {
    return text.split(".").map((s) => s.trim()).filter(Boolean)
}

function cardEnergiesFor(c: TarotCase, situation: Situation): string[][] {
    const codexMap = codexMapForCards(c.cards)
    return c.cards.map((cardDisplay) => {
        const baseName = getBaseCardName(cardDisplay)
        const reversed = isReversed(cardDisplay)
        const row = codexMap.get(baseName)
        if (!row) return []
        return splitIntoSentences(pickMeaning(row, situation.topic, reversed))
    })
}

// --- replicate app/api/interpret-cards/question/route.ts:60-143 ---
function buildFinalPrompt(c: TarotCase, situation: Situation | null): {
    system: string
    prompt: string
    lang: string
} {
    let prompt = getTarotReadingPrompt({
        question: c.question,
        cards: c.cards.join(", "),
        readingType: c.readingType ?? null,
        isFollowUp: Boolean(c.isFollowUp),
        previousQuestion: c.previousQuestion ?? null,
        previousInterpretation: c.previousInterpretation ?? null,
    })
    // NOTE: chat client sends conversationContext as an object; the route's
    // normalizeConversationContext turns it into a contextText block. Our
    // cases carry the context inside previousInterpretation/`conversationContext`
    // string; replicate the same <session_context> prepend the route does.
    if (c.conversationContext && !prompt.includes("<session_context>")) {
        prompt = `Session context (background only — use it to understand what an ambiguous current question refers to; NEVER answer an old question from it):\n${c.conversationContext}\n\n---\n\n${prompt}`
    }

    const cardEnergies = situation ? cardEnergiesFor(c, situation) : null
    if (situation && cardEnergies && cardEnergies.length > 0) {
        const domainLine =
            situation.questionDomain && isSensitiveQuestionDomain(situation.questionDomain)
                ? `Question domain (sensitive): ${situation.questionDomain} — offer reflective symbolism only; do not present as legal, medical, or financial advice.\n`
                : situation.questionDomain
                  ? `Question domain: ${situation.questionDomain}\n`
                  : ""
        const situationBlock = `<user_situation>
Topic: ${situation.topic}
Intent: ${situation.intent}
Emotion: ${situation.emotion}
Focus: ${situation.focus}
${domainLine}</user_situation>`

        const directionBlock = situation.cardReadingDirection
            ? `\n<reading_direction>\n${situation.cardReadingDirection}\n</reading_direction>`
            : ""

        const energyLines = c.cards
            .map((card, i) => {
                const sentences = cardEnergies[i] ?? []
                return `${card}: ${sentences.join(". ")}`
            })
            .join("\n")

        const energyBlock = `<card_energies>
${energyLines}
</card_energies>`

        prompt = `${situationBlock}
${directionBlock}

${energyBlock}

---

${prompt}`
    } else {
        const codexMap = codexMapForCards(c.cards)
        const topics = extractTopicsFromQuestion(c.question)
        const ragContext = buildRagContext(c.cards, codexMap, topics)
        if (ragContext) {
            prompt = `${ragContext}
---

${prompt}`
        }
    }

    const lang = resolveResponseLanguage(c.locale, c.question)
    const hasPriorReadingForFollowUp =
        Boolean(c.isFollowUp) &&
        typeof c.previousInterpretation === "string" &&
        c.previousInterpretation.trim().length > 0
    const followUpPriorGuard = hasPriorReadingForFollowUp ? GUARD_TEMPLATE : ""

    const tail = TAIL_TEMPLATE.replaceAll("${lang}", lang).replaceAll(
        "${followUpPriorGuard}",
        followUpPriorGuard,
    )

    return { system: TAROT_SYSTEM_PROMPT, prompt: `${prompt}\n\n${tail}`, lang }
}

const OUT_DIR = process.argv[2]
if (!OUT_DIR) throw new Error("usage: gen-stage2.mts <out-dir>")
mkdirSync(OUT_DIR, { recursive: true })

let count = 0
for (const c of TAROT_CASES) {
    let situation: Situation | null = null
    if (c.branch === "situation") {
        const resultFile = join(OUT_DIR, `${c.id}.stage1.result.json`)
        if (!existsSync(resultFile)) {
            console.log(`skip ${c.id} (no stage-1 result yet)`)
            continue
        }
        situation = JSON.parse(readFileSync(resultFile, "utf8")) as Situation
    }
    const { system, prompt, lang } = buildFinalPrompt(c, situation)
    writeFileSync(
        join(OUT_DIR, `${c.id}.stage2.json`),
        JSON.stringify(
            {
                caseId: c.id, kind: c.kind, branch: c.branch, lang,
                model: "deepseek/deepseek-v4-pro",
                params: { mode: "json", temperature: 0.6, thinking: "disabled" },
                system, prompt,
            },
            null, 2,
        ),
    )
    count++
}
console.log(`wrote ${count} stage-2 prompts to ${OUT_DIR}`)
