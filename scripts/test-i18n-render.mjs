import { createTranslator } from "next-intl"
import fs from "fs"

const locales = [
    "en",
    "th",
    "lo",
    "my",
    "zh-CN",
    "zh-TW",
    "ja",
    "ko",
    "id",
    "es",
    "pt-BR",
]

// A spread of keys: plain, ICU plural, ICU variable, a deep nested one, and a
// previously-broken namespace (CheckoutSuccess).
const cases = [
    ["Navbar.about", undefined],
    ["Home.consulting", undefined],
    ["Home.selectedCards", { selectedCount: 2, cardsToSelect: 3 }],
    ["ReadingPage.chooseCards.selectFromSpread", { count: 3 }],
    ["ReadingPage.chooseCards.manualSelectDesc", { count: 2 }],
    ["CheckoutSuccess.title", undefined],
    ["StarsBalance.balance", { current: 4, total: 6 }],
]

let failures = 0
for (const locale of locales) {
    const messages = JSON.parse(
        fs.readFileSync(new URL(`../messages/${locale}.json`, import.meta.url)),
    )
    const t = createTranslator({ locale, messages })
    console.log(`\n=== ${locale} ===`)
    for (const [key, values] of cases) {
        try {
            const out = t(key, values)
            console.log(`  ${key} => ${out}`)
        } catch (e) {
            failures++
            console.log(`  ${key} => ❌ ERROR: ${e.message}`)
        }
    }
}

console.log(
    failures === 0
        ? "\nAll keys rendered without errors ✓"
        : `\n${failures} render error(s) ✗`,
)
process.exit(failures === 0 ? 0 : 1)
