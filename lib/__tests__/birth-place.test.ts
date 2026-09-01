import assert from "node:assert/strict"
import test from "node:test"
import {
    formatBirthPlace,
    parseBirthPlace,
    resolveCountry,
} from "../birth-place.ts"

test("parses the order the consent modal writes", () => {
    // star-consent.tsx: [country, state].join(", ")
    assert.deepEqual(parseBirthPlace("Thailand, Nonthaburi"), {
        country: "Thailand",
        state: "Nonthaburi",
    })
    assert.deepEqual(parseBirthPlace("Thailand, Samut Sakhon"), {
        country: "Thailand",
        state: "Samut Sakhon",
    })
})

test("parses the order the birth-chart forms write", () => {
    // profile-birth-form.tsx / info-card.tsx: `${stateProv}, ${country}`
    assert.deepEqual(parseBirthPlace("Nonthaburi, Thailand"), {
        country: "Thailand",
        state: "Nonthaburi",
    })
})

test("a country on its own has no province", () => {
    assert.deepEqual(parseBirthPlace("Japan"), {
        country: "Japan",
        state: "",
    })
})

test("Thai and ISO spellings resolve", () => {
    assert.equal(resolveCountry("ประเทศไทย"), "Thailand")
    assert.equal(resolveCountry("TH"), "Thailand")
    assert.equal(resolveCountry("  japan  "), "Japan")
})

test("a bare province is not mistaken for a country", () => {
    // The caller keeps the original text rather than saving an empty place.
    assert.deepEqual(parseBirthPlace("bangkok"), { country: "", state: "" })
    assert.deepEqual(parseBirthPlace("Chiang Mai"), { country: "", state: "" })
    assert.equal(resolveCountry("Nonthaburi"), null)
})

test("empty input is handled", () => {
    for (const value of ["", "   ", null, undefined]) {
        assert.deepEqual(parseBirthPlace(value), { country: "", state: "" })
    }
})

test("formats as Country, Province — the order the column holds", () => {
    assert.equal(formatBirthPlace("Thailand", "Nonthaburi"), "Thailand, Nonthaburi")
    assert.equal(formatBirthPlace("Thailand", ""), "Thailand")
    assert.equal(formatBirthPlace("", "Nonthaburi"), "")
})

test("a formatted value parses back to what went in", () => {
    for (const [country, state] of [
        ["Thailand", "Nonthaburi"],
        ["Japan", "Tokyo"],
        ["Singapore", ""],
    ]) {
        assert.deepEqual(
            parseBirthPlace(formatBirthPlace(country, state)),
            { country, state },
        )
    }
})
