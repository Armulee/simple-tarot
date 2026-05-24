"use client"

import { createElement, useLayoutEffect, useState, type ReactNode } from "react"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import {
    sanitizeDetailedHtml,
    type DetailedHtmlStripCardSource,
} from "@/lib/tarot/sanitize-html"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

/** Mirrors allowed tags in `lib/tarot/sanitize-html.ts` (excluding `br`). */
type DetailedHtmlBlockTag =
    | "p"
    | "strong"
    | "em"
    | "b"
    | "i"
    | "ul"
    | "ol"
    | "li"
    | "span"

const BLOCK_TAGS: readonly DetailedHtmlBlockTag[] = [
    "p",
    "strong",
    "em",
    "b",
    "i",
    "ul",
    "ol",
    "li",
    "span",
]

function isDetailedHtmlBlockTag(s: string): s is DetailedHtmlBlockTag {
    return (BLOCK_TAGS as readonly string[]).includes(s)
}

function createDetailedHtmlBlockElement(
    tag: DetailedHtmlBlockTag,
    props: {
        key: string
        className?: string
        children?: ReactNode | ReactNode[]
    },
): ReactNode {
    switch (tag) {
        case "p":
            return createElement("p", props)
        case "strong":
            return createElement("strong", props)
        case "em":
            return createElement("em", props)
        case "b":
            return createElement("b", props)
        case "i":
            return createElement("i", props)
        case "ul":
            return createElement("ul", props)
        case "ol":
            return createElement("ol", props)
        case "li":
            return createElement("li", props)
        case "span":
            return createElement("span", props)
    }
}

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
        if (tag === "br") {
            out.push(createElement("br", { key }))
            return
        }
        if (!isDetailedHtmlBlockTag(tag)) {
            out.push(...childNodesToReact(el, aliases, key))
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
        out.push(createDetailedHtmlBlockElement(tag, props))
    })
    return out
}

type PrivacyDetailedHtmlProps = {
    html: string | null | undefined
    aliases: PromptAliasEntry[]
    className?: string
    /**
     * Spread cards for this reading — their display names are stripped from
     * the HTML so the "Detailed" block never echoes tarot titles the model
     * should have avoided.
     */
    stripCardLabelsFrom?: ReadonlyArray<DetailedHtmlStripCardSource> | null
    /** Additional strings to strip (e.g. `perCard[].cardName`). */
    extraStripLabels?: readonly string[] | null
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
    stripCardLabelsFrom,
    extraStripLabels,
}: PrivacyDetailedHtmlProps) {
    const safe = sanitizeDetailedHtml(html, {
        stripCardLabelsFrom: stripCardLabelsFrom ?? undefined,
        extraStripLabels: extraStripLabels?.length
            ? extraStripLabels
            : undefined,
    })
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
