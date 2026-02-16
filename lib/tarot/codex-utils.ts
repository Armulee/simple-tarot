export function cardNameToSlug(cardName: string): string {
    return cardName
        .toLowerCase()
        .replace(/\s*\(reversed\)/g, "")
        .replace(/\s*reversed/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
}
