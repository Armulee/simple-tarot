/**
 * Utility functions for handling question display and follow-up detection
 */

export function isFollowUpQuestion(
    _question: string,
    opts?: { isFollowUp?: boolean }
): boolean {
    return !!opts?.isFollowUp
}

export function getCleanQuestionText(question: string): string {
    return question
}
