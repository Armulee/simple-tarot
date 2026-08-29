/**
 * Which craft answers this question.
 *
 * Every question used to be thrown at a tarot draw, which is why every answer
 * read like a shuffle plus prose. A question about who someone is belongs to
 * the birth chart; when something lifts belongs to the transits; how a move
 * turns out belongs to the chart of the moment it was asked; which day to act
 * belongs to the almanac.
 *
 * The patterns below decide WHICH craft takes a question. They are not a list
 * of the questions she is allowed to hear: anything they do not name falls to
 * the chart of the moment, which is what ยามถาม is for. Only a message with
 * nothing in it — a greeting, an acknowledgement, a laugh — makes her ask back.
 */

export const ASTRA_INTENTS = [
    "IDENTITY",
    "TIMING",
    "OUTCOME",
    "AUSPICIOUS_DATE",
] as const

export type AstraIntent = (typeof ASTRA_INTENTS)[number]

/** Life area, used to pick the house a question falls in. */
export const ASTRA_TOPICS = [
    "career",
    "love",
    "money",
    "health",
    "travel",
    "study",
    "family",
    "general",
] as const

export type AstraTopic = (typeof ASTRA_TOPICS)[number]

/**
 * Subjects where she may speak about timing but must never decide for the
 * person, and must send them to a real professional.
 */
export const ASTRA_GUARDRAILS = [
    "money",
    "health",
    "legal",
    "pregnancy",
    "life",
] as const

export type AstraGuardrail = (typeof ASTRA_GUARDRAILS)[number]

export type IntentResult =
    | {
          kind: "reading"
          intent: AstraIntent
          topic: AstraTopic
          guardrail: AstraGuardrail | null
      }
    /**
     * Not hers to answer: an explicit tarot draw, or a question about the
     * product itself. The existing flows already handle both.
     */
    | { kind: "tarot" }
    | { kind: "passthrough" }
    /** Too vague to route. She asks one question back. */
    | { kind: "unsure" }

const AUSPICIOUS_PATTERNS = [
    /ฤกษ์/,
    /วัน(?:ไหน|ใด)(?:ดี|เหมาะ|มงคล)/,
    /(?:ควร|น่าจะ|จะ)(?:ทำ|เริ่ม|เปิด|ย้าย|แต่งงาน|เซ็น|ลาออก)(?:.{0,12})?วันไหน/,
    /วันมงคล|วันดี|เลือกวัน|หาวัน/,
    /auspicious|\bbest (?:day|date|time) to\b|\bgood day to\b|\bwhat day should\b|\bwhich day should\b/i,
]

const TIMING_PATTERNS = [
    /เมื่อ(?:ไหร่|ไร)/,
    /ตอนไหน|ช่วงไหน|กี่(?:วัน|เดือน|ปี)|นานไหม|อีกนาน/,
    /จะ(?:ดีขึ้น|จบ|หาย|ผ่าน|คลี่คลาย|ได้)เมื่อ/,
    /\bwhen (?:will|do|does|can|is|am|are)\b|\bhow long (?:until|till|before)\b|\bhow soon\b/i,
]

const IDENTITY_PATTERNS = [
    /(?:ฉัน|ผม|หนู|เรา)เป็นคน(?:แบบ|ยัง)?ไหน/,
    /ดวง(?:กำเนิด|ของ(?:ฉัน|ผม|หนู))|ลัคนา(?:ของ)?(?:ฉัน|ผม)?|พื้นดวง/,
    /(?:จุดแข็ง|จุดอ่อน|นิสัย|บุคลิก|พรสวรรค์|ถนัด)(?:.{0,10})?(?:ฉัน|ผม|หนู|ของเรา)?/,
    /เหมาะ(?:กับ|จะทำ)(?:งาน|อาชีพ)/,
    /\bwho am i\b|\bwhat kind of person\b|\bmy (?:birth )?chart\b|\bmy strengths?\b|\bwhat am i (?:good|suited) (?:at|for)\b/i,
]

const OUTCOME_PATTERNS = [
    // The blank cheque of fortune questions: "what will my future be",
    // "อนาคตจะเป็นยังไง", "ดวงชะตาฉันเป็นไง" — a general reading of where
    // things are heading, asked now.
    /อนาคต|ชะตา|ดวง(?:ของ)?(?:ฉัน|ผม|หนู|เรา|กู)|ดูดวง|เปิดดวง|\b(?:my|the|our) future\b|\bfortune\b|\bwhat lies ahead\b|\bread (?:me|my)\b|\bdestiny\b/i,
    /จะ(?:เป็น|ออกมา|ลงเอย)(?:ยังไง|อย่างไร|ไง|แบบไหน)/,
    /จะ(?:ได้|สำเร็จ|รอด|ผ่าน|กลับมา|ติด|ผ่านไหม)/,
    /(?:ควร|น่า)(?:จะ)?(?:ทำ|ไป|ลาออก|ย้าย|บอก|ทัก|ลงทุน|ซื้อ|ขาย)(?:.{0,12})?(?:ไหม|มั้ย|ดีไหม|หรือเปล่า)/,
    /(?:ไหม|มั้ย|หรือเปล่า|รึเปล่า)\s*$/,
    /เขา(?:คิด|รู้สึก|รัก|สนใจ)(?:ยังไง|อย่างไร|ไหม|มั้ย)?/,
    /ถ้า.{0,40}(?:จะ|แล้ว)/,
    /จะเกิดอะไร|มีอะไรเกิด|อะไรจะเกิด/,
    /\bshould i\b|\bwill (?:i|he|she|they|it|we)\b|\bwhat if i\b|\bis it worth\b|\bdoes (?:he|she|they)\b/i,
    /\bwhat (?:will|would|is going to|'s going to|are going to|could|might|should)\b|\bwhat happens\b|\bhow (?:will|would|does) it go\b|\bwhat to expect\b/i,
]

const TAROT_PATTERNS = [
    /จั่วไพ่|เปิดไพ่|ไพ่ทาโรต์|ดูไพ่|สับไพ่/,
    /\btarot\b|\b(?:draw|pull|flip)\b[^.!?]{0,14}\bcards?\b/i,
]

/** Questions about the product, not about the person's life. */
const PASSTHROUGH_PATTERNS = [
    /ราคา|กี่บาท|สมัครสมาชิก|แพ็กเกจ|ยกเลิก(?:สมาชิก|บริการ)|คืนเงิน|เติมดาว|ดวงดาว(?:หมด|เหลือ)|บัญชี|เข้าสู่ระบบ|ลืมรหัส|ติดต่อ(?:ทีม|ฝ่าย)/,
    /\bpricing\b|\bprice\b|\bhow much\b|\bsubscri|\brefund\b|\bcancel my\b|\bsign ?in\b|\blog ?in\b|\bmy account\b|\bsupport team\b|\bstars? (?:balance|left|run out)\b/i,
]

const TOPIC_PATTERNS: [AstraTopic, RegExp][] = [
    [
        "career",
        /งาน|อาชีพ|ลาออก|เปลี่ยนงาน|เลื่อนตำแหน่ง|หัวหน้า|เจ้านาย|บริษัท|ธุรกิจ|ค้าขาย|ลูกค้า|โปรเจกต์|เปิดตัว|ปล่อย(?:เวอร์ชัน|ของ)|สัมภาษณ์|ประชุม|อีเวนต์|ดีล|พรีเซ้นต์|\bjob\b|\bwork\b|career|resign|promotion|business|boss|launch|client|interview|meeting|event|conference|pitch|deal\b|deadline|project/i,
    ],
    [
        "love",
        /รัก|แฟน|คนคุย|จีบ|คบ|เลิก|คืนดี|แต่งงาน|หย่า|เนื้อคู่|นอกใจ|แอบชอบ|เขาคิด|love|relationship|marriage|divorce|dating|crush|breakup|ex\b/i,
    ],
    [
        "money",
        /เงิน|การเงิน|หนี้|กู้|ลงทุน|หุ้น|คริปโต|รายได้|เงินเดือน|รวย|money|finance|debt|loan|invest|stock|crypto|salary|income/i,
    ],
    [
        "health",
        /สุขภาพ|ป่วย|โรค|ผ่าตัด|รักษา|หมอ|โรงพยาบาล|ยา|เครียด|ซึมเศร้า|health|sick|illness|surgery|treatment|doctor|hospital|depress|anxiety/i,
    ],
    [
        "travel",
        /เดินทาง|ย้าย(?:บ้าน|ประเทศ|ที่)|ต่างประเทศ|วีซ่า|เที่ยว|ย้ายงานไปต่าง|travel|move|relocat|abroad|visa|trip|flight/i,
    ],
    [
        "study",
        /เรียน|สอบ|มหาลัย|มหาวิทยาลัย|ปริญญา|ทุน|วิทยานิพนธ์|study|exam|university|degree|scholarship|thesis|school/i,
    ],
    [
        "family",
        /ครอบครัว|พ่อ|แม่|ลูก|พี่|น้อง|ญาติ|บ้าน|ท้อง|ตั้งครรภ์|family|parent|mother|father|child|sibling|pregnan/i,
    ],
]

const GUARDRAIL_PATTERNS: [AstraGuardrail, RegExp][] = [
    [
        "life",
        /ฆ่าตัวตาย|อยากตาย|ไม่อยากอยู่|ทำร้ายตัวเอง|จะตาย|เสียชีวิต|suicide|kill myself|end my life|want to die|self[- ]harm/i,
    ],
    [
        "pregnancy",
        /ท้อง|ตั้งครรภ์|แท้ง|มีลูก|ผสมเทียม|เด็กหลอดแก้ว|pregnan|miscarriage|fertility|ivf|conceive/i,
    ],
    [
        "health",
        /มะเร็ง|เนื้องอก|ผ่าตัด|โรค|ป่วยหนัก|เคมีบำบัด|ยา(?:รักษา)?|จะหายไหม|cancer|tumou?r|surgery|diagnos|chemo|medication|will .{0,20}recover/i,
    ],
    [
        "legal",
        /คดี|ฟ้อง|ศาล|ทนาย|ตำรวจ|ติดคุก|สัญญา(?:ผูกมัด)?|ลิขสิทธิ์|lawsuit|court|lawyer|police|prison|sue|legal/i,
    ],
    [
        "money",
        /หนี้|กู้|จำนอง|ล้มละลาย|ลงทุน|หุ้น|คริปโต|ยืมเงิน|debt|loan|mortgage|bankrupt|invest|stock|crypto/i,
    ],
]

function matchesAny(patterns: RegExp[], text: string): boolean {
    return patterns.some((pattern) => pattern.test(text))
}

/**
 * Filler: a greeting, an acknowledgement, a laugh. There is nothing in it to
 * read, so she asks back. This is the ONLY road to "unsure" — anything with
 * something in it is a question she takes.
 */
const FILLER_PATTERNS = [
    /^(?:ok(?:ay)?|k+|yep|yeah|yes|no|sure|thanks?|thank you|hi|hey|hello|cool|nice|lol+|hm+|hmm+|uh+|\?+|\.+)$/i,
    /^(?:อืม+|เออ+|ครับ|คร้าบ|ค่ะ|คะ|จ้า|จ้าา|555+|ๆ+|ใช่|ไม่|โอเค|ok?ครับ|สวัสดี|หวัดดี|ขอบคุณ|ขอบใจ)$/,
]

function isContentless(question: string): boolean {
    const bare = question.replace(/[\s.,!?…ๆฯ"'“”‘’()[\]]+/g, "")
    if (bare.length < 3) return true
    return FILLER_PATTERNS.some((pattern) => pattern.test(question.trim()))
}

export function detectTopic(question: string): AstraTopic {
    for (const [topic, pattern] of TOPIC_PATTERNS) {
        if (pattern.test(question)) return topic
    }
    return "general"
}

export function detectGuardrail(question: string): AstraGuardrail | null {
    for (const [guardrail, pattern] of GUARDRAIL_PATTERNS) {
        if (pattern.test(question)) return guardrail
    }
    return null
}

/**
 * Routes a question. Order matters: a request for a date beats the timing
 * words inside it ("ควรเปิดร้านวันไหนดี" is a date question, not a when-will
 * question), and an explicit tarot request always wins.
 */
export function classifyQuestion(rawQuestion: string): IntentResult {
    const question = rawQuestion.trim()
    if (!question) return { kind: "unsure" }

    if (matchesAny(TAROT_PATTERNS, question)) return { kind: "tarot" }
    if (matchesAny(PASSTHROUGH_PATTERNS, question)) {
        return { kind: "passthrough" }
    }

    const topic = detectTopic(question)
    const guardrail = detectGuardrail(question)
    const reading = (intent: AstraIntent): IntentResult => ({
        kind: "reading",
        intent,
        topic,
        guardrail,
    })

    if (matchesAny(AUSPICIOUS_PATTERNS, question)) {
        return reading("AUSPICIOUS_DATE")
    }
    if (matchesAny(TIMING_PATTERNS, question)) return reading("TIMING")
    // A forward-looking phrasing wins over a chart noun: "ดวงฉันจะเป็นยังไงต่อ"
    // asks where things are heading, not what kind of person they are.
    if (matchesAny(OUTCOME_PATTERNS, question)) return reading("OUTCOME")
    if (matchesAny(IDENTITY_PATTERNS, question)) return reading("IDENTITY")

    // Everything else she answers from the chart of the moment it was asked,
    // which is what ยามถาม is for. The patterns above only decide WHICH craft
    // takes the question; they are not a list of questions she is allowed to
    // hear. A fortune teller who says "I did not catch that" to "tomorrow I
    // go to the tech event, what would happen?" is not a fortune teller.
    if (isContentless(question)) return { kind: "unsure" }
    return reading("OUTCOME")
}
