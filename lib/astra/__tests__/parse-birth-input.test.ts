import assert from "node:assert/strict"
import test from "node:test"
import {
    parseBirthDate,
    parseBirthTime,
    saysUnknown,
} from "../parse-birth-input.ts"

const NOW = new Date("2026-08-24T00:00:00Z")

test("reads day-first numeric dates", () => {
    assert.deepEqual(parseBirthDate("12/5/1999", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
    assert.deepEqual(parseBirthDate("12-05-1999", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
})

test("reads Buddhist-era years", () => {
    assert.deepEqual(parseBirthDate("12/5/2542", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
})

test("reads ISO dates", () => {
    assert.deepEqual(parseBirthDate("1999-05-12", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
})

test("reads Thai and English month names in either order", () => {
    assert.deepEqual(parseBirthDate("12 พฤษภาคม 2542", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
    assert.deepEqual(parseBirthDate("12 พ.ค. 2542", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
    assert.deepEqual(parseBirthDate("May 12, 1999", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
    assert.deepEqual(parseBirthDate("12 May 1999", NOW), {
        year: 1999,
        month: 5,
        day: 12,
    })
})

test("a first number above 12 is the day, whichever side it is on", () => {
    assert.deepEqual(parseBirthDate("25/12/1990", NOW), {
        year: 1990,
        month: 12,
        day: 25,
    })
    assert.deepEqual(parseBirthDate("12/25/1990", NOW), {
        year: 1990,
        month: 12,
        day: 25,
    })
})

test("refuses what it cannot read rather than guessing", () => {
    assert.equal(parseBirthDate("", NOW), null)
    assert.equal(parseBirthDate("เมื่อไหร่จะรวย", NOW), null)
    // Not a real date.
    assert.equal(parseBirthDate("31/2/1999", NOW), null)
    // The future is not a birth date.
    assert.equal(parseBirthDate("12/5/2030", NOW), null)
    // Before the range we read charts for.
    assert.equal(parseBirthDate("12/5/1880", NOW), null)
})

test("reads times with and without minutes", () => {
    assert.deepEqual(parseBirthTime("07:20"), { hour: 7, minute: 20 })
    assert.deepEqual(parseBirthTime("7.20"), { hour: 7, minute: 20 })
    assert.deepEqual(parseBirthTime("19"), { hour: 19, minute: 0 })
    assert.deepEqual(parseBirthTime("7pm"), { hour: 19, minute: 0 })
    assert.deepEqual(parseBirthTime("12am"), { hour: 0, minute: 0 })
    assert.equal(parseBirthTime("99:99"), null)
    assert.equal(parseBirthTime("ตอนเช้า"), null)
})

test("hears an honest 'I don't know'", () => {
    assert.equal(saysUnknown("ไม่รู้"), true)
    assert.equal(saysUnknown("จำไม่ได้ครับ"), true)
    assert.equal(saysUnknown("I don't know"), true)
    assert.equal(saysUnknown("not sure"), true)
    assert.equal(saysUnknown("07:20"), false)
})
