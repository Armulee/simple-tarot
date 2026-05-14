"use client"

import {
    calculateAgeFromBirthDate,
    type AgeGateBirthData,
} from "@/lib/age-gate-storage"

export const BLOCKED_BIRTHDATE_STORAGE_KEY = "askingfate-blocked-birthdate-v1"

export type BlockedBirthdate = {
    year: number
    month: number
    day: number
    storedAt: number
}

function canUseStorage() {
    return typeof window !== "undefined"
}

export function readBlockedBirthdate(): BlockedBirthdate | null {
    if (!canUseStorage()) return null
    try {
        const raw = window.localStorage.getItem(BLOCKED_BIRTHDATE_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<BlockedBirthdate>
        if (
            typeof parsed?.year !== "number" ||
            typeof parsed?.month !== "number" ||
            typeof parsed?.day !== "number"
        ) {
            return null
        }
        return {
            year: parsed.year,
            month: parsed.month,
            day: parsed.day,
            storedAt:
                typeof parsed.storedAt === "number"
                    ? parsed.storedAt
                    : Date.now(),
        }
    } catch {
        return null
    }
}

export function writeBlockedBirthdate(
    birth: Pick<AgeGateBirthData, "year" | "month" | "day">,
) {
    if (!canUseStorage()) return
    try {
        const payload: BlockedBirthdate = {
            year: birth.year,
            month: birth.month,
            day: birth.day,
            storedAt: Date.now(),
        }
        window.localStorage.setItem(
            BLOCKED_BIRTHDATE_STORAGE_KEY,
            JSON.stringify(payload),
        )
    } catch {
        // Best-effort only.
    }
}

export function clearBlockedBirthdate() {
    if (!canUseStorage()) return
    try {
        window.localStorage.removeItem(BLOCKED_BIRTHDATE_STORAGE_KEY)
    } catch {
        // Best-effort only.
    }
}

/**
 * Returns true when the previously-recorded birthdate still puts the user
 * under thirteen years old. When the user has aged past 13 since their ban
 * was recorded, the ban is considered lifted (caller should clear storage).
 */
export function isStillUnderThirteen(
    record: BlockedBirthdate | null,
    today = new Date(),
): boolean {
    if (!record) return false
    const age = calculateAgeFromBirthDate(record, today)
    return age < 13
}
