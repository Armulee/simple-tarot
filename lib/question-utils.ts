/**
 * Utility functions for handling question display and follow-up detection
 */

export function isFollowUpQuestion(question: string): boolean {
    return question.startsWith("[Follow up question]:")
}

export function getCleanQuestionText(question: string): string {
    if (isFollowUpQuestion(question)) {
        return question.replace("[Follow up question]:", "").trim()
    }
    return question
}
