"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useTarot } from "@/contexts/tarot-context"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { Save, X, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface InlineQuestionEditProps {
    currentQuestion: string
    onCancel: () => void
    onSave: (newQuestion: string) => void
}

export function InlineQuestionEdit({ currentQuestion, onCancel, onSave }: InlineQuestionEditProps) {
    const t = useTranslations("ReadingPage")
    const [editedQuestion, setEditedQuestion] = useState(currentQuestion)
    const [isLoading, setIsLoading] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Focus the textarea when component mounts
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            // Select all text for easy editing
            textareaRef.current.select()
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

    const handleReset = () => {
        setEditedQuestion(currentQuestion)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onCancel()
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            handleSave()
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                    {t("editQuestion.label", { default: "Your Question" })}
                </label>
                <Textarea
                    ref={textareaRef}
                    value={editedQuestion}
                    onChange={(e) => setEditedQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("editQuestion.placeholder", { 
                        default: "Ask your question to the cosmic realm..." 
                    })}
                    className="min-h-[100px] resize-none text-base"
                />
                <p className="text-xs text-muted-foreground">
                    {t("editQuestion.hint", { 
                        default: "Press Ctrl+Enter to save, Escape to cancel" 
                    })}
                </p>
            </div>

            <div className="flex items-center justify-between">
                <Button
                    onClick={handleReset}
                    variant="outline"
                    size="sm"
                    disabled={editedQuestion === currentQuestion || isLoading}
                    className="flex items-center gap-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    {t("editQuestion.reset", { default: "Reset" })}
                </Button>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={onCancel}
                        variant="ghost"
                        disabled={isLoading}
                    >
                        {t("editQuestion.cancel", { default: "Cancel" })}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!editedQuestion.trim() || isLoading}
                        className="flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {isLoading 
                            ? t("editQuestion.saving", { default: "Saving..." })
                            : t("editQuestion.save", { default: "Save Changes" })
                        }
                    </Button>
                </div>
            </div>
        </div>
    )
}