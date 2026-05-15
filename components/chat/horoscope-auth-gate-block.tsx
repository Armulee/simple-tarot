"use client"

import Image from "next/image"
import Link from "next/link"
import { useTranslations } from "next-intl"
import type { HoroscopeAuthGate } from "@/components/chat/types"

type HoroscopeAuthGateBlockProps = {
    data: HoroscopeAuthGate
}

/**
 * Inline assistant block shown when the AI classifies the question as a
 * horoscope reading but the visitor is not signed in. The message tells the
 * user that horoscope requires authentication, surfaces a sign-in link, and
 * offers a tarot fallback with an illustrative card.
 */
export function HoroscopeAuthGateBlock({ data }: HoroscopeAuthGateBlockProps) {
    const t = useTranslations("Home.horoscopeAuthGate")

    const cardImagePath = `/assets/rider-waite-tarot/${data.cardSlug}.png`

    return (
        <div className='w-full md:max-w-[85%] space-y-4 text-white/90 leading-relaxed'>
            <p className='text-[15px]'>
                <span>{t("intro")}</span>
                <Link
                    href={data.signInHref}
                    className='underline underline-offset-2 decoration-primary/60 text-primary hover:text-primary/90 transition-colors font-medium'
                >
                    {t("signInLabel")}
                </Link>
                <span>{t("introSuffix")}</span>
                <br />
                <span className='text-white/70'>{t("fallback")}</span>
            </p>

            <div className='flex justify-start'>
                <div
                    className='relative w-28 sm:w-32 rounded-lg overflow-hidden border border-white/15 bg-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]'
                    role='img'
                    aria-label={t("cardAriaLabel", { name: data.cardName })}
                >
                    <Image
                        src={cardImagePath}
                        alt={data.cardName}
                        width={0}
                        height={0}
                        sizes='(max-width: 640px) 112px, 128px'
                        className={`w-full h-auto object-contain ${
                            data.cardIsReversed ? "rotate-180" : ""
                        }`}
                    />
                </div>
            </div>
        </div>
    )
}

export default HoroscopeAuthGateBlock
