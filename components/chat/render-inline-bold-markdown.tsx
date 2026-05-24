import { type ReactNode } from "react"

export function renderInlineBoldMarkdown(text: string): ReactNode[] {
    if (!text.includes("**")) return [text]

    const nodes: ReactNode[] = []
    let cursor = 0
    let key = 0

    while (cursor < text.length) {
        const open = text.indexOf("**", cursor)
        if (open === -1) {
            nodes.push(text.slice(cursor))
            break
        }

        const close = text.indexOf("**", open + 2)
        if (close === -1) {
            nodes.push(text.slice(cursor))
            break
        }

        if (open > cursor) {
            nodes.push(text.slice(cursor, open))
        }

        const boldText = text.slice(open + 2, close)
        if (boldText.trim().length === 0) {
            nodes.push("**" + boldText + "**")
        } else {
            nodes.push(<strong key={`bold-${key++}`}>{boldText}</strong>)
        }

        cursor = close + 2
    }

    return nodes
}
