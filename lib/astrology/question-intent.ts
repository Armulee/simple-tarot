import type { CalendarQueryIntent } from "@/lib/calendar-helper"

export function isBirthChartSuitabilityQuestion(question: string) {
    return /(birth chart|suitable for|life purpose|career path|พรสวรรค์|เหมาะกับ|ดวงกำเนิด)/i.test(
        question
    )
}

/**
 * Heuristic: detects when the user is explicitly asking about a placement,
 * sign, or feature of their *own* natal chart. When this is true and the
 * caller has stored chart data available, the answer is allowed to name
 * specific planets / signs / houses in plain language.
 */
export function isNatalChartReferenceQuestion(question: string) {
    return /(my (?:sun|moon|rising|ascendant|venus|mars|mercury|jupiter|saturn|rahu|ketu|neptune|uranus|pluto)|my (?:zodiac|sign|chart|birth chart|natal chart)|what(?:'s| is) my sign|ดวงของฉัน|ดวงของผม|ดวงของหนู|ราศีของฉัน|ราศีของผม|ลัคนาของฉัน|จันทร์ของฉัน|อาทิตย์ของฉัน|ดาวอะไรของ(?:ฉัน|ผม|หนู)|ดวงกำเนิดของ(?:ฉัน|ผม)|ดูดวงกำเนิด|chart ของฉัน|chart ของผม)/i.test(
        question,
    )
}

export type QuestionTopic =
    | "career"
    | "love"
    | "money"
    | "health"
    | "travel"
    | "education"
    | "family"
    | "general"

type TopicRule = {
    topic: QuestionTopic
    pattern: RegExp
    planets: readonly string[]
}

const TOPIC_RULES: TopicRule[] = [
    {
        topic: "career",
        pattern:
            /ลาออก|เปลี่ยนงาน|งาน|อาชีพ|เลื่อนตำแหน่ง|ตำแหน่ง|ธุรกิจ|ค้าขาย|หัวหน้า|เจ้านาย|สมัครงาน|ทำงาน|ใบเตือน|โดนไล่|career|job|work|resign|promotion|business|boss|fired|hired|employ/i,
        planets: ["Sun", "Mars", "Jupiter", "Saturn", "Uranus", "Pluto"],
    },
    {
        topic: "love",
        pattern:
            /ความรัก|รัก|แฟน|คนรัก|แต่งงาน|หย่า|เนื้อคู่|คู่ครอง|จีบ|คบ|เลิก|กัน|ชอบ|หึง|นอกใจ|love|relationship|marriage|divorce|partner|dating|crush|breakup|soulmate/i,
        planets: ["Venus", "Mars", "Moon", "Jupiter", "Neptune"],
    },
    {
        topic: "money",
        pattern:
            /เงิน|การเงิน|ลงทุน|หนี้|รายได้|เศรษฐกิจ|หุ้น|ค่าใช้จ่าย|รวย|จน|ทรัพย์|money|finance|invest|debt|income|wealth|stock|salary|rich|poor/i,
        planets: ["Venus", "Jupiter", "Saturn", "Pluto"],
    },
    {
        topic: "health",
        pattern:
            /สุขภาพ|ป่วย|โรค|ผ่าตัด|อุบัติเหตุ|ออกกำลังกาย|แพทย์|หมอ|รักษา|health|sick|illness|surgery|accident|hospital|doctor|disease/i,
        planets: ["Mars", "Saturn", "Sun", "Moon", "Neptune"],
    },
    {
        topic: "travel",
        pattern:
            /เดินทาง|ย้าย|ย้ายบ้าน|ย้ายประเทศ|ต่างประเทศ|ไปเที่ยว|วีซ่า|travel|move|relocate|abroad|immigration|visa|trip/i,
        planets: ["Jupiter", "Mercury", "Moon", "Uranus"],
    },
    {
        topic: "education",
        pattern:
            /เรียน|สอบ|มหาวิทยาลัย|ปริญญา|ทุน|เกรด|วิชา|study|exam|university|degree|scholarship|school|college|grade/i,
        planets: ["Mercury", "Jupiter", "Saturn"],
    },
    {
        topic: "family",
        pattern:
            /ครอบครัว|ลูก|พ่อ|แม่|พี่|น้อง|ท้อง|ตั้งครรภ์|บ้าน|family|child|parent|mother|father|sibling|pregnant|baby|home/i,
        planets: ["Moon", "Venus", "Saturn", "Jupiter"],
    },
]

const ALL_PLANETS = [
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
    "Uranus",
    "Neptune",
    "Pluto",
] as const

export type QuestionTopicResult = {
    topic: QuestionTopic
    relevantPlanets: readonly string[]
}

export type CalendarRecommendationIntent = {
    intent: CalendarQueryIntent
}

type CalendarIntentRule = {
    intent: CalendarQueryIntent
    actionPattern: RegExp
}

const CALENDAR_RECOMMENDATION_TRIGGER =
    /(best day|best date|which day|what day|when should i|good day to|auspicious day|lucky day|วันไหนดี|วันไหนดีที่สุด|วันไหนเหมาะ|วันไหนควร|ฤกษ์|ມື້ໃດດີ|ມື້ໃດຄວນ|ມື້ໃດເໝາະ)/i

const CALENDAR_INTENT_RULES: CalendarIntentRule[] = [
    {
        intent: "resignation",
        actionPattern:
            /(resign|quit my job|leave my job|hand in my notice|submit my notice|ลาออก|ยื่นใบลาออก|ออกจากงาน|ລາອອກ|ອອກຈາກວຽກ)/i,
    },
    {
        intent: "job_change",
        actionPattern:
            /(change jobs|switch jobs|new job|move jobs|เปลี่ยนงาน|ย้ายงาน|สมัครงาน|งานใหม่|ປ່ຽນວຽກ|ຍ້າຍວຽກ|ວຽກໃໝ່)/i,
    },
    {
        intent: "contract_sign",
        actionPattern:
            /(sign (?:the )?contract|sign papers|sign documents|เซ็นสัญญา|เซ็นเอกสาร|ทำสัญญา|ເຊັນສັນຍາ|ເຊັນເອກະສານ)/i,
    },
    {
        intent: "marriage",
        actionPattern:
            /(marry|wedding|engage|แต่งงาน|หมั้น|งานแต่ง|ແຕ່ງງານ|ງານແຕ່ງ|ຫມັ້ນ)/i,
    },
    {
        intent: "travel_long",
        actionPattern:
            /(travel|trip|fly|move abroad|go abroad|เดินทาง|เที่ยว|บิน|ย้ายประเทศ|ต่างประเทศ|ເດີນທາງ|ທ່ຽວ|ບິນ|ຍ້າຍປະເທດ|ຕ່າງປະເທດ)/i,
    },
    {
        intent: "major_purchase",
        actionPattern:
            /(buy (?:a|the)? ?(?:car|house|home)|make a big purchase|major purchase|ซื้อรถ|ซื้อบ้าน|ซื้อของชิ้นใหญ่|ซื้อของใหญ่|ຊື້ລົດ|ຊື້ເຮືອນ|ຊື້ຂອງຊິ້ນໃຫຍ່)/i,
    },
]

export function classifyQuestionTopic(question: string): QuestionTopicResult {
    for (const rule of TOPIC_RULES) {
        if (rule.pattern.test(question)) {
            return { topic: rule.topic, relevantPlanets: rule.planets }
        }
    }
    return { topic: "general", relevantPlanets: ALL_PLANETS }
}

export function detectCalendarRecommendationIntent(
    question: string,
): CalendarRecommendationIntent | null {
    if (!CALENDAR_RECOMMENDATION_TRIGGER.test(question)) return null

    for (const rule of CALENDAR_INTENT_RULES) {
        if (rule.actionPattern.test(question)) {
            return { intent: rule.intent }
        }
    }

    return null
}
