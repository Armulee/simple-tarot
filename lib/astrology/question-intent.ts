export function isBirthChartSuitabilityQuestion(question: string) {
    return /(birth chart|suitable for|life purpose|career path|พรสวรรค์|เหมาะกับ|ดวงกำเนิด)/i.test(
        question
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

export function classifyQuestionTopic(question: string): QuestionTopicResult {
    for (const rule of TOPIC_RULES) {
        if (rule.pattern.test(question)) {
            return { topic: rule.topic, relevantPlanets: rule.planets }
        }
    }
    return { topic: "general", relevantPlanets: ALL_PLANETS }
}
