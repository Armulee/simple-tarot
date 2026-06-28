#!/usr/bin/env node
/*
 * Translate the canonical English tarot meanings (lib/tarot/meanings/en/*.json)
 * into every supported locale using the Vercel AI Gateway (same gateway the
 * app uses for chat). Structure-preserving: only human-readable values are
 * translated (keywords, text, yesNo, zodiac, element); keys and `slug` stay.
 *
 * Usage:
 *   AI_GATEWAY_API_KEY=...  node scripts/translate-meanings.mjs
 *   node scripts/translate-meanings.mjs --locales th,ja          # subset
 *   node scripts/translate-meanings.mjs --force                  # re-translate existing
 *   TRANSLATE_MODEL=openai/gpt-4o-mini node scripts/translate-meanings.mjs
 *
 * Requires an AI Gateway key in the environment (AI_GATEWAY_API_KEY). Without
 * it the AI SDK can't reach the gateway and the script exits with guidance.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { generateObject } from "ai"
import { z } from "zod"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MEANINGS_DIR = path.join(__dirname, "..", "lib", "tarot", "meanings")
const EN_DIR = path.join(MEANINGS_DIR, "en")

// Target locales (everything except the English source).
const LOCALE_LANGUAGE = {
    th: "Thai",
    lo: "Lao",
    my: "Burmese (Myanmar)",
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    ja: "Japanese",
    ko: "Korean",
    id: "Indonesian",
    es: "Spanish",
    "pt-BR": "Brazilian Portuguese",
}

const MODEL = process.env.TRANSLATE_MODEL || "deepseek/deepseek-v3.2"
const CONCURRENCY = Number(process.env.TRANSLATE_CONCURRENCY || 4)

function parseArgs() {
    const args = process.argv.slice(2)
    const force = args.includes("--force")
    const localesArg = args.find((a) => a.startsWith("--locales"))
    let locales = Object.keys(LOCALE_LANGUAGE)
    if (localesArg) {
        const val = localesArg.includes("=")
            ? localesArg.split("=")[1]
            : args[args.indexOf(localesArg) + 1]
        if (val) locales = val.split(",").map((s) => s.trim()).filter(Boolean)
    }
    return { force, locales }
}

const sectionSchema = z.object({
    keywords: z.array(z.string()).optional(),
    text: z.string(),
    yesNo: z.string().optional(),
    zodiac: z.string().optional(),
    element: z.string().optional(),
})
const orientationSchema = z.object({
    overview: sectionSchema,
    relationships: sectionSchema,
    work: sectionSchema,
    finance: sectionSchema,
    health: sectionSchema,
})
const cardSchema = z.object({
    slug: z.string(),
    upright: orientationSchema,
    reversed: orientationSchema,
})

function buildPrompt(language, enJson) {
    return `You are a professional tarot translator. Translate the VALUES of this tarot-card meaning JSON into ${language}, for a native speaker — natural, fluent, not literal/machine-sounding.

Rules:
- Keep the JSON structure and every key EXACTLY the same. Do NOT change "slug".
- Translate: every string in "keywords" arrays, "text", "yesNo", "zodiac", "element".
- Keep keyword arrays the same length and order (translate each item).
- "yesNo" is a short verdict (e.g. Yes / No / Maybe / Not yet) — translate it naturally for ${language}.
- "zodiac"/"element": localize the sign/planet/element names into ${language} conventions; you may keep a Latin term in parentheses if that is the local convention.
- Preserve the meaning, tone, and length feel of each "text".

English source:
${JSON.stringify(enJson, null, 2)}`
}

async function translateCard(slug, enJson, language) {
    const { object } = await generateObject({
        model: MODEL,
        schema: cardSchema,
        prompt: buildPrompt(language, enJson),
    })
    // Guarantee the slug is untouched regardless of model output.
    object.slug = enJson.slug
    return object
}

async function run() {
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
        console.error(
            "Missing AI_GATEWAY_API_KEY. Set your Vercel AI Gateway key, e.g.\n" +
                "  AI_GATEWAY_API_KEY=xxx node scripts/translate-meanings.mjs",
        )
        process.exit(1)
    }

    const { force, locales } = parseArgs()
    const enFiles = fs
        .readdirSync(EN_DIR)
        .filter((f) => f.endsWith(".json"))
        .sort()

    console.log(
        `Translating ${enFiles.length} cards → ${locales.join(", ")} ` +
            `(model: ${MODEL}, force: ${force})`,
    )

    for (const locale of locales) {
        const language = LOCALE_LANGUAGE[locale]
        if (!language) {
            console.warn(`Skipping unknown locale: ${locale}`)
            continue
        }
        const outDir = path.join(MEANINGS_DIR, locale)
        fs.mkdirSync(outDir, { recursive: true })

        // Simple concurrency-limited queue per locale.
        let index = 0
        let done = 0
        async function worker() {
            while (index < enFiles.length) {
                const file = enFiles[index++]
                const slug = file.replace(/\.json$/, "")
                const outPath = path.join(outDir, file)
                if (!force && fs.existsSync(outPath)) {
                    done++
                    continue
                }
                const enJson = JSON.parse(
                    fs.readFileSync(path.join(EN_DIR, file), "utf8"),
                )
                try {
                    const translated = await translateCard(slug, enJson, language)
                    fs.writeFileSync(
                        outPath,
                        JSON.stringify(translated, null, 2),
                    )
                } catch (err) {
                    console.error(`  [${locale}] ${slug} failed:`, err.message)
                }
                done++
                if (done % 10 === 0 || done === enFiles.length) {
                    console.log(`  [${locale}] ${done}/${enFiles.length}`)
                }
            }
        }
        await Promise.all(
            Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()),
        )
        console.log(`✓ ${locale} (${language}) done`)
    }
    console.log("All translations written.")
}

run().catch((err) => {
    console.error(err)
    process.exit(1)
})
