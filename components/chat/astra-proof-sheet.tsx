"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { proofRows, type ProofPart } from "@/lib/astra/proof"
import type { AstraReadingSource } from "@/lib/astra/reading-contract"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"

/**
 * Where a reading came from.
 *
 * The whole point of this sheet is that it is boring: a list of the values the
 * craft produced, the id they were filed under, and the time they were
 * computed. Nothing here is written by whatever put the reading into her
 * voice — it is the input to that, shown as it was.
 */

/** ทักษา stars are lowercase; the shared planet names are capitalised. */
function planetKey(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export function AstraProofSheet({
    source,
    open,
    onOpenChange,
}: {
    source: AstraReadingSource
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    const locale = useLocale()
    const t = useTranslations("Astra.proof")
    const tSign = useTranslations("BirthChart.zodiacSigns")
    const tPlanet = useTranslations("BirthChart.planets")
    const tAspect = useTranslations("PlanetaryPanel.aspects")
    // `source.label` was written in whatever language the reading was asked
    // in and is then stored; looking it up live keeps a replayed reading
    // labelled in the language the reader is using now.
    const tLabel = useTranslations("Astra.reading.sourceLabel")

    const rows = proofRows(source)

    const dateFormat = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
    const dateTimeFormat = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })

    const renderPart = (part: ProofPart): string => {
        switch (part.t) {
            case "raw":
                return part.v
            case "planet":
                return tPlanet(planetKey(part.v))
            case "star":
                return tPlanet(planetKey(part.v))
            case "sign":
                return tSign(part.v)
            case "aspect":
                return tAspect(part.v)
            case "ruek":
                return t(`ruek.${part.v}`)
            case "element":
                return t(`element.${part.v}`)
            case "term":
                return t(`term.${part.v}`)
            case "degree":
                return `${part.v}°`
            case "date":
                return dateFormat.format(new Date(part.v))
            case "dateTime":
                return dateTimeFormat.format(new Date(part.v))
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side='bottom'
                className='max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl border-t border-indigo-300/20 bg-[#131024] p-0 text-white/90'
            >
                <SheetHeader className='px-5 pt-5 pb-3'>
                    <SheetTitle className='text-base text-white'>
                        {t("title")}
                    </SheetTitle>
                    <SheetDescription className='text-[13px] leading-relaxed text-white/55'>
                        {tLabel(source.intent)}
                    </SheetDescription>
                </SheetHeader>

                <dl className='divide-y divide-white/[0.06] border-y border-white/[0.06]'>
                    {rows.map((row, index) => (
                        <div
                            key={`${row.labelKey}-${index}`}
                            className='flex items-baseline justify-between gap-4 px-5 py-2.5'
                        >
                            <dt className='shrink-0 text-[12px] text-white/45'>
                                {t(`row.${row.labelKey}`)}
                            </dt>
                            <dd className='text-right text-[13px] tabular-nums text-white/85'>
                                {row.parts.map(renderPart).join(" · ")}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className='space-y-2.5 px-5 py-4'>
                    <p className='text-[12px] leading-relaxed text-white/50'>
                        {t("note")}
                    </p>
                    <p className='text-[12px] leading-relaxed text-white/50'>
                        {t("noReroll")}
                    </p>
                </div>

                {/* The identifiers, last and smallest: they are what makes the
                    anti-reroll claim above checkable, not something to read. */}
                <dl className='space-y-1 px-5 pt-1 pb-24 font-mono text-[10px] text-white/30'>
                    <div className='flex gap-2'>
                        <dt className='shrink-0'>{t("answerId")}</dt>
                        <dd className='break-all'>{source.answerId}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='shrink-0'>{t("seed")}</dt>
                        <dd className='break-all'>{source.seed}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='shrink-0'>{t("computedAt")}</dt>
                        <dd>
                            {dateTimeFormat.format(
                                new Date(source.computedAtIso),
                            )}
                        </dd>
                    </div>
                </dl>
            </SheetContent>
        </Sheet>
    )
}

/**
 * The faint line under a reading that opens the sheet.
 *
 * Deliberately quiet: it is there for the person who wants to check her, and
 * invisible to the person who just wants the reading. It owns its own open
 * state so the message list does not have to carry any.
 *
 * Renders nothing when the basis cannot be read — a link that opens an empty
 * sheet is worse than no link.
 */
export function AstraProofLink({ source }: { source: AstraReadingSource }) {
    const t = useTranslations("Astra.proof")
    const tLabel = useTranslations("Astra.reading.sourceLabel")
    const [open, setOpen] = useState(false)

    if (proofRows(source).length === 0) return null

    return (
        <>
            <button
                type='button'
                onClick={() => setOpen(true)}
                className='w-fit text-[11px] text-white/35 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white/60 hover:decoration-white/40'
            >
                {t("link")} · {tLabel(source.intent)}
            </button>
            <AstraProofSheet
                source={source}
                open={open}
                onOpenChange={setOpen}
            />
        </>
    )
}
