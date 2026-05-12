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

const MODEL = "deepseek/deepseek-v3.2"

function detectQuestionLanguage(text: string): string {
    if (/[\u0E80-\u0EFF]/.test(text)) return "Lao"
    if (/[\u0E00-\u0E7F]/.test(text)) return "Thai"
    if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return "Japanese"
    if (/[\uAC00-\uD7AF]/.test(text)) return "Korean"
    if (/[\u0400-\u04FF]/.test(text)) return "Russian"
    return "English"
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
            const situationBlock = `<user_situation>
Topic: ${situation.topic}
Intent: ${situation.intent}
Emotion: ${situation.emotion}
Focus: ${situation.focus}
</user_situation>`

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

        const lang = detectQuestionLanguage(question)
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

        const result = await streamObject({
            model: MODEL,
            temperature: 0.6,
            schema: tarotInterpretationSchema,
            system: TAROT_SYSTEM_PROMPT,
            prompt: `${prompt}

LANGUAGE: The user's question is in ${lang}. You MUST write ALL output fields (cardInsights, headline, subtitle, keyMessage, detailedHtml, perCard.sentence, nextStep, keywords, interpretation, conclusion, suggestions) in ${lang}. EMIT THE KEYS IN THIS EXACT DECLARATION ORDER so the streaming UI fills in matching sections in the same order they appear on screen (hero card quotes → headline → subtitle → keyMessage → detailedHtml → perCard → nextStep → keywords → interpretation → conclusion → suggestions). The only exception is perCard[i].cardName, which MUST echo the input card name verbatim. The card_energies and reading_direction are English internal data — translate them into ${lang}. NEVER output English when the question is in ${lang}. For the detailedHtml field, write the human-visible text content in ${lang} while keeping HTML tag names (p, span, etc.) and the literal class name "highlight-gold" in English.
${followUpPriorGuard}
CRITICAL NARRATOR RULE: If a <reading_direction> is provided, you MUST follow it as your answer skeleton.
- The reading_direction contains the core leaning, card-by-card reasoning, and advice that a stronger reasoning model already determined from the CURRENT draw (not from any prior user-facing interpretation).
- Your job is to translate that reasoning into a warm, natural, CASUAL narrative in ${lang} — phrased as patterns, tendencies, and energy rather than absolute facts.
- Keep the same DIRECTION as reading_direction (positive-leaning stays positive-leaning, negative-leaning stays negative-leaning, warning stays a warning), but ALWAYS phrase it as a probability or signal — never as a fixed verdict.
- Translate the direction like this: a "yes" verdict becomes "likely yes / the signals lean toward yes / น่าจะใช่ / สัญญาณไปทางใช่"; a "no" becomes "likely no / the signals lean against it / น่าจะไม่ / แนวโน้มไม่ค่อย"; a "warning" becomes "the energy here points to a tendency worth watching / พลังงานช่วงนี้มีแนวโน้มที่ต้องระวัง". Stay clear about the direction but never claim certainty.
- Weave each card's reasoning into the narrative without mentioning card names.
- End with the practical advice from reading_direction, framed as a likely approach rather than a guaranteed result.
- Do NOT flip the direction (positive→negative or vice versa) and do NOT become wishy-washy or noncommittal. Soft does not mean vague.
- You MAY enrich the direction with vivid, specific details to make it feel more natural and human — but never change the core leaning or add new reasoning that contradicts the direction.
- TONE WORDS — PREFER: likely, tends to, leans toward, the signals point to, the energy here suggests, the pattern shows, there's a real possibility, the direction is, it looks like (Thai: น่าจะ, มีแนวโน้ม, สัญญาณบอกว่า, พลังงานช่วงนี้, ดูเหมือนว่า, มีโอกาส, ทิศทางคือ).
- TONE WORDS — AVOID: definitely, absolutely, certainly, guaranteed, no doubt, 100%, for sure, will (as fixed future), must, has to (Thai: แน่นอน, รับรอง, ชัวร์, ฟันธง, จะต้อง, ต้องเป็น, แน่ๆ, 100%).
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
- nextStep is a soft suggestion. It MUST start with a non-commanding verb. ALLOWED openers: ลอง / อาจ / เผื่อ / อาจจะ (Thai), Try / Consider / Maybe / You could (English). FORBIDDEN openers: ต้อง, ควร used as a command, must, should, have to, need to used as a command.
- BACK-COMPAT FIELDS — these must be deterministic restatements, NOT fresh content:
  - keyMessage = headline + ' ' + subtitle (joined into one short paragraph).
  - interpretation = perCard[].sentence joined together with spaces as one short paragraph.
  - conclusion = nextStep (verbatim).
- suggestions MUST contain EXACTLY 3–4 items — never fewer than 3, never more than 4.
- Each suggestion must be VERY short (aim ≤8 Thai words or ≤6 English words), one line, like something a friend would text — not a long formal question.
- All suggestions MUST be clearly different angles (different topic, perspective, or scope). They MUST NOT be paraphrases or near-rephrasings of each other.
- suggestions must stay generic and user-relatable rather than depending on the exact wording of the generated reading.
- suggestions must NOT quote or closely paraphrase the generated headline, subtitle, perCard, nextStep, keyMessage, interpretation, or conclusion.
- TONE: Write like you're texting a close friend who reads patterns and energy — never as a judge declaring an absolute truth. In Thai, use casual language (ลอง, เวิร์ค, ปัง, เน้น, จัดเลย). AVOID formal/translated phrasing (ฉันรู้สึกว่า, การรักษาความยุติธรรม, ประสบความสำเร็จ, สะท้อนกลับมา).`,
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
