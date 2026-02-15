import type { CardUiText } from "./types"

export const normalizeLocale = (
    value: string | null | undefined,
): "en" | "th" => (value && value.startsWith("th") ? "th" : "en")

export const isPickForMeIntent = (value: string): boolean => {
    const text = value.trim()
    if (!text) return false

    const normalized = text.toLowerCase().replace(/\s+/g, " ")
    if (/(pick|choose|select).*(for me|me)\b/.test(normalized)) return true
    if (/\b(ai|you)\b.*(pick|choose|select)\b/.test(normalized)) return true
    if (/\b(random|surprise)\b.*\b(card|tarot)\b/.test(normalized)) return true

    if (/เลือกไพ่ให้|เลือกให้หน่อย|ช่วยเลือกไพ่|สุ่มไพ่|เลือกแทน/.test(text))
        return true

    return false
}

export const CARD_UI_TEXT: Record<"en" | "th", CardUiText> = {
    en: {
        selected: (selectedCount: number, cardsToSelect: number) =>
            `You have selected ${selectedCount}/${cardsToSelect} cards`,
        consumeStar: "Drawing cards will consume 5 stars",
        shuffle: "Shuffle",
        pick: "Pick me",
        swipe: "Swipe up on a card to select",
        drawCta: (cardsToSelect: number) =>
            `Scroll to draw card section ${cardsToSelect} cards`,
        pickAllCta: () => `Pick all for me`,
        topUpCta: (cardsToSelect: number) =>
            `Top up to draw ${cardsToSelect} cards`,
        pickAllPlaceholder: "Pick all cards for me",
    },
    th: {
        selected: (selectedCount: number, cardsToSelect: number) =>
            `คุณเลือกไพ่แล้ว ${selectedCount}/${cardsToSelect} ใบ`,
        consumeStar: "การจั่วไพ่จะใช้ดวงดาว 5 ดวง",
        shuffle: "สับไพ่",
        pick: "เลือกให้หน่อย",
        swipe: "ปัดขึ้นบนไพ่เพื่อเลือก",
        drawCta: (cardsToSelect: number) =>
            `เลื่อนไปที่ส่วนจั่วไพ่ ${cardsToSelect} ใบ`,
        pickAllCta: () => "เลือกให้หน่อย",
        topUpCta: (cardsToSelect: number) =>
            `เติมดาวเพื่อจั่วไพ่ ${cardsToSelect} ใบ`,
        pickAllPlaceholder: "เลือกไพ่ทั้งหมดให้หน่อย",
    },
}
