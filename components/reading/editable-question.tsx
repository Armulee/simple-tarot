"use client"

import { useState, useRef, useEffect } from "react"
import { Pencil, Check, X } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { isFollowUpQuestion, getCleanQuestionText } from "@/lib/question-utils"

interface EditableQuestionProps {
    question: string
    onQuestionChange: (newQuestion: string) => void
    showFollowUpBadge?: boolean
    className?: string
}

export default function EditableQuestion({
    question,
    onQuestionChange,
    showFollowUpBadge = true,
    className = "",
}: EditableQuestionProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(question)
    const inputRef = useRef<HTMLInputElement>(null)

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleEdit = () => {
        setEditValue(question)
        setIsEditing(true)
    }

    const handleSave = () => {
        if (editValue.trim() && editValue.trim() !== question) {
            onQuestionChange(editValue.trim())
        }
        setIsEditing(false)
    }

    const handleCancel = () => {
        setEditValue(question)
        setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSave()
        } else if (e.key === "Escape") {
            handleCancel()
        }
    }

    return (
        <div className={`text-center space-y-2 ${className}`}>
            <div className='flex items-center justify-center gap-2 relative'>
                <h2 className='font-serif font-semibold text-xl relative'>
                    {showFollowUpBadge && isFollowUpQuestion(question) && (
                        <Badge
                            variant='secondary'
                            className='absolute -top-6 -left-8 -rotate-12 bg-primary/20 text-white border-white/30'
                        >
                            Follow up
                        </Badge>
                    )}
                    Question
                </h2>
                <Button
                    onClick={handleEdit}
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 hover:bg-primary/10'
                >
                    <Pencil className='h-4 w-4 text-muted-foreground hover:text-primary' />
                </Button>
            </div>

            {isEditing ? (
                <div className='space-y-2'>
                    <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className='text-center text-muted-foreground italic border-primary/50 focus:border-primary'
                        placeholder='Enter your question...'
                    />
                    <div className='flex items-center justify-center gap-2'>
                        <Button
                            onClick={handleSave}
                            size='sm'
                            className='h-8 px-3 bg-primary hover:bg-primary/90'
                        >
                            <Check className='h-3 w-3 mr-1' />
                            Save
                        </Button>
                        <Button
                            onClick={handleCancel}
                            size='sm'
                            variant='outline'
                            className='h-8 px-3'
                        >
                            <X className='h-3 w-3 mr-1' />
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                <p className='text-muted-foreground italic'>
                    &ldquo;{getCleanQuestionText(question)}&rdquo;
                </p>
            )}
        </div>
    )
}