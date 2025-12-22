"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { AstrologyReading } from "./display"
import { useLocale } from "next-intl"
import { ZODIAC_SIGNS } from "@/lib/birth-chart-utils"

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
Astrology Reading (English template)

User locale: ${preferredLocale}

Birth details:
- Date/time: ${birthDateLine}
- Location: ${birthLocation || "—"}
- Ascendant (approx): ${natalAsc || "—"}

Transit details:
- Date/time: ${transitDateLine}
- Location: ${transitLocation || "—"}
- Ascendant (approx): ${transitAsc || "—"}

Natal placements (key points):
${natalLines}

Current transits (describe impact in natal houses):
${transitLines}

User question:
${question ? question : "(none)"}

${question ? "" : `Preferred response language: ${preferredLanguage} (${preferredLocale}).`}
`.trim()
}

export default function SummaryTab({ reading }: { reading: AstrologyReading }) {
    const locale = useLocale()
    const [savedSummary, setSavedSummary] = useState<string | null>(
        reading.summary?.trim() ? reading.summary : null
    )
    const hasStartedRef = useRef(false)

    const prompt = useMemo(
        () => buildPromptEnglishTemplate(reading, locale),
        [reading, locale]
    )

    const { complete, completion, isLoading } = useCompletion({
        api: "/api/astrology/summary",
        onFinish: async (_p, result) => {
            const finalText = result?.trim() ? result.trim() : ""
            setSavedSummary(finalText || null)

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
        },
    })

    useEffect(() => {
        if (savedSummary) return
        if (hasStartedRef.current) return
        hasStartedRef.current = true
        void complete(prompt)
    }, [complete, prompt, savedSummary])

    const displayText = (completion?.trim() ? completion : savedSummary) || ""
    return (
        <Card className='p-6 bg-card/10 border-border/20'>
            <div className='flex items-center justify-between gap-4 mb-4'>
                <h2 className='font-serif font-semibold text-xl text-white'>
                    Your horoscope
                </h2>
                {isLoading && (
                    <span className='inline-flex items-center gap-2 text-white/60 text-sm'>
                        <Loader2 className='w-4 h-4 animate-spin' />
                        Generating…
                    </span>
                )}
            </div>

            <p
                className={`whitespace-pre-wrap leading-relaxed ${
                    displayText ? "text-white/90" : "text-white/60"
                }`}
            >
                {displayText ||
                    (isLoading ? "Generating your horoscope…" : "Preparing…")}
            </p>
        </Card>
    )
}
