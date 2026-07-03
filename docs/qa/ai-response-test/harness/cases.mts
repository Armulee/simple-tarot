/** Test matrix for the tarot pipeline. */
export type TarotCase = {
    id: string
    lang: "en" | "th"
    locale?: string
    kind: string
    question: string
    cards: string[]
    readingType: "simple" | "general" | "detailed" | "expanded" | "celtic"
    isFollowUp?: boolean
    previousQuestion?: string
    previousInterpretation?: string
    conversationContext?: string
    /** which pipeline branch to exercise in stage 2 */
    branch: "situation" | "rag"
}

const PREV_JOB_READING =
    "Likely yes — the signals here lean strongly in your favor. The energy points to skills and momentum lining up at the right time, with patterns suggesting this could be a real turning point in your career. One caution: a hint of past disappointment still colors how you present yourself. Try walking into the next step as if the outcome is already settled."

const PREV_LOVE_READING =
    "The signals lean toward giving this connection space rather than forcing a reunion. The energy shows an emotional door that closed for a reason, and a pull backward that is more about comfort than compatibility. Consider letting the silence do its work for now."

export const TAROT_CASES: TarotCase[] = [
    {
        id: "T1", lang: "en", locale: "en", kind: "yes/no career",
        question: "Will I get the job I interviewed for last week?",
        cards: ["The Magician", "The World", "Three of Swords"],
        readingType: "general", branch: "situation",
    },
    {
        id: "T2", lang: "th", locale: "th", kind: "yes/no love (Thai)",
        question: "แฟนเก่าจะกลับมาหาฉันไหม",
        cards: ["The Tower", "Two of Cups (Reversed)", "The Moon"],
        readingType: "general", branch: "situation",
    },
    {
        id: "T3", lang: "en", locale: "en", kind: "how/strategy",
        question: "How should I grow my TikTok channel to 100k followers?",
        cards: ["The Emperor"],
        readingType: "simple", branch: "situation",
    },
    {
        id: "T4", lang: "en", locale: "en", kind: "when/timing",
        question: "When will I meet my soulmate?",
        cards: ["Wheel of Fortune", "The Lovers", "Eight of Wands"],
        readingType: "general", branch: "situation",
    },
    {
        id: "T5", lang: "en", locale: "en", kind: "vague",
        question: "Should I do it?",
        cards: ["Justice"],
        readingType: "simple", branch: "situation",
    },
    {
        id: "T6", lang: "en", locale: "en", kind: "multi-part",
        question: "Should I quit my job and move to Japan, and will my girlfriend come with me?",
        cards: ["The Fool", "Ten of Wands", "The Star", "King of Cups", "Six of Swords"],
        readingType: "detailed", branch: "situation",
    },
    {
        id: "T7", lang: "th", locale: "th", kind: "sensitive medical (Thai)",
        question: "แม่ป่วยเป็นมะเร็ง จะหายไหม",
        cards: ["The Sun", "Death", "The Hierophant"],
        readingType: "general", branch: "situation",
    },
    {
        id: "T8", lang: "en", locale: "en", kind: "follow-up same topic",
        question: "What about the salary — will it be good?",
        cards: ["Nine of Pentacles", "The Empress"],
        readingType: "general", isFollowUp: true,
        previousQuestion: "Will I get the job I interviewed for last week?",
        previousInterpretation: PREV_JOB_READING,
        conversationContext:
            'User asked: "Will I get the job I interviewed for last week?" — Reading leaned yes: skills and momentum lining up, career turning point.',
        branch: "situation",
    },
    {
        id: "T9", lang: "en", locale: "en", kind: "follow-up topic switch",
        question: "Forget that — will my finances improve this month?",
        cards: ["Ace of Pentacles", "Five of Pentacles", "Ten of Pentacles"],
        readingType: "general", isFollowUp: true,
        previousQuestion: "Should I text my ex back?",
        previousInterpretation: PREV_LOVE_READING,
        conversationContext:
            'User asked: "Should I text my ex back?" — Reading leaned no: emotional door closed for a reason, let silence do its work.',
        branch: "situation",
    },
    {
        id: "T10", lang: "en", locale: "en", kind: "emotional",
        question: "I feel so lost after my divorce. Am I going to be okay?",
        cards: ["The Star", "Nine of Swords", "Temperance"],
        readingType: "general", branch: "situation",
    },
    {
        id: "T11", lang: "en", locale: "en", kind: "off-domain",
        question: "What is 2+2?",
        cards: ["The Fool"],
        readingType: "simple", branch: "situation",
    },
    {
        id: "T12", lang: "en", locale: "en", kind: "open celtic-cross",
        question: "What do I need to know about my life direction right now?",
        cards: [
            "The Hermit", "Ten of Wands", "The Star", "Death", "The Emperor",
            "Six of Swords", "The Moon", "Nine of Pentacles", "Wheel of Fortune", "The World",
        ],
        readingType: "celtic", branch: "situation",
    },
    // Legacy /tarot page variants: NO situation, NO locale → RAG branch
    {
        id: "T1L", lang: "en", kind: "legacy RAG: yes/no career",
        question: "Will I get the job I interviewed for last week?",
        cards: ["The Magician", "The World", "Three of Swords"],
        readingType: "general", branch: "rag",
    },
    {
        id: "T2L", lang: "th", kind: "legacy RAG: Thai love (no locale sent)",
        question: "แฟนเก่าจะกลับมาหาฉันไหม",
        cards: ["The Tower", "Two of Cups (Reversed)", "The Moon"],
        readingType: "general", branch: "rag",
    },
    {
        id: "T3L", lang: "en", kind: "legacy RAG: how/strategy",
        question: "How should I grow my TikTok channel to 100k followers?",
        cards: ["The Emperor"],
        readingType: "simple", branch: "rag",
    },
    {
        id: "T5L", lang: "en", kind: "legacy RAG: vague",
        question: "Should I do it?",
        cards: ["Justice"],
        readingType: "simple", branch: "rag",
    },
]
