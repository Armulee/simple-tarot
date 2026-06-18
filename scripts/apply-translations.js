/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Apply a flat {keyPath: translatedValue} map into messages/<locale>.json.
 * Non-destructive: only the provided keys are overwritten; everything else is
 * left intact. keyPath uses dot notation (e.g. "Home.hero.line1"). Array values
 * may be provided as real JSON arrays.
 *
 *   node scripts/apply-translations.js <locale> <flatJsonFile>
 */
const fs = require("fs")
const path = require("path")

const MESSAGES_DIR = path.join(__dirname, "..", "messages")
const locale = process.argv[2]
const flatFile = process.argv[3]
if (!locale || !flatFile) {
    console.error(
        "usage: node scripts/apply-translations.js <locale> <flatJsonFile>",
    )
    process.exit(1)
}

const target = path.join(MESSAGES_DIR, `${locale}.json`)
const obj = JSON.parse(fs.readFileSync(target, "utf8"))
const flat = JSON.parse(fs.readFileSync(flatFile, "utf8"))

function setPath(root, keyPath, value) {
    const keys = keyPath.split(".")
    let cur = root
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {}
        cur = cur[k]
    }
    cur[keys[keys.length - 1]] = value
}

let applied = 0
for (const [k, v] of Object.entries(flat)) {
    setPath(obj, k, v)
    applied++
}

fs.writeFileSync(target, JSON.stringify(obj, null, 2) + "\n", "utf8")
console.log(`Applied ${applied} translations to ${locale}.json`)
