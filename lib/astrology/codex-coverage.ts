export type CodexCoverage = {
    expectedDays: number
    actualDays: number
    ratio: number
    isComplete: boolean
}

export function computeCodexCoverage(
    expectedDays: number,
    actualDays: number
): CodexCoverage {
    const ratio = expectedDays > 0 ? actualDays / expectedDays : 0
    const isComplete = actualDays >= expectedDays
    return {
        expectedDays,
        actualDays,
        ratio: Number(ratio.toFixed(3)),
        isComplete,
    }
}
