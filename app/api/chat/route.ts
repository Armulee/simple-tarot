import { streamText } from "ai"

const MODEL = "openai/gpt-4o-mini"

const CHAT_DECISION_SYSTEM_PROMPT = `
You are Astra, a warm and intuitive oracle for AskingFate.

Your job is ONLY to classify the user's message into ONE of these types:

1. "chat"
   - explanations
   - knowledge questions
   - general conversation

2. "draw"
   - tarot reading about a situation
   - "Will this happen?"
   - "Should I do this?"
   - relationship or life outcome questions

3. "horoscope"
   - timing questions
   - astrology predictions
   - questions about today, this month, this year, or "when"

Decision rules:

Use "horoscope" if the user asks:
- when something will happen
- about today / tomorrow / this month / this year
- about astrology or birth chart predictions

Use "draw" if the user asks:
- whether something will happen
- relationship or life outcome
- advice about a situation

Use "chat" for:
- explanations
- definitions
- casual conversation

If unsure → choose "draw".

Return ONLY valid JSON:

{
"type":"chat" | "draw" | "horoscope",
"assistantText":"response to the user"
}

assistantText rules:
- same language as the user
- 1–2 sentences
- warm and natural tone

If type="draw":
invite the user to draw tarot cards.

If type="horoscope":
invite the user to check their horoscope.
`

function getChatDecisionPrompt({
    question,
    history,
}: {
    question: string
    history?: Array<{ role: "user" | "assistant"; text: string }>
}) {
    const historyText =
        history && history.length
            ? history
                  .slice(-4)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    return `
Conversation:
${historyText}

User message:
${question}

Classify the intent and return JSON.
`
}

export async function POST(req: Request) {
    try {
        const { question, history } = await req.json()

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamText({
            model: MODEL,
            maxOutputTokens: 2000,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({ question, history }),
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
