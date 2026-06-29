"use client"

import { Fragment } from "react"
import { UserRound } from "lucide-react"
import {
    findMentionRanges,
    splitIntoMentionSegments,
} from "@/lib/chat/character-mentions"
import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import type { Character } from "@/types/character"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

/**
 * Read-only renderer for a sent user-message bubble. It is aware of BOTH
 * @character mentions and redacted PII:
 *
 * - "@CharacterName" spans always render as pink character pills and are
 *   never treated as PII — so a tagged character keeps its pill even when the
 *   message also contains redacted info (and even if the name happens to be in
 *   the session's redaction alias map).
 * - The remaining (non-mention) text is passed through the privacy highlighter
 *   when the message was redacted, so emails/phones/etc. still show as the
 *   emerald lock chip.
 */
export function UserMessageText({
    displayText,
    characters,
    aliases,
    privacyHighlight,
}: {
    displayText: string
    characters: Character[]
    aliases: PromptAliasEntry[]
    /** Apply emerald PII highlighting to the non-mention text segments. */
    privacyHighlight: boolean
}) {
    // The composer uses an em space as the mention's icon slot; normalize it.
    const text = displayText.split(String.fromCodePoint(0x2003)).join(" ")
    const ranges = findMentionRanges(text, characters)
    const segments = splitIntoMentionSegments(text, ranges)

    return (
        <>
            {segments.map((seg, i) =>
                seg.mention ? (
                    <span
                        key={i}
                        className='mx-0.5 inline-flex items-center gap-0.5 rounded bg-pink-500/30 px-1.5 py-0.5 align-baseline text-pink-50'
                    >
                        <UserRound
                            className='size-3 shrink-0 text-pink-200'
                            aria-hidden
                        />
                        {seg.text}
                    </span>
                ) : privacyHighlight ? (
                    <PrivacyHighlightedText
                        key={i}
                        text={seg.text}
                        aliases={aliases}
                    />
                ) : (
                    <Fragment key={i}>{seg.text}</Fragment>
                ),
            )}
        </>
    )
}

export default UserMessageText
