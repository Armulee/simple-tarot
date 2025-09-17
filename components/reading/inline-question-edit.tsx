"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useTarot } from "@/contexts/tarot-context"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Save, X } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "../ui/textarea"

interface InlineQuestionEditProps {
    currentQuestion: string
    onCancel: () => void
    onSave: (newQuestion: string) => void
}

export function InlineQuestionEdit({
    currentQuestion,
    onCancel,
    onSave,
}: InlineQuestionEditProps) {
    const t = useTranslations("ReadingPage")
    const [editedQuestion, setEditedQuestion] = useState(currentQuestion)
    const [isLoading, setIsLoading] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    // Focus the input when component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
            // Select all text for easy editing
            inputRef.current.select()
        }
    }, [])

    const handleSave = async () => {
        if (!editedQuestion.trim()) {
            toast.error("Please enter a question")
            return
        }

        if (editedQuestion.trim() === currentQuestion.trim()) {
            toast.info("No changes made")
            onCancel()
            return
        }

        setIsLoading(true)
        try {
            onSave(editedQuestion.trim())
            toast.success("Question updated successfully")
        } catch (error) {
            toast.error("Failed to update question")
            console.error("Error updating question:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onCancel()
        } else if (e.key === "Enter") {
            handleSave()
        }
    }

    return (
        <div className='space-y-4'>
            <div className='space-y-3'>
                <Textarea
                    ref={inputRef}
                    value={editedQuestion}
                    onChange={(e) => setEditedQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("editQuestion.placeholder", {
                        default: "Ask your question to the cosmic realm...",
                    })}
                    className='text-base max-w-72 resize-none min-h-10 rounded-2xl mx-auto'
                />
            </div>

            <div className='flex items-center justify-center gap-3'>
                <Button onClick={onCancel} variant='ghost' disabled={isLoading}>
                    {t("editQuestion.cancel", { default: "Cancel" })}
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={!editedQuestion.trim() || isLoading}
                    className='flex items-center gap-2'
                >
                    <Save className='h-4 w-4' />
                    {isLoading
                        ? t("editQuestion.saving", { default: "Saving..." })
                        : t("editQuestion.save", { default: "Save Changes" })}
                </Button>
            </div>
        </div>
    )
}
