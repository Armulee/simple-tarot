"use client"

import { Fragment } from "react"
import { UserRound } from "lucide-react"
import {
    findMentionRanges,
    splitIntoMentionSegments,
} from "@/lib/chat/character-mentions"
import type { Character } from "@/types/character"

/**
 * Renders plain text with any @character mentions shown as inline pink pills
 * (user icon + name) — the read-only counterpart to the composer's mention
 * highlight, used in sent user-message bubbles.
 */
export function CharacterMentionText({
    text,
    characters,
}: {
    text: string
    characters: Character[]
}) {
    const ranges = findMentionRanges(text, characters)
    if (ranges.length === 0) return <>{text}</>
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
                ) : (
                    <Fragment key={i}>{seg.text}</Fragment>
                ),
            )}
        </>
    )
}

export default CharacterMentionText
