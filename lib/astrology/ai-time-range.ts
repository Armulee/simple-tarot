import { generateObject } from "ai"
import { z } from "zod"

const MODEL = "openai/gpt-4o-mini"

const timeRangeSchema = z.object({
    timeRangeDays: z
        .number()
        .int()
        .min(1)
        .max(730)
        .describe(
            "Optimal number of days to search for answering the user's astrology question",
        ),
})

const SYSTEM_PROMPT = `You are an astrology time-range assistant. Given a user's question, decide how many days of planetary transit data are needed to answer it.

Rules:
- "today" or "tonight" -> 1
- Short-term or vague with no time anchor -> 30
- "this year" or "next few months" -> 90-180
- Long-term "when" questions (career change, marriage, moving, project completion) -> 180-365
- Very long-term life questions (retirement, children, destiny) -> 365-730
- If user specifies a timeframe, match it (e.g. "next 2 years" -> 730)

Return only the number of days.`

const SAFE_FALLBACK_DAYS = 30

export async function resolveTimeRangeDaysWithAI(
    question: string,
): Promise<number> {
    try {
        const { object } = await generateObject({
            model: MODEL,
            schema: timeRangeSchema,
            system: SYSTEM_PROMPT,
            prompt: question,
            temperature: 0,
        })
        console.log(
            `[ai-time-range] question="${question.slice(0, 80)}", days=${object.timeRangeDays}`,
        )
        return object.timeRangeDays
    } catch (error) {
        console.warn("[ai-time-range] failed, using fallback:", error)
        return SAFE_FALLBACK_DAYS
    }
}
