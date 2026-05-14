/**
 * Domain → hex color map for the relevance breakdown UI.
 *
 * Color is resolved client-side rather than returned by the AI so the model
 * can never produce an off-palette hex string. Labels arrive in either
 * English or Thai depending on the user's question language.
 */
export const RELEVANCE_COLOR_BY_DOMAIN = {
    career: "#9D6FFF",
    finance: "#E8B44C",
    love: "#FF6B9D",
    family: "#FF8C6B",
    health: "#5EC4C4",
    relationships: "#C87ED4",
    education: "#64A0F0",
    travel: "#4CE88A",
    luck: "#E8DC6C",
    spirituality: "#A78BFA",
    reputation: "#94A3B8",
    caution: "#E8604C",
} as const

type Domain = keyof typeof RELEVANCE_COLOR_BY_DOMAIN

const ENGLISH_ALIASES: Record<string, Domain> = {
    career: "career",
    work: "career",
    job: "career",
    finance: "finance",
    money: "finance",
    financial: "finance",
    love: "love",
    romance: "love",
    family: "family",
    health: "health",
    wellness: "health",
    relationships: "relationships",
    relationship: "relationships",
    social: "relationships",
    education: "education",
    learning: "education",
    study: "education",
    travel: "travel",
    luck: "luck",
    fortune: "luck",
    spirituality: "spirituality",
    spiritual: "spirituality",
    reputation: "reputation",
    fame: "reputation",
    caution: "caution",
    warning: "caution",
}

const THAI_ALIASES: Record<string, Domain> = {
    การงาน: "career",
    อาชีพ: "career",
    งาน: "career",
    การเงิน: "finance",
    เงิน: "finance",
    ความรัก: "love",
    รัก: "love",
    ครอบครัว: "family",
    สุขภาพ: "health",
    ความสัมพันธ์: "relationships",
    การศึกษา: "education",
    การเรียน: "education",
    การเดินทาง: "travel",
    โชคลาภ: "luck",
    โชค: "luck",
    จิตวิญญาณ: "spirituality",
    ชื่อเสียง: "reputation",
    คำเตือน: "caution",
    ข้อควรระวัง: "caution",
}

const FALLBACK_COLOR = "#94A3B8"

export function resolveRelevanceColor(label: string): string {
    if (!label) return FALLBACK_COLOR
    const trimmed = label.trim()
    const lower = trimmed.toLowerCase()
    const domain =
        ENGLISH_ALIASES[lower] ??
        THAI_ALIASES[trimmed] ??
        (lower in RELEVANCE_COLOR_BY_DOMAIN ? (lower as Domain) : null)
    return domain ? RELEVANCE_COLOR_BY_DOMAIN[domain] : FALLBACK_COLOR
}
