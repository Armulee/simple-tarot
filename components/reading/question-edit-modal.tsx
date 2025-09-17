"use client"

import React, { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useTarot } from "@/contexts/tarot-context"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Textarea } from "../ui/textarea"
import { X, Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface QuestionEditModalProps {
    isOpen: boolean
    onClose: () => void
    currentQuestion: string
}

export function QuestionEditModal({ isOpen, onClose, currentQuestion }: QuestionEditModalProps) {
    const t = useTranslations("ReadingPage")
    const { setQuestion } = useTarot()
    const [editedQuestion, setEditedQuestion] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Initialize with current question when modal opens
    useEffect(() => {
        if (isOpen) {
            setEditedQuestion(currentQuestion)
        }
    }, [isOpen, currentQuestion])

    const handleSave = async () => {
        if (!editedQuestion.trim()) {
            toast.error("Please enter a question")
            return
        }

        if (editedQuestion.trim() === currentQuestion.trim()) {
            toast.info("No changes made")
            onClose()
            return
        }

        setIsLoading(true)
        try {
            // Update the question in context
            setQuestion(editedQuestion.trim())
            toast.success("Question updated successfully")
            onClose()
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
            onClose()
        } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            handleSave()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl bg-card/95 backdrop-blur-md border-border/20 shadow-2xl">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary text-sm">✧</span>
                            </div>
                            <h2 className="font-serif font-semibold text-xl">
                                {t("editQuestion.title", { default: "Edit Your Question" })}
                            </h2>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Question Input */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">
                            {t("editQuestion.label", { default: "Your Question" })}
                        </label>
                        <Textarea
                            value={editedQuestion}
                            onChange={(e) => setEditedQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t("editQuestion.placeholder", { 
                                default: "Ask your question to the cosmic realm..." 
                            })}
                            className="min-h-[120px] resize-none text-base"
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("editQuestion.hint", { 
                                default: "Press Ctrl+Enter to save, Escape to cancel" 
                            })}
                        </p>
                    </div>

                    {/* Action Buttons */}
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
                                onClick={onClose}
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
            </Card>
        </div>
    )
}