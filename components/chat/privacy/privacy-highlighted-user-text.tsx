"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Lock } from "lucide-react"
import { useTranslations } from "next-intl"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { renderInlineBoldMarkdown } from "@/components/chat/render-inline-bold-markdown"
import {
    PROMPT_PLACEHOLDER_PATTERN,
    applyAliasesToText,
    unmaskTextWithAliases,
    type PromptAliasEntry,
} from "@/lib/privacy/prompt-redaction"

type Segment =
    | { kind: "text"; value: string }
    | { kind: "redacted"; value: string; alias: PromptAliasEntry; key: string }

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Walk `displayText` and split it into plain-text and redacted segments.
 * `aliases` must match the session map built by `assignAliases` in
 * `lib/privacy/sanitize-client.ts` (NLP from `/api/sanitize-pii` + the same
 * `collectRegexRedactionItems` rules as defence-in-depth). Aliases are
 * processed longest-first so multi-word originals like `"Jessica Howard"` win
 * over single-word `"Jessica"`.
 */
function tokenizeDisplayText(
    displayText: string,
    aliases: PromptAliasEntry[],
): Segment[] {
    if (!displayText || !aliases.length) {
        return [{ kind: "text", value: displayText }]
    }
    const sorted = [...aliases]
        .filter((a) => a.original && displayText.includes(a.original))
        .sort((a, b) => b.original.length - a.original.length)
    if (!sorted.length) {
        return [{ kind: "text", value: displayText }]
    }

    let segments: Segment[] = [{ kind: "text", value: displayText }]
    let counter = 0
    for (const alias of sorted) {
        const re = new RegExp(`(${escapeRegExp(alias.original)})`, "g")
        segments = segments.flatMap((seg) => {
            if (seg.kind !== "text") return [seg]
            if (!seg.value) return [seg]
            const parts = seg.value.split(re)
            return parts
                .map<Segment | null>((part) => {
                    if (!part) return null
                    if (part === alias.original) {
                        counter += 1
                        return {
                            kind: "redacted",
                            value: part,
                            alias,
                            key: `r-${counter}`,
                        }
                    }
                    return { kind: "text", value: part }
                })
                .filter((s): s is Segment => s !== null)
        })
    }
    return segments
}

type MaskedFragment =
    | { kind: "text"; value: string }
    | { kind: "placeholder"; value: string }

/**
 * Split the masked string into plain runs and privacy tokens. Uses the same
 * bracket pattern as `lib/privacy/prompt-redaction` so both NLP + regex paths
 * match: `[Person_0]`, `[Email_1]`, `[ID_0]`, and legacy non-indexed
 * `[Phone]`, `[NationalId]` / `[NationalId_N]` from older passes.
 */
function tokenizeSanitizedText(sanitizedText: string): MaskedFragment[] {
    if (!sanitizedText) return [{ kind: "text", value: "" }]
    const result: MaskedFragment[] = []
    const re = new RegExp(PROMPT_PLACEHOLDER_PATTERN.source, "g")
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(sanitizedText)) !== null) {
        if (match.index > lastIndex) {
            result.push({
                kind: "text",
                value: sanitizedText.slice(lastIndex, match.index),
            })
        }
        result.push({ kind: "placeholder", value: match[0] })
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < sanitizedText.length) {
        result.push({ kind: "text", value: sanitizedText.slice(lastIndex) })
    }
    return result.length ? result : [{ kind: "text", value: sanitizedText }]
}

const HOVER_CLOSE_MS = 220

type RedactedSegment = Extract<Segment, { kind: "redacted" }>

function PrivacyRedactionChip({
    segment,
    maskedFragments,
}: {
    segment: RedactedSegment
    maskedFragments: MaskedFragment[]
}) {
    const t = useTranslations("Home")
    const tType = useTranslations("Home.privacyHighlightedType")
    const [open, setOpen] = useState(false)
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clearCloseTimer = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current)
            closeTimerRef.current = null
        }
    }, [])

    const scheduleClose = useCallback(() => {
        clearCloseTimer()
        closeTimerRef.current = setTimeout(
            () => setOpen(false),
            HOVER_CLOSE_MS,
        )
    }, [clearCloseTimer])

    useEffect(() => () => clearCloseTimer(), [clearCloseTimer])

    const show = useCallback(() => {
        clearCloseTimer()
        setOpen(true)
    }, [clearCloseTimer])

    const aria = t("privacyHighlightedAriaLabel", {
        type: tType(segment.alias.type),
        value: segment.value,
    })

    const onKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLSpanElement>) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                show()
            }
        },
        [show],
    )

    return (
        <Popover
            modal={false}
            open={open}
            onOpenChange={(next) => {
                clearCloseTimer()
                setOpen(next)
            }}
        >
            <PopoverAnchor asChild>
                <span
                    role='button'
                    tabIndex={0}
                    aria-label={aria}
                    onMouseEnter={show}
                    onMouseLeave={scheduleClose}
                    onKeyDown={onKeyDown}
                    onClick={(e) => {
                        e.stopPropagation()
                        show()
                    }}
                    className='inline-flex items-start text-left gap-1 rounded-md px-1.5 py-0.5 mx-0.5 align-baseline bg-emerald-400/15 text-emerald-50 border border-emerald-400/30 hover:bg-emerald-400/25 hover:border-emerald-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 transition-colors cursor-default shadow-[0_0_0_1px_rgba(52,211,153,0.05)]'
                >
                    <Lock
                        className='h-3 w-3 shrink-0 text-emerald-300'
                        aria-hidden
                    />
                    <span className='leading-none'>{segment.value}</span>
                </span>
            </PopoverAnchor>
            <PopoverContent
                side='top'
                sideOffset={8}
                collisionPadding={12}
                className='max-w-xs border border-emerald-300/25 bg-[#0f0e18]/95 px-3 py-2 text-xs leading-relaxed text-white shadow-xl backdrop-blur-xl'
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleClose}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <p className='mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-300/90'>
                    <Lock className='h-3 w-3' aria-hidden />
                    {t("privacyHighlightedTooltipTitle")}
                </p>
                <p className='text-white/90'>
                    {maskedFragments.map((frag, i) =>
                        frag.kind === "placeholder" ? (
                            <span
                                key={`m-${i}`}
                                className='inline-flex items-center rounded bg-emerald-400/20 px-1 py-0.5 text-[11px] font-medium text-emerald-200 border border-emerald-400/30 mx-0.5 align-baseline'
                            >
                                {frag.value}
                            </span>
                        ) : (
                            <Fragment key={`m-${i}`}>{frag.value}</Fragment>
                        ),
                    )}
                </p>
                <PopoverPrimitive.Arrow
                    width={10}
                    height={6}
                    className='fill-[#0f0e18]'
                />
            </PopoverContent>
        </Popover>
    )
}

type PrivacyHighlightedTextProps = {
    /** Raw text that may contain `[Type_N]` placeholders, originals, or both. */
    text: string
    aliases: PromptAliasEntry[]
    /** Render `**bold**` markdown in plain-text segments. Defaults to false. */
    supportMarkdown?: boolean
}

/**
 * Generic privacy-aware text renderer used for both user prompts and AI
 * responses. Resolves any `[Type_N]` tokens to the originals (so the user
 * sees real names), highlights every redacted span as an emerald lock chip,
 * and reveals the masked sentence (placeholder form) on hover.
 */
export function PrivacyHighlightedText({
    text,
    aliases,
    supportMarkdown = false,
}: PrivacyHighlightedTextProps) {
    const displayText = useMemo(
        () => unmaskTextWithAliases(text, aliases),
        [text, aliases],
    )
    const sanitizedText = useMemo(
        () => applyAliasesToText(displayText, aliases),
        [displayText, aliases],
    )
    const segments = useMemo(
        () => tokenizeDisplayText(displayText, aliases),
        [displayText, aliases],
    )
    const maskedFragments = useMemo(
        () => tokenizeSanitizedText(sanitizedText),
        [sanitizedText],
    )

    return (
        <span className='break-words'>
            {segments.map((segment, idx) => {
                if (segment.kind === "text") {
                    if (supportMarkdown) {
                        return (
                            <Fragment key={`t-${idx}`}>
                                {renderInlineBoldMarkdown(segment.value)}
                            </Fragment>
                        )
                    }
                    return (
                        <Fragment key={`t-${idx}`}>{segment.value}</Fragment>
                    )
                }
                return (
                    <PrivacyRedactionChip
                        key={segment.key}
                        segment={segment}
                        maskedFragments={maskedFragments}
                    />
                )
            })}
        </span>
    )
}

type PrivacyHighlightedUserTextProps = {
    displayText: string
    sanitizedText: string
    aliases: PromptAliasEntry[]
}

/**
 * Backwards-compatible wrapper used by user-message bubbles where the caller
 * already has `displayText` (raw, with originals) on hand. We forward the
 * `displayText` so the generic component skips its `unmaskTextWithAliases`
 * pass and uses the value as-is.
 */
export function PrivacyHighlightedUserText({
    displayText,
    aliases,
}: PrivacyHighlightedUserTextProps) {
    return (
        <PrivacyHighlightedText
            text={displayText}
            aliases={aliases}
            supportMarkdown={false}
        />
    )
}

export default PrivacyHighlightedUserText
