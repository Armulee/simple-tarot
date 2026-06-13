import { z } from "zod"

/**
 * Conversational "talk" reply: used when the user is just chatting with Astra
 * (greetings, venting, "I want to talk to you", thanks) rather than asking for
 * a tarot/horoscope reading, an interpretation, or a prediction. The reply is
 * plain, gentle, grounded in the conversation so far, and ends by proposing a
 * few things the user could ask next — NOT a mystical reflection, NOT a
 * product/support block.
 *
 * Field order matters: `streamObject` emits keys in declaration order, so
 * `reply` streams first (the visible text), then `suggestions`.
 */
export const talkReplySchema = z.object({
    reply: z
        .string()
        .describe(
            "A warm, gentle, plain-text reply that talks WITH the user like a thoughtful companion — NOT a reading, prediction, horoscope, or mystical reflection. Acknowledge what they said and, when they reference something from earlier, answer from the conversation history. 2-4 short sentences, broken into short paragraphs separated by a blank line when it helps. Plain text only: no markdown, no headings, no card/planet/astrology jargon. SAME language as the user's message; write like a native speaker.",
        ),
    suggestions: z
        .array(z.string())
        .min(2)
        .max(4)
        .describe(
            "2-4 gentle next-step prompts written as QUESTIONS in the user's own voice (ending with '?' or a Thai question word like ไหม / ยังไง / ไหมนะ) — the kind of thing they could tap to explore next ('อยากให้ดูเรื่องงานไหม', 'ช่วงนี้รู้สึกยังไงบ้าง', 'Want to look at what's ahead this month?'). They advise WHAT they could ask, never commands or to-do items. SAME language as the user's message. All MUST differ in angle.",
        ),
})

export type TalkReply = z.infer<typeof talkReplySchema>

/** Streaming-friendly partial schema for `useObject`. */
export const streamingTalkReplySchema = z.object({
    reply: z.string().optional(),
    suggestions: z.array(z.string()).optional(),
})

export type StreamingTalkReply = z.infer<typeof streamingTalkReplySchema>
