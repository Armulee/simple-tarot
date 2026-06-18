import { App } from "@modelcontextprotocol/ext-apps"
import "./style.css"

/**
 * AskingFate tarot card-picker widget (MCP Apps / SEP-1865).
 *
 * Runs in a sandboxed iframe with no session — all data arrives via the tool's
 * `structuredContent`. The user shuffles and taps face-down cards; on
 * completion the widget calls `tarot_reading` on the server, which draws and
 * charges. The deck is face-down (the server assigns the actual cards), exactly
 * like the site's own draw flow.
 */

type PickerData = {
    question: string
    cardsToPick: number
    creditCost: number
    fanSize: number
    spread?: "single" | "three_card" | "celtic_cross"
    deckBackImage?: string
}

const DEFAULTS: PickerData = {
    question: "",
    cardsToPick: 3,
    creditCost: 1,
    fanSize: 9,
    spread: "three_card",
}

const app = new App()
const root = document.getElementById("app")!

type RevealedCard = {
    name: string
    reversed: boolean
    position: string
    keywords: string[]
}

let data: PickerData = DEFAULTS
let order: number[] = []
const selected = new Set<number>()
let phase: "picking" | "drawing" | "done" = "picking"
let reading = ""
let drawn: RevealedCard[] = []

// ----- helpers -------------------------------------------------------------

function spreadForCount(n: number): PickerData["spread"] {
    if (n <= 1) return "single"
    if (n >= 10) return "celtic_cross"
    return "three_card"
}

/** Build an 8-point gold star SVG (deep-purple card back motif). */
function starSvg(): string {
    const cx = 50
    const cy = 50
    const outer = 40
    const inner = 17
    const points = 8
    const verts: string[] = []
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner
        const a = (Math.PI / points) * i - Math.PI / 2
        verts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
    }
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${verts.join(
        " ",
    )}" fill="#f4c95d"/></svg>`
}

function buildStarfield(): string {
    let stars = ""
    for (let i = 0; i < 60; i++) {
        const top = Math.random() * 100
        const left = Math.random() * 100
        const delay = Math.random() * 3
        const size = Math.random() < 0.2 ? 3 : 2
        stars += `<span class="star" style="top:${top}%;left:${left}%;width:${size}px;height:${size}px;animation-delay:${delay}s"></span>`
    }
    return `<div class="starfield">${stars}</div>`
}

// ----- render --------------------------------------------------------------

function render() {
    if (order.length !== data.fanSize) {
        order = Array.from({ length: data.fanSize }, (_, i) => i)
    }

    const counter = `คุณเลือกไพ่แล้ว ${selected.size}/${data.cardsToPick} ใบ`
    const creditLine = `การจั่วไพ่จะใช้ดวงดาว ${data.creditCost} ดวง`
    const complete = selected.size >= data.cardsToPick

    const deckHtml =
        phase === "done" && drawn.length
            ? drawn
                  .map((c) => {
                      const orient = c.reversed ? "กลับหัว" : "ตั้งตรง"
                      const kw = c.keywords.slice(0, 4).join(" · ")
                      return `<div class="reveal-card${c.reversed ? " reversed" : ""}">
                            <div class="rc-pos">${escapeHtml(c.position)}</div>
                            <div class="rc-name">${escapeHtml(c.name)}</div>
                            <div class="rc-orient">${orient}</div>
                            <div class="rc-kw">${escapeHtml(kw)}</div>
                        </div>`
                  })
                  .join("")
            : order
                  .map((id) => {
                      const isSel = selected.has(id)
                      const order1 = isSel ? [...selected].indexOf(id) + 1 : 0
                      const disabled = !isSel && complete
                      const cls = `card${isSel ? " selected" : ""}${
                          disabled ? " disabled" : ""
                      }`
                      const back = data.deckBackImage
                          ? `<img src="${data.deckBackImage}" alt="" style="width:100%;height:100%;border-radius:10px;object-fit:cover"/>`
                          : starSvg()
                      const badge = isSel ? `<span class="badge">${order1}</span>` : ""
                      return `<div class="${cls}" data-id="${id}" role="button" tabindex="0">${back}${badge}</div>`
                  })
                  .join("")

    let footer = ""
    if (phase === "picking") {
        footer = `
            <div class="controls">
                <button id="shuffle">สับไพ่</button>
                <button id="autopick">เลือกให้หน่อย</button>
                <button id="reveal" class="primary" ${complete ? "" : "disabled"}>ดูคำทำนาย</button>
            </div>`
    } else if (phase === "drawing") {
        footer = `<div class="status"><span class="spinner"></span>กำลังเปิดคำทำนาย…</div>`
    } else {
        footer = reading ? `<div class="reading">${escapeHtml(reading)}</div>` : ""
    }

    root.innerHTML = `
        ${buildStarfield()}
        <div class="content">
            <div class="header">
                ${data.question ? `<p class="question">${escapeHtml(data.question)}</p>` : ""}
                <p class="credit-line">${creditLine}</p>
                <p class="counter">${counter}</p>
            </div>
            <div class="deck">${deckHtml}</div>
            ${footer}
        </div>`

    if (phase === "picking") bindPickingEvents()
}

function escapeHtml(s: string): string {
    return s.replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c]!,
    )
}

function bindPickingEvents() {
    root.querySelectorAll<HTMLElement>(".card").forEach((el) => {
        const handler = () => toggleCard(Number(el.dataset.id))
        el.addEventListener("click", handler)
        el.addEventListener("keydown", (e) => {
            if ((e as KeyboardEvent).key === "Enter") handler()
        })
    })
    root.querySelector("#shuffle")?.addEventListener("click", shuffleDeck)
    root.querySelector("#autopick")?.addEventListener("click", autoPick)
    root.querySelector("#reveal")?.addEventListener("click", reveal)
}

// ----- actions -------------------------------------------------------------

function toggleCard(id: number) {
    if (selected.has(id)) {
        selected.delete(id)
    } else if (selected.size < data.cardsToPick) {
        selected.add(id)
    }
    render()
}

function shuffleDeck() {
    selected.clear()
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j]!, order[i]!]
    }
    render()
}

function autoPick() {
    selected.clear()
    const pool = [...order]
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    pool.slice(0, data.cardsToPick).forEach((id) => selected.add(id))
    render()
}

async function reveal() {
    if (selected.size < data.cardsToPick) return
    phase = "drawing"
    render()
    try {
        const result = await app.callServerTool({
            name: "tarot_reading",
            arguments: {
                question: data.question,
                spread: data.spread ?? spreadForCount(data.cardsToPick),
            },
        })
        const text = (result?.content ?? [])
            .filter((c): c is { type: "text"; text: string } => c.type === "text")
            .map((c) => c.text)
            .join("\n\n")
        const sc = result?.structuredContent as
            | { cards?: RevealedCard[] }
            | undefined
        if (sc?.cards?.length) drawn = sc.cards
        reading = text || "คำทำนายพร้อมแล้วในแชท"
        phase = "done"
    } catch (err) {
        reading =
            "ขออภัย เกิดข้อผิดพลาดในการเปิดคำทำนาย กรุณาลองใหม่อีกครั้ง" +
            (err instanceof Error ? `\n(${err.message})` : "")
        phase = "done"
    }
    render()
}

// ----- boot ----------------------------------------------------------------

// Register the data handler before connecting so we don't miss the
// tool-result notification carrying our structuredContent.
app.ontoolresult = (result) => {
    const sc = result?.structuredContent as Partial<PickerData> | undefined
    if (sc) {
        data = { ...DEFAULTS, ...sc }
        order = []
        render()
    }
}

render() // initial paint (defaults) while we connect
app.connect().catch((e) => {
    console.error("[card-picker] connect failed", e)
})
