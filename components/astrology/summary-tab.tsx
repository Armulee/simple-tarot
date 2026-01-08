"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { astrologySummarySchema, type AstrologySummary } from "@/lib/astrology/schema"
import { Card } from "@/components/ui/card"
import {
    Loader2,
    Sparkles,
    Copy,
    Check,
    Quote,
    Moon,
    Sun,
    Zap,
    Heart,
    Target,
    Flame,
    Star,
    Cloud,
    Compass,
    Coffee,
    Gem,
    GraduationCap,
    Anchor,
    Bird,
    Flower2,
    MoonStar,
    Rocket,
    Wind,
    type LucideIcon,
} from "lucide-react"
import type { AstrologyReading } from "./display"
import { useLocale } from "next-intl"
import { ZODIAC_SIGNS } from "@/lib/birth-chart-utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import CosmicStars from "@/components/cosmic-stars"
import { SummaryIcon } from "./summary-icon"

const VIBE_ICONS: Record<string, LucideIcon> = {
    Sparkles,
    Moon,
    Sun,
    Zap,
    Heart,
    Target,
    Flame,
    Star,
    Cloud,
    Compass,
    Coffee,
    Gem,
    GraduationCap,
    Anchor,
    Bird,
    Flower2,
    MoonStar,
    Rocket,
    Wind,
}

type AstroPointLike = { sign?: unknown; degree?: unknown } & Record<
    string,
    unknown
>

function normalizeSign(s: string | null) {
    if (!s) return null
    const found = ZODIAC_SIGNS.find((z) => z.toLowerCase() === s.toLowerCase())
    return found ?? s
}

function extractSign(val: unknown): string | null {
    if (!val) return null
    if (typeof val === "string") return normalizeSign(val)
    if (typeof val === "object") {
        const v = val as AstroPointLike
        if (typeof v.sign === "string") return normalizeSign(v.sign)
    }
    return null
}

function extractDegree(val: unknown): number | null {
    if (!val || typeof val !== "object") return null
    const v = val as AstroPointLike
    const d = v.degree
    if (typeof d === "number" && Number.isFinite(d)) return d
    if (typeof d === "string") {
        const n = Number(d)
        if (Number.isFinite(n)) return n
    }
    return null
}

function getAscendantSign(
    houses?: Record<string, unknown> | null,
    planets?: Record<string, unknown> | null
) {
    const h1 = houses?.["1"] ?? houses?.["House 1"]
    const fromH = extractSign(h1)
    if (fromH) return fromH
    const asc = planets?.["Ascendant"] ?? planets?.["ascendant"]
    const fromP = extractSign(asc)
    return fromP ?? null
}

function signToIndex(sign: string | null) {
    if (!sign) return null
    const idx = ZODIAC_SIGNS.findIndex(
        (z) => z.toLowerCase() === sign.toLowerCase()
    )
    return idx >= 0 ? idx : null
}

function houseFromSigns(ascSign: string | null, pointSign: string | null) {
    const a = signToIndex(ascSign)
    const p = signToIndex(pointSign)
    if (a == null || p == null) return null
    return ((p - a + 12) % 12) + 1
}

const DEFAULT_PLANETS = [
    "Ascendant",
    "Sun",
    "Moon",
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Rahu",
    "Ketu",
] as const

function formatPlanetLine(
    label: string,
    planets?: Record<string, unknown> | null,
    natalAsc?: string | null
) {
    const val = planets?.[label] ?? planets?.[label.toLowerCase()]
    const sign = extractSign(val)
    const deg = extractDegree(val)
    const house = houseFromSigns(natalAsc ?? null, sign)
    const parts: string[] = []
    if (sign) parts.push(`in ${sign}`)
    if (deg != null) parts.push(`${deg.toFixed(1)}°`)
    if (house != null) parts.push(`(House ${house})`)
    return `${label}: ${parts.length ? parts.join(" ") : "—"}`
}

function localeToLanguageName(locale: string) {
    const l = (locale || "en").toLowerCase()
    if (l.startsWith("th")) return "Thai"
    if (l.startsWith("en")) return "English"
    if (l.startsWith("es")) return "Spanish"
    if (l.startsWith("fr")) return "French"
    if (l.startsWith("de")) return "German"
    if (l.startsWith("ja")) return "Japanese"
    if (l.startsWith("ko")) return "Korean"
    if (l.startsWith("zh")) return "Chinese"
    return locale
}

function buildPromptEnglishTemplate(
    reading: AstrologyReading,
    preferredLocale: string
) {
    const question = (reading.question ?? "").trim()

    const natalAsc = getAscendantSign(
        reading.birth_houses,
        reading.birth_planets
    )
    const transitAsc = getAscendantSign(
        reading.transit_houses,
        reading.transit_planets
    )

    const birthLocation = [reading.birth_state_province, reading.birth_country]
        .filter(Boolean)
        .join(", ")
    const transitLocation = [
        reading.transit_state_province,
        reading.transit_country,
    ]
        .filter(Boolean)
        .join(", ")

    const birthDateLine = `${reading.birth_year}-${String(reading.birth_month).padStart(2, "0")}-${String(reading.birth_day).padStart(2, "0")} ${String(reading.birth_hour).padStart(2, "0")}:${String(reading.birth_minute).padStart(2, "0")} (TZ ${reading.birth_timezone})`
    const transitDateLine = `${reading.transit_year}-${String(reading.transit_month).padStart(2, "0")}-${String(reading.transit_day).padStart(2, "0")} ${String(reading.transit_hour).padStart(2, "0")}:${String(reading.transit_minute).padStart(2, "0")} (TZ ${reading.transit_timezone})`

    const natalLines = DEFAULT_PLANETS.map((p) =>
        formatPlanetLine(p, reading.birth_planets, natalAsc)
    ).join("\n")
    const transitLines = DEFAULT_PLANETS.map((p) =>
        formatPlanetLine(p, reading.transit_planets, natalAsc)
    ).join("\n")

    const preferredLanguage = localeToLanguageName(preferredLocale)

    return `
You are an expert astrologer who provides clear, practical, and deeply relatable horoscopes.
Your task is to provide a reading for the "Transit Date" based on the user's "Birth Details".

CRITICAL INSTRUCTIONS:
1. USE SIMPLE, UNDERSTANDABLE LANGUAGE. Avoid all technical astrology jargon.
2. DO NOT MENTION: "houses", "aspects", "conjunctions", "retrograde", "trines", "squares", "sextiles", or specific degrees.
3. INSTEAD OF JARGON: Explain the *feeling* and the *impact*. If Mars is in a difficult position, talk about "surging energy that needs careful direction" or "a tendency towards frustration in communication".
4. FOCUS ON THE TRANSIT DAY: Specifically tell the user what is likely to happen, what moods they might experience, and what actions are favored on the transit date provided (${transitDateLine}).
6. STRUCTURED DATA: At the very end of your response, after a double newline:
   a) Provide a list of the top 3 most significant transit-to-natal house influences using this EXACT tag format: [TRANSIT: Planet-House]. Example: [TRANSIT: Sun-1] [TRANSIT: Mars-7] [TRANSIT: Jupiter-10]
   b) Select ONE Lucide icon name that best represents the overall vibe of this reading from this list: [${Object.keys(VIBE_ICONS).join(", ")}]. Provide it using this EXACT tag format: [ICON: IconName]. Example: [ICON: Heart]

DATA FOR THE READING:
User locale: ${preferredLocale}

Birth Details (Natal Baseline):
- Date/time: ${birthDateLine}
- Location: ${birthLocation || "—"}
- Ascendant: ${natalAsc || "—"}
- Natal Placements:
${natalLines}

Transit Details (The Current Sky):
- Date/time: ${transitDateLine}
- Location: ${transitLocation || "—"}
- Ascendant: ${transitAsc || "—"}
- Current Placements (relative to natal chart):
${transitLines}

User Question:
${question ? question : "(none)"}

${question ? "" : `Preferred response language: ${preferredLanguage} (${preferredLocale}).`}
`.trim()
}

export default function SummaryTab({
    reading,
    onSummaryGenerated,
}: {
    reading: AstrologyReading
    onSummaryGenerated?: (summary: string) => void
}) {
    const locale = useLocale()
    const [savedSummary, setSavedSummary] = useState<string | null>(
        reading.summary?.trim() ? reading.summary : null
    )
    const [copied, setCopied] = useState(false)
    const [parsedTransits, setParsedTransits] = useState<
        { planet: string; house: string }[]
    >([])
    const [vibeIcon, setVibeIcon] = useState<string | null>(null)
    const hasStartedRef = useRef(false)

    // Function to parse [TRANSIT: Planet-House] tags
    const parseTransitTags = (text: string) => {
        const regex = /\[TRANSIT:\s*([A-Za-z]+)-(\d{1,2})\]/g
        const matches = [...text.matchAll(regex)]
        return matches.map((m) => ({ planet: m[1], house: m[2] }))
    }

    // Function to parse [ICON: IconName] tags
    const parseIconTag = (text: string) => {
        const regex = /\[ICON:\s*([A-Za-z0-9]+)\]/
        const match = text.match(regex)
        return match ? match[1] : null
    }

    // Function to strip tags for display
    const cleanTextForDisplay = (text: string) => {
        return text
            .replace(/\[TRANSIT:\s*[A-Za-z]+-\d{1,2}\]/g, "")
            .replace(/\[ICON:\s*[A-Za-z0-9]+\]/g, "")
            .trim()
    }

    // Sync savedSummary with reading.summary from props
    useEffect(() => {
        if (reading.summary?.trim()) {
            setSavedSummary(reading.summary)
            const transits = parseTransitTags(reading.summary)
            setParsedTransits(transits)
            const icon = parseIconTag(reading.summary)
            setVibeIcon(icon)
        }
    }, [reading.summary])

    const prompt = useMemo(
        () => buildPromptEnglishTemplate(reading, locale),
        [reading, locale]
    )

    const { submit, object, isLoading } = useObject({
        api: "/api/astrology/summary",
        schema: astrologySummarySchema,
        onFinish: async ({ object }: { object: AstrologySummary | undefined }) => {
            if (object) {
                const transitsTags =
                    object.transits
                        ?.map((t) => `[TRANSIT: ${t?.planet}-${t?.house}]`)
                        .join(" ") || ""
                const iconTag = object.vibeIcon ? `[ICON: ${object.vibeIcon}]` : ""
                const finalText =
                    `${object.interpretation}\n\n${transitsTags}\n${iconTag}`.trim()

                setSavedSummary(finalText || null)

                if (object.transits) {
                    setParsedTransits(
                        object.transits as { planet: string; house: string }[]
                    )
                }
                if (object.vibeIcon) {
                    setVibeIcon(object.vibeIcon)
                }

                if (finalText && onSummaryGenerated) {
                    onSummaryGenerated(finalText)
                }

                try {
                    if (finalText) {
                        await fetch("/api/astrology/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                id: reading.id,
                                summary: finalText,
                            }),
                        })
                    }
                } catch {}
            }
        },
    })

    // Also parse during streaming
    useEffect(() => {
        if (object) {
            if (object.transits) {
                setParsedTransits(
                    object.transits.filter(Boolean) as {
                        planet: string
                        house: string
                    }[]
                )
            }
            if (object.vibeIcon) {
                setVibeIcon(object.vibeIcon)
            }
        }
    }, [object])

    useEffect(() => {
        if (savedSummary) return
        if (hasStartedRef.current) return
        hasStartedRef.current = true
        void submit({ prompt })
    }, [submit, prompt, savedSummary])

    const handleCopy = async () => {
        if (!displayText) return
        try {
            await navigator.clipboard.writeText(displayText)
            setCopied(true)
            toast.success("Horoscope copied to clipboard")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Failed to copy text")
        }
    }

    const displayText = useMemo(() => {
        if (savedSummary) return cleanTextForDisplay(savedSummary)
        return object?.interpretation || ""
    }, [savedSummary, object?.interpretation])

    return (
        <div className='relative group'>
            {/* Decorative background glow */}
            <div className='absolute -inset-1 bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 max-w-lg m-auto' />

            <Card className='relative overflow-hidden p-8 sm:p-10 bg-[#0A0F26]/80 backdrop-blur-xl border-white/10 rounded-[2rem] shadow-2xl shadow-black/50 max-w-lg m-auto'>
                {/* Background stars animation */}
                <div className='absolute inset-0 z-0 pointer-events-none opacity-40'>
                    <CosmicStars />
                </div>

                {/* Background patterns */}
                <div className='absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-all duration-1000'>
                    {(() => {
                        const IconComponent =
                            vibeIcon && VIBE_ICONS[vibeIcon]
                                ? VIBE_ICONS[vibeIcon]
                                : Sparkles
                        return (
                            <IconComponent className='w-24 h-24 text-accent rotate-12' />
                        )
                    })()}
                </div>
                <div className='absolute bottom-0 left-0 p-8 opacity-10 pointer-events-none'>
                    <Quote className='w-16 h-16 text-primary -rotate-12' />
                </div>

                <div className='relative z-10 space-y-8'>
                    <div className='flex flex-col sm:items-center justify-between gap-6'>
                        <div className='w-full flex justify-between items-center gap-3'>
                            <div className='flex items-center gap-2'>
                                <div className='p-2.5 rounded-xl bg-accent/20 border border-accent/30 text-accent shadow-lg shadow-accent/10 transition-all duration-500'>
                                    {(() => {
                                        const IconComponent =
                                            vibeIcon && VIBE_ICONS[vibeIcon]
                                                ? VIBE_ICONS[vibeIcon]
                                                : Sparkles
                                        return (
                                            <IconComponent className='w-5 h-5' />
                                        )
                                    })()}
                                </div>
                                <div>
                                    <h2 className='text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70 tracking-tight'>
                                        Astrology Reading
                                    </h2>
                                    <p className='text-accent/60 text-[10px] font-bold uppercase tracking-[0.3em] mt-1'>
                                        Celestial Interpretation
                                    </p>
                                </div>
                            </div>
                            <div className='flex items-center gap-2'>
                                {displayText && (
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={handleCopy}
                                        className='h-9 w-9 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all'
                                        title='Copy horoscope'
                                    >
                                        {copied ? (
                                            <Check className='w-4 h-4 text-green-400' />
                                        ) : (
                                            <Copy className='w-4 h-4' />
                                        )}
                                    </Button>
                                )}
                                {isLoading && (
                                    <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium animate-pulse'>
                                        <Loader2 className='w-3 h-3 animate-spin' />
                                        Revealing...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transit Icons */}
                        <div className='flex flex-wrap gap-2 w-full'>
                            {parsedTransits.map((transit, i) => (
                                <SummaryIcon
                                    key={`${transit.planet}-${transit.house}-${i}`}
                                    planet={transit.planet}
                                    house={transit.house}
                                />
                            ))}
                        </div>
                    </div>

                    <div className='relative'>
                        {/* Large opening quote decorative element */}
                        <Quote className='absolute -top-6 -left-6 w-12 h-12 text-accent/5 pointer-events-none' />

                        <div
                            className={`leading-relaxed font-light ${
                                displayText ? "text-white/90" : "text-white/40"
                            }`}
                        >
                            {displayText ? (
                                <div className='space-y-6 whitespace-pre-wrap font-sans relative'>
                                    {displayText}
                                    {isLoading && (
                                        <span className='inline-block w-1.5 h-6 ml-1 bg-accent animate-pulse align-middle' />
                                    )}
                                </div>
                            ) : (
                                <div className='py-20 flex flex-col items-center justify-center text-center space-y-6'>
                                    <div className='relative'>
                                        <Loader2 className='w-12 h-12 text-accent/20 animate-spin' />
                                        <Sparkles className='absolute inset-0 w-12 h-12 text-accent animate-pulse scale-50' />
                                    </div>
                                    <p className='italic font-serif text-xl text-white/60'>
                                        The stars are aligning for your
                                        reading...
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {displayText && !isLoading && (
                        <div className='pt-6 border-t border-white/5 flex items-center justify-center'>
                            <div className='flex items-center gap-2 text-white/30 text-[10px] uppercase tracking-[0.3em] font-medium'>
                                <div className='w-8 h-px bg-white/10' />
                                Asking Fate
                                <div className='w-8 h-px bg-white/10' />
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
