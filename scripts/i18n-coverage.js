/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Report translation coverage for a locale (how many leaf values still equal
 * the English source = untranslated). Optionally dump the untranslated keys.
 *
 *   node scripts/i18n-coverage.js <locale>           # summary
 *   node scripts/i18n-coverage.js <locale> --list    # + untranslated key paths
 *   node scripts/i18n-coverage.js <locale> --json    # JSON {keyPath: englishValue}
 */
const fs = require("fs")
const path = require("path")

const MESSAGES_DIR = path.join(__dirname, "..", "messages")
const locale = process.argv[2]
if (!locale) {
    console.error("usage: node scripts/i18n-coverage.js <locale> [--list|--json]")
    process.exit(1)
}

function flatten(obj, prefix = "", out = {}) {
    for (const [key, value] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === "object" && !Array.isArray(value)) {
            flatten(value, full, out)
        } else {
            out[full] = Array.isArray(value) ? JSON.stringify(value) : value
        }
    }
    return out
}

const en = flatten(
    JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "en.json"), "utf8")),
)
const loc = flatten(
    JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${locale}.json`), "utf8")),
)

const untranslated = []
let total = 0
for (const [k, v] of Object.entries(en)) {
    total++
    // Skip values that are intentionally identical (brand-only, the Languages
    // namespace native names, pure punctuation/symbols, URLs).
    if (k.startsWith("Languages.")) continue
    if (typeof v !== "string") continue
    if (!/[A-Za-z]/.test(v)) continue // no latin letters -> nothing to translate
    if (loc[k] === v) untranslated.push(k)
}

if (process.argv.includes("--json")) {
    const dump = {}
    for (const k of untranslated) dump[k] = en[k]
    console.log(JSON.stringify(dump, null, 2))
} else {
    const translated = total - untranslated.length
    console.log(
        `${locale}: ~${Math.round((translated / total) * 100)}% translated (${untranslated.length} keys still English of ${total})`,
    )
    if (process.argv.includes("--list")) {
        console.log(untranslated.join("\n"))
    }
}
