"use client"

import { PrivacyHighlightedText } from "@/components/chat/privacy/privacy-highlighted-user-text"
import { PrivacyDetailedHtml } from "@/components/chat/privacy/privacy-detailed-html"
import { InterpretationHeaderBar } from "@/components/chat/interpretation-header-bar"
import ShareSection from "@/components/tarot/interpretation/share"
import InnerEnergyOrb from "@/components/chat/general/inner-energy-orb"
import type {
    GeneralReply,
    InnerEnergyShape,
} from "@/lib/chat/general-reply-schema"
import type { PromptAliasEntry } from "@/lib/privacy/prompt-redaction"

type InnerEnergyHeroProps = {
    reply: Partial<GeneralReply> | null | undefined
    privacyAliases?: PromptAliasEntry[]
    isLoading?: boolean
    /** Unmasked question + reflection text passed to the share section. */
    shareQuestion?: string
    shareInterpretation?: string
}

const DEFAULT_SHAPE: InnerEnergyShape = "fog"

/**
 * Hero card for the general (chat) reply strategy. Built to mirror the visual
 * footprint of the horoscope verdict-hero so the general strategy reads as a
 * peer of the other strategies instead of a weak text fallback. The verdict's
 * mood icon is replaced with a symbolic energy orb (vortex / eclipse / fog /
 * wave / flame / spiral / ember / tide), and the supporting copy is reframed
 * as an "inner energy reflection" rather than a daily horoscope.
 */
export default function InnerEnergyHero({
    reply,
    privacyAliases,
    isLoading = false,
    shareQuestion,
    shareInterpretation,
}: InnerEnergyHeroProps) {
    const aliases = privacyAliases ?? []
    const shape = (reply?.innerEnergy as InnerEnergyShape | undefined) ?? DEFAULT_SHAPE

    const heroTitle = (reply?.heroTitle ?? "").trim()
    const innerDirection = (reply?.innerDirection ?? "").trim()
    const reflectionHtml = (reply?.reflection ?? "").trim()

    const hasContent =
        heroTitle.length > 0 ||
        innerDirection.length > 0 ||
        reflectionHtml.length > 0

    const showLoadingShimmer = isLoading && !hasContent
    // The share section takes the slot the inner currents + whisper used to
    // occupy, once the reflection has streamed in.
    const showShare = !isLoading && reflectionHtml.length > 0

    return (
        <section className='relative overflow-hidden rounded-[28px] transition'>
            <div
                aria-hidden
                className='pointer-events-none absolute inset-x-0 top-0 mx-auto h-64 w-[36rem] max-w-full -translate-y-12 rounded-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(129,140,248,0.16),transparent_70%)] blur-3xl'
            />

            <div className='relative z-[1] flex flex-col gap-6 py-6 md:px-8 md:pt-10'>
                <div className='flex flex-col items-center gap-4 text-center'>
                    <InnerEnergyOrb shape={shape} />

                    {heroTitle.length > 0 ? (
                        <h2 className='max-w-[28ch] text-balance font-serif text-xl sm:text-2xl font-medium italic leading-[1.25] text-white'>
                            <PrivacyHighlightedText
                                text={heroTitle}
                                aliases={aliases}
                                supportMarkdown
                            />
                        </h2>
                    ) : showLoadingShimmer ? (
                        <div className='h-7 w-56 rounded-full bg-white/[0.06] animate-pulse' />
                    ) : null}

                    {innerDirection.length > 0 ? (
                        <div className='relative w-fit max-w-md rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.06] to-cyan-500/[0.05] py-2.5 pr-4 pl-5 shadow-[0_8px_28px_-12px_rgba(129,140,248,0.55)] animate-fade-in before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-transparent before:via-[#a78bfa]/70 before:to-transparent'>
                            <p className='text-[11px] font-serif font-semibold italic uppercase leading-relaxed tracking-[0.18em] text-indigo-200/80'>
                                <PrivacyHighlightedText
                                    text={innerDirection}
                                    aliases={aliases}
                                    supportMarkdown
                                />
                            </p>
                        </div>
                    ) : showLoadingShimmer ? (
                        <div className='h-6 w-72 rounded-full bg-white/[0.04] animate-pulse' />
                    ) : null}
                </div>

                <div className='w-full space-y-5 text-left text-white/90 leading-relaxed'>
                    <div className='w-full'>
                        <InterpretationHeaderBar
                            isLoading={isLoading}
                            showActions={!isLoading || hasContent}
                        />
                    </div>

                    {reflectionHtml.length > 0 ? (
                        <div className='rounded-2xl shadow-lg animate-fade-in text-white/90 leading-relaxed'>
                            <PrivacyDetailedHtml
                                html={reflectionHtml}
                                aliases={aliases}
                                className='tarot-detailed-html'
                            />
                        </div>
                    ) : showLoadingShimmer ? (
                        <div className='space-y-2'>
                            <div className='h-4 w-full rounded-full bg-white/[0.05] animate-pulse' />
                            <div className='h-4 w-11/12 rounded-full bg-white/[0.05] animate-pulse' />
                            <div className='h-4 w-9/12 rounded-full bg-white/[0.05] animate-pulse' />
                        </div>
                    ) : null}

                    {showShare && (
                        <div className='animate-fade-in'>
                            <ShareSection
                                variant='embedded'
                                question={shareQuestion}
                                interpretation={shareInterpretation}
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
