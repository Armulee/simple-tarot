"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { useTarot } from "@/contexts/tarot-context"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Save, X } from "lucide-react"
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
    const inputRef = useRef<HTMLInputElement>(null)

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
        <div className="space-y-4">
            <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                    {t("editQuestion.label", { default: "Your Question" })}
                </label>
                <Input
                    ref={inputRef}
                    value={editedQuestion}
                    onChange={(e) => setEditedQuestion(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("editQuestion.placeholder", { 
                        default: "Ask your question to the cosmic realm..." 
                    })}
                    className="text-base"
                />
                <p className="text-xs text-muted-foreground">
                    {t("editQuestion.hint", { 
                        default: "Press Enter to save, Escape to cancel" 
                    })}
                </p>
            </div>

            <div className="flex items-center justify-end gap-3">
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
    )
}