/**
 * Reading generator for the avatar feature.
 *
 * The avatar is LLM-agnostic at the HeyGen layer (Lite / bring-your-own-LLM):
 * we generate the reading text with OUR own model and hand HeyGen only the
 * final text to speak. This module draws a card and produces a short, spoken
 * Thai reading suitable for lip-sync.
 *
 * It uses the same Vercel AI Gateway model string convention as the rest of
 * the app (see app/api/chat/route.ts and lib/astrology/ai-time-range.ts).
 */

import { generateText } from "ai"
import { pickRandomCards, type PickedCard } from "@/lib/tarot/pick-random-cards"

const MODEL = process.env.AVATAR_READING_MODEL ?? "deepseek/deepseek-v3.2"

export type AvatarReading = {
    card: PickedCard
    /** Plain text for the avatar to speak (and to persist as a caption). */
    text: string
}

/**
 * Build the system prompt for a spoken tarot reading. The voice is the
 * AskingFate fortune teller ("แม่หมอ"), warm and in-character, speaking Thai.
 */
function systemPrompt(opts: { closing: boolean }): string {
    return [
        "คุณคือ 'แม่หมอ' หมอดูไพ่ทาโรต์ของ AskingFate พูดด้วยน้ำเสียงอบอุ่น สุภาพ และให้กำลังใจ",
        "พูดเป็นภาษาไทยล้วน เป็นประโยคพูด (ไม่ใช่ข้อเขียน) อ่านออกเสียงได้ลื่นไหล เหมาะกับการพากย์ปาก (lip-sync)",
        "ห้ามใช้สัญลักษณ์ มาร์กดาวน์ อีโมจิ หรือหัวข้อ ใช้แต่ข้อความพูดธรรมดา",
        "ความยาวกระชับ ประมาณ 4-6 ประโยค ให้ครบถ้วนในตัวเอง ห้ามค้างหรือตัดจบกลางประโยค",
        "นี่คือการทำนายเชิงสะท้อนความคิดและให้กำลังใจ ไม่ใช่คำพยากรณ์ที่รับประกันผล และไม่ใช่คำแนะนำทางการแพทย์หรือกฎหมาย",
        opts.closing
            ? "ปิดท้ายด้วยประโยคในคาแร็กเตอร์ที่นุ่มนวล เชิญชวนให้ใช้ 'พร' หนึ่งข้อหากยังมีคำถามต่อ โดยไม่พูดเรื่องราคา"
            : "ปิดท้ายด้วยประโยคให้กำลังใจสั้น ๆ ในคาแร็กเตอร์",
    ].join("\n")
}

function userPrompt(question: string, card: PickedCard): string {
    const orientation = card.isReversed ? "กลับหัว (reversed)" : "ตั้งตรง (upright)"
    return [
        `คำถามของผู้รับคำทำนาย: ${question}`,
        `ไพ่ที่เปิดได้: ${card.name} (${orientation})`,
        "ช่วยเปิดไพ่ใบนี้และอ่านคำทำนายให้ฟังเป็นภาษาพูด เชื่อมโยงความหมายของไพ่กับคำถามอย่างเป็นธรรมชาติ",
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
    closing?: boolean
}): Promise<AvatarReading> {
    const [card] = pickRandomCards(1)
    if (!card) {
        throw new Error("Failed to draw a card")
    }

    const { text } = await generateText({
        model: MODEL,
        system: systemPrompt({ closing: Boolean(opts.closing) }),
        prompt: userPrompt(opts.question, card),
        temperature: 0.8,
        maxOutputTokens: 400,
    })

    return { card, text: text.trim() }
}

/** In-character line spoken when the paid minute is up. */
export const TIME_UP_LINE =
    "เวลาของเราหมดลงพอดีแล้วนะคะ ขอให้ดวงดาวคุ้มครองคุณ หากใจยังมีคำถาม ใช้พรอีกข้อแล้วกลับมาหาแม่หมอได้เสมอค่ะ"
