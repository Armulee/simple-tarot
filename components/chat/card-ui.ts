import type { CardUiText } from "./types"

export const normalizeLocale = (
    value: string | null | undefined,
): "en" | "th" | "lo" =>
    value?.startsWith("lo") ? "lo" : value?.startsWith("th") ? "th" : "en"

export const isPickForMeIntent = (value: string): boolean => {
    const text = value.trim()
    if (!text) return false

    const normalized = text.toLowerCase().replace(/\s+/g, " ")
    if (/(pick|choose|select).*(for me|me)\b/.test(normalized)) return true
    if (/\b(ai|you)\b.*(pick|choose|select)\b/.test(normalized)) return true
    if (/\b(random|surprise)\b.*\b(card|tarot)\b/.test(normalized)) return true

    if (/เลือกไพ่ให้|เลือกให้หน่อย|ช่วยเลือกไพ่|สุ่มไพ่|เลือกแทน/.test(text))
        return true

    if (/ເລືອກໄພ່ໃຫ້|ເລືອກໃຫ້ໜ່ອຍ|ຊ່ວຍເລືອກໄພ່|ສຸ່ມໄພ່|ເລືອກແທນ/.test(text))
        return true

    return false
}

export const CARD_UI_TEXT: Record<"en" | "th" | "lo", CardUiText> = {
    en: {
        selected: (selectedCount: number, cardsToSelect: number) =>
            `You have selected ${selectedCount}/${cardsToSelect} cards`,
        consumeStar: "Drawing cards will consume 1 star",
        shuffle: "Shuffle",
        pick: "Pick me",
        cardCount: (cardsToSelect: number) =>
            `Cards to draw: ${cardsToSelect}`,
        decreaseCardCount: "Decrease card count",
        increaseCardCount: "Increase card count",
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
        consumeStar: "การจั่วไพ่จะใช้ดวงดาว 1 ดวง",
        shuffle: "สับไพ่",
        pick: "เลือกให้หน่อย",
        cardCount: (cardsToSelect: number) =>
            `จำนวนไพ่ที่ต้องการจั่ว: ${cardsToSelect}`,
        decreaseCardCount: "ลดจำนวนไพ่",
        increaseCardCount: "เพิ่มจำนวนไพ่",
        swipe: "ปัดขึ้นบนไพ่เพื่อเลือก",
        drawCta: (cardsToSelect: number) =>
            `เลื่อนไปที่ส่วนจั่วไพ่ ${cardsToSelect} ใบ`,
        pickAllCta: () => "เลือกให้หน่อย",
        topUpCta: (cardsToSelect: number) =>
            `เติมดาวเพื่อจั่วไพ่ ${cardsToSelect} ใบ`,
        pickAllPlaceholder: "เลือกไพ่ทั้งหมดให้หน่อย",
    },
    lo: {
        selected: (selectedCount: number, cardsToSelect: number) =>
            `ທ່ານເລືອກໄພ່ແລ້ວ ${selectedCount}/${cardsToSelect} ໃບ`,
        consumeStar: "ການຈັ່ວໄພ່ຈະໃຊ້ດວງດາວ 1 ດວງ",
        shuffle: "ສັບໄພ່",
        pick: "ເລືອກໃຫ້ໜ່ອຍ",
        cardCount: (cardsToSelect: number) =>
            `ຈໍານວນໄພ່ທີ່ຈະຈັ່ວ: ${cardsToSelect}`,
        decreaseCardCount: "ຫຼຸດຈໍານວນໄພ່",
        increaseCardCount: "ເພີ່ມຈໍານວນໄພ່",
        swipe: "ປັດຂຶ້ນເທິງໄພ່ເພື່ອເລືອກ",
        drawCta: (cardsToSelect: number) =>
            `ເລື່ອນໄປທີ່ສ່ວນຈັ່ວໄພ່ ${cardsToSelect} ໃບ`,
        pickAllCta: () => "ເລືອກໃຫ້ໜ່ອຍ",
        topUpCta: (cardsToSelect: number) =>
            `ເຕີມດາວເພື່ອຈັ່ວໄພ່ ${cardsToSelect} ໃບ`,
        pickAllPlaceholder: "ເລືອກໄພ່ທັງໝົດໃຫ້ໜ່ອຍ",
    },
}
