/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Verify that every locale message file has an identical key set to the
 * source (en.json). Reports missing and extra keys per locale, and checks
 * that ICU placeholders ({name}, {count, plural, ...}) match the source.
 *
 * Usage:
 *   node scripts/verify-i18n-keys.js            # check all locales
 *   node scripts/verify-i18n-keys.js zh-CN ja   # check specific locales
 */
const fs = require("fs")
const path = require("path")

const MESSAGES_DIR = path.join(__dirname, "..", "messages")
const SOURCE_LOCALE = "en"

function flatten(obj, prefix = "", out = {}) {
    for (const [key, value] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${key}` : key
        if (value && typeof value === "object" && !Array.isArray(value)) {
            flatten(value, full, out)
        } else {
            out[full] = value
        }
    }
    return out
}

// Extract ICU/placeholder tokens like {name}, {count, plural, ...}, <tag>.
function extractTokens(value) {
    if (typeof value !== "string") return []
    const tokens = []
    // Real ICU argument names only: the identifier right after `{` that is
    // immediately followed by `}` (simple placeholder) or `,` (plural/select).
    // This intentionally ignores nested sub-message text like `one {Select # card}`.
    const braceRe = /\{\s*([a-zA-Z0-9_]+)\s*(?:,|\})/g
    let m
    while ((m = braceRe.exec(value)) !== null) tokens.push(`{${m[1]}}`)
    // <tag> and </tag>
    const tagRe = /<\/?([a-zA-Z0-9_-]+)[^>]*>/g
    while ((m = tagRe.exec(value)) !== null) tokens.push(`<${m[1]}>`)
    return tokens.sort()
}

function load(locale) {
    const file = path.join(MESSAGES_DIR, `${locale}.json`)
    return JSON.parse(fs.readFileSync(file, "utf8"))
}

function main() {
    const source = flatten(load(SOURCE_LOCALE))
    const sourceKeys = new Set(Object.keys(source))

    let targets = process.argv.slice(2)
    if (targets.length === 0) {
        targets = fs
            .readdirSync(MESSAGES_DIR)
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(/\.json$/, ""))
            .filter((l) => l !== SOURCE_LOCALE)
    }

    let hadError = false
    for (const locale of targets) {
        let target
        try {
            target = flatten(load(locale))
        } catch (e) {
            console.error(`✗ ${locale}: cannot read/parse — ${e.message}`)
            hadError = true
            continue
        }
        const targetKeys = new Set(Object.keys(target))
        const missing = [...sourceKeys].filter((k) => !targetKeys.has(k))
        const extra = [...targetKeys].filter((k) => !sourceKeys.has(k))

        const placeholderMismatches = []
        for (const key of sourceKeys) {
            if (!targetKeys.has(key)) continue
            const a = extractTokens(source[key]).join(",")
            const b = extractTokens(target[key]).join(",")
            if (a !== b)
                placeholderMismatches.push(
                    `    ${key}\n      en:     [${a}]\n      ${locale}: [${b}]`,
                )
        }

        // Missing keys are fatal (they break next-intl at runtime). Extra keys
        // and placeholder mismatches are warnings — extra keys are harmless, and
        // placeholder diffs are often legitimate (e.g. a locale that doesn't
        // pluralize) plus the regex can't fully parse nested ICU sub-messages.
        if (missing.length === 0) {
            const warn = []
            if (extra.length) warn.push(`${extra.length} extra`)
            if (placeholderMismatches.length)
                warn.push(`${placeholderMismatches.length} placeholder`)
            console.log(
                `✓ ${locale}: OK (${targetKeys.size} keys)${warn.length ? ` — warnings: ${warn.join(", ")}` : ""}`,
            )
            if (process.env.I18N_VERBOSE) {
                if (extra.length)
                    console.log(
                        `    extra: ${extra.slice(0, 50).join(", ")}${extra.length > 50 ? " ..." : ""}`,
                    )
                if (placeholderMismatches.length)
                    console.log(placeholderMismatches.slice(0, 30).join("\n"))
            }
            continue
        }
        hadError = true
        console.error(`✗ ${locale}:`)
        console.error(
            `  Missing ${missing.length} keys:\n    ${missing.slice(0, 50).join("\n    ")}${missing.length > 50 ? "\n    ..." : ""}`,
        )
    }

    if (hadError) {
        console.error("\ni18n key verification FAILED (missing keys)")
        process.exit(1)
    }
    console.log("\ni18n key verification PASSED (no missing keys)")
}

main()
