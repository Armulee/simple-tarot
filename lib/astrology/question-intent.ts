export function isBirthChartSuitabilityQuestion(question: string) {
    return /(birth chart|suitable for|life purpose|career path|พรสวรรค์|เหมาะกับ|ดวงกำเนิด)/i.test(
        question
    )
}
