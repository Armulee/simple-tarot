export function chooseTarotSpread(question: string) {
    const q = question.trim()
    const wordCount = q.split(/\s+/).length

    if (wordCount <= 6) {
        return { spreadType: "simple", cardCount: 1 }
    }

    if (wordCount <= 15) {
        return { spreadType: "general", cardCount: 3 }
    }

    return { spreadType: "detailed", cardCount: 5 }
}
