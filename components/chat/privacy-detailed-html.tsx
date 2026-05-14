"use client"

import {
    createElement,
    useLayoutEffect,
    useState,
    type ReactNode,
} from "react"
import { PrivacyHighlightedText } from "@/components/chat/privacy-highlighted-user-text"
import { sanitizeDetailedHtml } from "@/lib/tarot/sanitize-html"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

const VOID_TAGS = new Set(["br"])

function childNodesToReact(
    parent: ParentNode,
    aliases: PromptAliasEntry[],
    path: string,
): ReactNode[] {
    const out: ReactNode[] = []
    parent.childNodes.forEach((node, idx) => {
        const key = `${path}.${idx}`
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent ?? ""
            if (!text) return
            out.push(
                createElement(PrivacyHighlightedText, {
                    key,
                    text,
                    aliases,
                    supportMarkdown: false,
                }),
            )
            return
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return
        const el = node as HTMLElement
        const tag = el.tagName.toLowerCase()
        if (VOID_TAGS.has(tag)) {
            out.push(createElement(tag, { key }))
            return
        }
        const inner = childNodesToReact(el, aliases, key)
        const props: {
            key: string
            className?: string
            children?: ReactNode | ReactNode[]
        } = { key }
        if (tag === "span" && el.classList.contains("highlight-gold")) {
            props.className = "highlight-gold"
        }
        if (inner.length > 0) {
            props.children = inner
        }
        out.push(
            createElement(tag as keyof JSX.IntrinsicElements, props),
        )
    })
    return out
}

type PrivacyDetailedHtmlProps = {
    html: string | null | undefined
    aliases: PromptAliasEntry[]
    className?: string
}

/**
 * Renders AI `detailedHtml` like `dangerouslySetInnerHTML` would, but runs each
 * text node through {@link PrivacyHighlightedText} so `[Person_0]`-style
 * tokens become the same emerald lock chips as the rest of the tarot UI.
 *
 * Uses `DOMParser` after {@link sanitizeDetailedHtml}; parsing runs in
 * `useLayoutEffect` so the first painted frame matches SSR (empty shell) then
 * updates before paint on the client.
 */
export function PrivacyDetailedHtml({
    html,
    aliases,
    className,
}: PrivacyDetailedHtmlProps) {
    const safe = sanitizeDetailedHtml(html)
    const [nodes, setNodes] = useState<ReactNode[] | null>(null)

    useLayoutEffect(() => {
        if (!safe) {
            setNodes(null)
            return
        }
        const wrapped = `<div id="privacy-detailed-html-root">${safe}</div>`
        const doc = new DOMParser().parseFromString(wrapped, "text/html")
        const root = doc.getElementById("privacy-detailed-html-root")
        if (!root) {
            setNodes(null)
            return
        }
        setNodes(childNodesToReact(root, aliases, "dh"))
    }, [safe, aliases])

    if (!safe) return null

    return (
        <div className={className}>
            {nodes !== null && nodes.length > 0 ? nodes : null}
        </div>
    )
}
