const fs = require("fs")
const p = "components/chat/character-mention-context.tsx"
let s = fs.readFileSync(p, "utf8")
const em = String.fromCodePoint(0x2003) // EM SPACE
const needle = 'prevChar) ? " " : ""'
const repl = 'prevChar) ? "' + em + '" : ""'
if (!s.includes(needle)) {
    console.log("NO MATCH")
    process.exit(1)
}
const count = s.split(needle).length - 1
s = s.split(needle).join(repl)
fs.writeFileSync(p, s)
console.log("REPLACED", count)
