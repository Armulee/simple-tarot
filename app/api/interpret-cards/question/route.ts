import { streamObject } from "ai"
import { getTarotReadingPrompt, TAROT_SYSTEM_PROMPT } from "@/lib/prompts"
import { summarizePrivacyPlaceholdersInText } from "@/lib/privacy/prompt-redaction"
import { tarotInterpretationSchema } from "@/lib/tarot/schema"
import {
    fetchTarotCodexForCards,
    extractTopicsFromQuestion,
    buildRagContext,
} from "@/lib/tarot/rag"
import {
    buildConversationContextPromptBlock,
    normalizeConversationContext,
} from "@/lib/astrology/question-context"
import { isSensitiveQuestionDomain } from "@/lib/chat/situation-schema"
import { resolveResponseLanguage } from "@/lib/i18n/ai-language"
import { deepseekThinking } from "@/lib/chat/model-options"

const MODEL = "deepseek/deepseek-v4-pro"

/**
 * Fallback sensitive-domain detector for requests that carry no upstream
 * `situation.questionDomain` (the legacy /tarot page never calls
 * /api/situation). Keyword-based, EN + TH, deliberately narrow — it only
 * needs to catch clearly medical/legal/financial outcome questions.
 */
function detectSensitiveDomainFromQuestion(question: string): boolean {
    const q = question.toLowerCase()
    const sensitive = [
        // medical
        "cancer", "tumor", "tumour", "diagnos", "surgery", "chemo",
        "terminal", "illness", "disease", "icu", "มะเร็ง", "เนื้องอก",
        "ผ่าตัด", "คีโม", "ป่วยหนัก", "โรคร้าย", "หายป่วย", "อาการป่วย",
        // legal
        "lawsuit", "court case", "verdict", "custody", "deport", "visa appeal",
        "criminal charge", "คดี", "ศาล", "ฟ้อง", "โดนจับ", "ประกันตัว",
        // financial (regulated-outcome questions)
        "bankrupt", "foreclosure", "debt restructur", "ล้มละลาย", "ยึดทรัพย์",
        "ปรับโครงสร้างหนี้",
    ]
    return sensitive.some((kw) => q.includes(kw))
}

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as {
            question?: string
            cards?: string[]
            readingType?: string | null
            isFollowUp?: boolean
            previousQuestion?: string | null
            previousInterpretation?: string | null
            conversationContext?: unknown
            locale?: string
            situation?: {
                topic: string
                intent: string
                emotion: string
                focus: string
                questionDomain?: string
                needsClarification?: boolean
                cardReadingDirection?: string
            }
            cardEnergies?: string[][]
        }

        const {
            question,
            cards,
            readingType,
            isFollowUp,
            previousQuestion,
            previousInterpretation,
            conversationContext: rawContext,
            situation,
            cardEnergies,
        } = body

        if (!question || !Array.isArray(cards) || cards.length === 0) {
            return new Response("Question and cards are required", {
                status: 400,
            })
        }

        let prompt = getTarotReadingPrompt({
            question,
            cards: cards.join(", "),
            readingType: readingType ?? null,
            isFollowUp: Boolean(isFollowUp),
            previousQuestion: previousQuestion ?? null,
            previousInterpretation: previousInterpretation ?? null,
        })
        const conversationContext = normalizeConversationContext(rawContext)
        const contextBlock =
            buildConversationContextPromptBlock(conversationContext)
        if (contextBlock && !prompt.includes("<session_context>")) {
            prompt = `${contextBlock}

---

${prompt}`
        }

        if (situation && cardEnergies && cardEnergies.length > 0) {
            const domainLine =
                situation.questionDomain &&
                isSensitiveQuestionDomain(situation.questionDomain)
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

            const energyLines = cards
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
            const codexMap = await fetchTarotCodexForCards(cards)
            const topics = extractTopicsFromQuestion(question)
            const ragContext = buildRagContext(cards, codexMap, topics)

            if (ragContext) {
                prompt = `${ragContext}
---

${prompt}`
            }
        }

        const lang = resolveResponseLanguage(body.locale, question)
        const hasPriorReadingForFollowUp =
            Boolean(isFollowUp) &&
            typeof previousInterpretation === "string" &&
            previousInterpretation.trim().length > 0

        const followUpPriorGuard = hasPriorReadingForFollowUp
            ? `
FOLLOW-UP — PRIOR READING IS BACKGROUND ONLY:
- Any prior interpretation in the prompt exists only for thread/topic continuity. Do NOT copy, quote, closely paraphrase, or recycle its sentences in keyMessage, interpretation, conclusion, or cardInsights.
- The user-facing answer must read as a fresh reading grounded in the CURRENT cards (via reading_direction and card_energies). If the new spread disagrees with the old vibe, follow the new spread.
- Do not mention "last reading", "earlier", or "before" unless the user's question explicitly asks about the prior reading.
`
            : ""

        // Sensitive domains are enforced here in code, not left to a single
        // prose clause: a one-line guard inside <user_situation> reliably
        // loses to the stronger "pick a side / don't flip the direction"
        // instructions, which produced outcome predictions for medical
        // questions (e.g. a "likely cured" cancer headline).
        const isSensitiveDomain =
            isSensitiveQuestionDomain(situation?.questionDomain ?? "") ||
            detectSensitiveDomainFromQuestion(question)
        const sensitiveDomainOverride = isSensitiveDomain
            ? `

SENSITIVE DOMAIN OVERRIDE (HIGHEST PRIORITY — outranks reading_direction and every rule above):
- This question touches a medical, legal, or financial outcome. The cards may NOT predict that outcome.
- headline, keyMessage, and detailedHtml must NOT state or imply an outcome verdict (no "หาย/cured/recover", "ชนะ/win/lose", "รวย/rich/broke", no prognosis, no case result, no investment result).
- Instead, read the emotional landscape and the user's own path through it: what they can control, how to steady themselves, and how to support the person involved.
- Include one natural, warm sentence that the real answer lies with the professionals handling it (doctors and the care team / a lawyer / a licensed advisor) and that the cards speak to the journey, not the outcome.
- Keep every field in the same language as the question, warm and steady in tone (see GRAVITY EXCEPTION).`
            : ""

        const vagueQuestionNote = situation?.needsClarification
            ? `

VAGUE QUESTION NOTE: the user's question was too vague to know exactly what it refers to. Give the leaning the cards show for the decision in general, but do NOT invent named specifics the user never mentioned (no contracts, other people, paperwork, dates). Make ONE of the suggestions chips a gentle invitation to tell the oracle what "it" is (in the user's own voice, e.g. "Let me explain what I'm deciding" phrased as their next message).`
            : ""

        const result = streamObject({
            model: MODEL,
            // 'json' mode injects the schema into the prompt and uses the
            // provider's native JSON streaming, so partial fields flow to the
            // client token-by-token. The default 'auto' frequently resolves to
            // tool-call mode for DeepSeek, which buffers the entire JSON
            // payload until the tool call completes — that is what made the
            // tarot reading "pop in" all at once instead of streaming.
            mode: "json",
            temperature: 0.6,
            providerOptions: deepseekThinking(false),
            schema: tarotInterpretationSchema,
            system: TAROT_SYSTEM_PROMPT,
            prompt: `${prompt}

ANSWER TARGET: The reading must answer the user's CURRENT question — the <current_question> block when present, otherwise <user_question>. Session context, conversation history, and any previous question/interpretation in the prompt are background only: use them to resolve what an ambiguous current question refers to, never as the question to answer. If history and the current question conflict, the current question wins.
LANGUAGE: The user's question is in ${lang}. You MUST write ALL output fields (cardInsights, headline, subtitle, keyMessage, detailedHtml, perCard.sentence, nextStep, keywords, interpretation, conclusion, suggestions) in ${lang}. EMIT THE KEYS IN THIS EXACT DECLARATION ORDER so the streaming UI fills in matching sections in the same order they appear on screen (hero card quotes → headline → subtitle → keyMessage → detailedHtml → perCard → nextStep → keywords → interpretation → conclusion → suggestions). The only exception is perCard[i].cardName, which MUST echo the input card name verbatim. The card_energies and reading_direction are English internal data — translate them into ${lang}. NEVER output English when the question is in ${lang}. For the detailedHtml field, write the human-visible text content in ${lang} while keeping HTML tag names (p, span, etc.) and the literal class name "highlight-gold" in English. detailedHtml must NEVER name or quote a tarot card title (no "The Hermit", "Three of Swords", Thai card titles, etc.) — only meanings and energy in plain language, same rule as interpretation body.
${followUpPriorGuard}
CRITICAL NARRATOR RULE: If a <reading_direction> is provided, you MUST follow it as your answer skeleton.
- The reading_direction contains the core leaning, card-by-card reasoning, and advice that a stronger reasoning model already determined from the CURRENT draw (not from any prior user-facing interpretation).
- Your job is to translate that reasoning into a warm, natural, CASUAL narrative in ${lang} — phrased as patterns, tendencies, and energy rather than absolute facts.
- Keep the same DIRECTION as reading_direction (positive-leaning stays positive-leaning, negative-leaning stays negative-leaning, warning stays a warning), but ALWAYS phrase it as a probability or signal — never as a fixed verdict.
- Translate the direction into a clear leaning in your own words: a "yes" verdict reads as a probable yes, a "no" as a probable no, a "warning" as a tendency worth watching. Stay clear about the direction but never claim certainty — and phrase the leaning in words specific to THIS question, not a stock hedge formula.
- Weave each card's reasoning into the narrative without mentioning card names.
- End with the practical advice from reading_direction, framed as a likely approach rather than a guaranteed result.
- Do NOT flip the direction (positive→negative or vice versa) and do NOT become wishy-washy or noncommittal. Soft does not mean vague. (EXCEPTION: if a SENSITIVE DOMAIN OVERRIDE block appears below, it outranks the reading_direction — follow the override.)
- You MAY enrich the direction with vivid, specific details to make it feel more natural and human — but never change the core leaning or add new reasoning that contradicts the direction.
- TONE WORDS — AVOID: definitely, absolutely, certainly, guaranteed, no doubt, 100%, for sure, will (as fixed future), must, has to (Thai: แน่นอน, รับรอง, ชัวร์, ฟันธง, จะต้อง, ต้องเป็น, แน่ๆ, 100%).
- VARIETY: express the leaning through concrete, question-specific wording. Stock oracle hedges ("the signals point to...", "the energy suggests...", "likely yes — ...", "พลังงานช่วงนี้...", "สัญญาณบอกว่า...") may appear AT MOST ONCE in the whole reading across all fields, and never open two fields with the same word or construction.
- cardInsights must be per-card meanings tied to the user's question.
- Each cardInsights string MUST be ultra-short for the UI card strip: ≤12 Thai words OR ≤10 English words, one clause, no semicolons.
- Each item in cardInsights should mainly describe what energy or pattern that specific card is contributing in this situation.
- cardInsights must NOT sound like headline / keyMessage, the final answer, or a summary of the whole reading.
- cardInsights must be written in an impersonal, objective style.
- cardInsights must NOT address the user directly or mention the user as an entity.
- Do NOT use wording like "you", "yourself", "คุณ", "ตัวเอง", or similar user-referential forms in cardInsights.
- Do NOT begin cardInsights with hedging phrases like "may feel", "might feel", "อาจจะรู้สึกว่า", or similar soft-openers.
- If <card_energies> is provided, use it to ground each matching cardInsights item.
- headline is the verdict, ≤10 Thai words (or equivalent in ${lang}). Plain text, no card names, no markdown. For HOW/STRATEGY questions, headline must be the strategic direction, never "yes you will succeed".
- subtitle is the nuance / condition / caveat under the headline. ≤20 Thai words. Must add real information, must not repeat the headline verbatim.
- perCard.length MUST equal the number of input cards. perCard[i].cardName MUST exactly equal cards[i] (verbatim, same casing). Each perCard[i].sentence describes what THAT specific card adds to the answer — concrete to the question's domain, ≤25 words, no card name inside the sentence, no "this card" phrasing.
- nextStep is a soft suggestion — an invitation, never an order. FORBIDDEN: ต้อง, ควร used as a command, must, should, have to, need to used as a command. VARY the opener between readings — do not default to "Try/ลอง" every time.
- ANSWER FIELDS — keyMessage, interpretation, and conclusion render on the reading page and shared view; write them as REAL prose, never copies of other fields:
  - keyMessage: ONE grammatical sentence (or two short ones) fusing the headline's verdict with the subtitle's nuance — flowing prose, never a mechanical join.
  - interpretation: THE MAIN ANSWER BODY. 3-5 complete, flowing sentences that directly answer the question: leaning first, then the why woven from the cards, then what to do with it. Every sentence needs a subject — never fragments like "Points to..." and never a join of perCard sentences.
  - conclusion: a short, warm closing in fresh words — same direction as nextStep, different wording, never a verbatim copy.
- suggestions are the NEXT QUESTIONS the user would tap to ASK next — write each as a question in the user's own voice (first person). Tapping a chip sends it as their next message, so it MUST read like a question, ending with "?" or a natural Thai question word (ไหม / มั้ย / ปะ / ยังไง / เมื่อไหร่ / ใคร).
- suggestions are NOT advice, action items, or a to-do list, and NOT a restatement of nextStep / conclusion. NEVER tell the user what to DO. Bad (advice): "จัดโต๊ะทำงานใหม่", "ทำกับข้าวกินเอง", "Rearrange your desk", "Save more money". Good (questions): "ย้ายโต๊ะทำงานแล้วจะดีขึ้นไหม", "เดือนนี้การเงินจะรอดไหม", "Should I switch desks for focus?", "Will my savings hold this month?".
- suggestions MUST contain EXACTLY 3–4 items — never fewer than 3, never more than 4.
- Each suggestion must be short (aim ≤10 Thai words or ≤8 English words), one line, casual spoken phrasing — like something the user would actually text the oracle.
- All suggestions MUST be clearly different angles (different topic, timing, person, or scope). They MUST NOT be paraphrases or near-rephrasings of each other.
- suggestions must stay generic and user-relatable rather than depending on the exact wording of the generated reading.
- suggestions must NOT quote or closely paraphrase the generated headline, subtitle, perCard, nextStep, keyMessage, interpretation, or conclusion.
- TONE: Write like you're texting a close friend who reads patterns and energy — never as a judge declaring an absolute truth. In Thai, use casual MODERN language (ลอง, เวิร์ค, ปัง, เน้น, จัดเลย) — never archaic register (ข้า, เจ้า, ดั่ง). AVOID formal/translated phrasing (ฉันรู้สึกว่า, การรักษาความยุติธรรม, ประสบความสำเร็จ, สะท้อนกลับมา). GRAVITY EXCEPTION: when the question concerns serious illness, death, legal trouble, or major loss, drop the breezy register — stay warm and steady, no slang, no upbeat cheer.${vagueQuestionNote}${sensitiveDomainOverride}`,
        })

        const promptStats = summarizePrivacyPlaceholdersInText(question)
        result.object
            .then((obj) => {
                const combined = [
                    obj.headline,
                    obj.subtitle,
                    obj.keyMessage,
                    obj.interpretation,
                    obj.nextStep,
                    obj.conclusion,
                    ...(obj.cardInsights ?? []),
                    ...((obj.perCard ?? []).map((c) => c?.sentence ?? "")),
                    ...(obj.suggestions ?? []),
                ].join("\n")
                const outStats = summarizePrivacyPlaceholdersInText(combined)
                console.log(
                    "[interpret-cards/question] route → tarot streamObject finished; privacy token check",
                    {
                        /** Prompt the model saw (only token counts / unique bracket forms, not raw PII). */
                        promptPlaceholderStats: promptStats,
                        /** If the model followed the rule, you should see matching tokens here. */
                        modelOutputPlaceholderStats: outStats,
                    },
                )
                if (process.env.NODE_ENV === "development") {
                    console.log(
                        "[interpret-cards/question] full tarot object (dev only):",
                        obj,
                    )
                }
            })
            .catch((e) => {
                console.error(
                    "[interpret-cards/question] final object / stream error:",
                    e,
                )
            })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating interpretation:", error)
        return new Response("Failed to generate interpretation", {
            status: 500,
        })
    }
}
