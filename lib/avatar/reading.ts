/**
 * Reading generator for the avatar feature.
 *
 * The avatar is LLM-agnostic at the HeyGen layer (Lite / bring-your-own-LLM):
 * we generate the reading text with OUR own model and hand HeyGen only the
 * final text to speak. This module draws a card and produces a short, spoken
 * reading suitable for lip-sync.
 *
 * It uses the same Vercel AI Gateway model string convention as the rest of
 * the app (see app/api/chat/route.ts and lib/astrology/ai-time-range.ts).
 */

import { generateText } from "ai"
import { pickRandomCards, type PickedCard } from "@/lib/tarot/pick-random-cards"
import { buildLanguageInstruction } from "@/lib/i18n/ai-language"

const MODEL = process.env.AVATAR_READING_MODEL ?? "deepseek/deepseek-v3.2"

export type AvatarReading = {
    card: PickedCard
    /** Plain text for the avatar to speak (and to persist as a caption). */
    text: string
}

/**
 * Build the system prompt for a spoken tarot reading, in the visitor's own
 * language — this runs on the landing page now, not a hidden /avatar route,
 * so an English or Japanese visitor must not be answered in Thai.
 */
function systemPrompt(opts: {
    closing: boolean
    locale: string
    question: string
}): string {
    return [
        "You are Astra, the AskingFate fortune teller. Speak warmly, politely and encouragingly.",
        // The question's own script wins over the UI locale when they disagree,
        // which is what buildLanguageInstruction already resolves.
        buildLanguageInstruction(opts.locale, opts.question),
        "Write spoken sentences, not prose for the page: it must read aloud smoothly and suit lip-sync.",
        "Never use symbols, markdown, emoji or headings — plain spoken text only.",
        "Keep it to roughly 4-6 sentences, complete in itself. Never stop mid-sentence.",
        "This is reflective, encouraging guidance — not a guaranteed prediction, and not medical or legal advice.",
        opts.closing
            ? "End with a gentle in-character line inviting the listener to use one 'wish' if they still have questions. Do not mention prices."
            : "End with a short encouraging line, in character.",
    ].join("\n")
}

function userPrompt(question: string, card: PickedCard): string {
    const orientation = card.isReversed ? "reversed" : "upright"
    return [
        `The querent's question: ${question}`,
        `The card drawn: ${card.name} (${orientation})`,
        "Turn this card over and read it aloud for them, tying the card's meaning to their question naturally.",
    ].join("\n")
}

/**
 * Draw one card and generate a complete, self-contained spoken reading.
 *
 * `closing` controls whether the reading ends with the in-character invitation
 * to spend a wish (used for the free reveal's final line). The reading itself
 * is always complete — never cut off to force payment.
 */
export async function generateAvatarReading(opts: {
    question: string
    locale: string
    closing?: boolean
}): Promise<AvatarReading> {
    const [card] = pickRandomCards(1)
    if (!card) {
        throw new Error("Failed to draw a card")
    }

    const { text } = await generateText({
        model: MODEL,
        system: systemPrompt({
            closing: Boolean(opts.closing),
            locale: opts.locale,
            question: opts.question,
        }),
        prompt: userPrompt(opts.question, card),
        temperature: 0.8,
        maxOutputTokens: 400,
    })

    return { card, text: text.trim() }
}
