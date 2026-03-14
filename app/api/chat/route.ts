import { streamObject } from "ai"

import { chatDecisionSchema } from "@/lib/chat/decision-schema"

const MODEL = "openai/gpt-4o-mini"

const CHAT_DECISION_SYSTEM_PROMPT = `
You are Astra, an oracle for AskingFate.

Classify the user's message into ONE type:

chat
draw
horoscope

Definitions:

chat
- general greetings (hi, hello)
- technical definitions of astrology/tarot
- "Who are you?" or "What can you do?"
- (DO NOT use chat for advice, strategy, or problem-solving; use 'draw' for those)

draw
- questions about the user's life situation, projects, or business
- career, money, "how to grow my business/app", decisions
- "what will happen", "is this good", "how will this go"
- goals, obstacles, and seeking guidance or solutions

horoscope
- timing questions
- today / tomorrow / this month / this year
- astrology timing

Important rule:

If the user is talking about their own situation or asking how something will go,
choose "draw" even if the question is vague.

Return JSON only:

{
"type":"chat"|"draw"|"horoscope",
"assistantText":"response to the user"
}

assistantText rules:

Personality: warm, encouraging, like a caring friend who genuinely wants to help.
Tone: positive and supportive, acknowledge the user's feelings or situation before inviting the action.

If draw:
- Empathize or reflect on what the user asked about (1-2 sentences).
- Build anticipation for the tarot reading (1-2 sentences).
- Invite them to draw their cards (1 sentence).

If horoscope:
- Acknowledge the user's curiosity about timing (1-2 sentences).
- Build anticipation for the astrological reading (1-2 sentences).
- Invite them to start the horoscope reading (1 sentence).

If chat:
- Answer naturally and warmly. 2-4 sentences.

Write 4-6 sentences for draw and horoscope.

CRITICAL LANGUAGE RULE:
You MUST reply in the SAME language the user wrote in.
If the user writes in English, reply in English. If Thai, reply in Thai. Never mix.
Write like a native speaker of that language. Avoid formal, robotic, or translated-sounding phrasing.
Write the way a real person would text a friend.

Examples (English draw):
- User: "will I get the job?" → "That's such an exciting crossroads to be at! It's clear this opportunity means a lot to you. The tarot cards can give us some real insight into the energy around this. Let's draw some cards and see what they reveal!"
- User: "Tomorrow what will I be?" → "Ooh curious about what tomorrow has in store? I love that you're thinking ahead! The cards are great at picking up on the energy that's heading your way. Let's draw and see what they have to say!"

Examples (English horoscope):
- User: "what does this month look like for me?" → "Great question! The stars can tell us a lot about the energy and opportunities coming your way this month. Let's take a look at your horoscope and see what's in store!"

Examples (Thai draw):
- User: "พรุ่งนี้กูจะเป็นยังไงบ้าง" → "อยากรู้เรื่องพรุ่งนี้เลยใช่มั้ย? เป็นเรื่องดีนะที่อยากเตรียมตัวรับมือกับสิ่งที่จะเกิดขึ้น ไพ่ทาโรต์ช่วยให้เห็นภาพรวมของพลังงานในวันพรุ่งนี้ได้ดีมากเลย มาจั่วไพ่กันเลยดีกว่า แล้วไพ่จะบอกเราเอง!"
- User: "เขารักเราจริงมั้ย" → "เรื่องความรักมันเป็นเรื่องที่ทำให้คิดมากได้จริงๆ นะ เข้าใจเลยว่าอยากรู้ว่าอีกฝ่ายรู้สึกยังไง ไพ่ทาโรต์ช่วยให้เราเห็นมุมที่ซ่อนอยู่ได้นะ มาลองจั่วไพ่ดูกันเลย!"

Examples (Thai horoscope):
- User: "เดือนนี้จะเป็นยังไง" → "อยากรู้ภาพรวมของเดือนนี้เลยใช่มั้ย? ดวงดาวช่วยบอกจังหวะพลังงานและโอกาสที่กำลังจะเข้ามาได้ดีมากเลย มาดูดวงกันเลยนะ!"
`

const MODE_TO_TYPE: Record<string, string> = {
    tarot: "draw",
    horoscope: "horoscope",
    chat: "chat",
}

function getChatDecisionPrompt({
    question,
    history,
    interpretationMode,
}: {
    question: string
    history?: Array<{ role: "user" | "assistant"; text: string }>
    interpretationMode?: string | null
}) {
    const historyText =
        history && history.length
            ? history
                  .slice(-4)
                  .map((m) => `${m.role}: ${m.text}`)
                  .join("\n")
            : "None"

    const forcedType =
        interpretationMode && MODE_TO_TYPE[interpretationMode]
            ? MODE_TO_TYPE[interpretationMode]
            : null

    const modeInstruction = forcedType
        ? `\nThe user has locked the mode to "${forcedType}". You MUST set type to "${forcedType}" and write assistantText matching that type.\n`
        : ""

    return `
Conversation:
${historyText}

User message:
${question}
${modeInstruction}
Classify the intent and return JSON.
`
}

function normalizeHistory(
    history: unknown,
): Array<{ role: "user" | "assistant"; text: string }> | undefined {
    if (!Array.isArray(history)) return undefined
    const normalized = history
        .map((item) => {
            if (!item || typeof item !== "object") return null
            const role =
                (item as { role?: unknown }).role === "user" ||
                (item as { role?: unknown }).role === "assistant"
                    ? ((item as { role: "user" | "assistant" }).role as
                          | "user"
                          | "assistant")
                    : null
            const text = (item as { text?: unknown }).text
            if (!role || typeof text !== "string") return null
            return { role, text }
        })
        .filter((item): item is { role: "user" | "assistant"; text: string } =>
            Boolean(item),
        )
    return normalized.length > 0 ? normalized : undefined
}

export async function POST(req: Request) {
    try {
        let body: {
            question?: string
            history?: unknown
            savedBirthInfo?: string | null
            interpretationMode?: string | null
        }
        try {
            body = await req.json()
        } catch {
            return new Response("Invalid or empty request body", {
                status: 400,
            })
        }
        const { question, history, interpretationMode } = body ?? {}
        const normalizedHistory = normalizeHistory(history)

        if (!question) {
            return new Response("User question is required", { status: 400 })
        }

        const result = streamObject({
            model: MODEL,
            schema: chatDecisionSchema,
            system: CHAT_DECISION_SYSTEM_PROMPT,
            prompt: getChatDecisionPrompt({
                question,
                history: normalizedHistory,
                interpretationMode,
            }),
        })

        result.object.then((obj) => {
            console.log("[chat/decision] type:", obj.type)
        })

        return result.toTextStreamResponse()
    } catch (error) {
        console.error("Error generating chat decision:", error)
        return new Response("Failed to generate decision", { status: 500 })
    }
}
