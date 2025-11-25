"use client"

import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import AutoHeightTextarea from "@/components/ui/auto-height-textarea"
import { useTranslations } from "next-intl"

interface BirthChartQuestionInputProps {
    id?: string
    label?: string
    placeholder?: string
    value: string
    onChange: (value: string) => void
    onSubmit: () => void
    isLoading?: boolean
}

export default function BirthChartQuestionInput({
    id = "bc-question-input",
    label = "Ask a follow-up question",
    placeholder,
    value,
    onChange,
    onSubmit,
    isLoading = false,
}: BirthChartQuestionInputProps) {
    const t = useTranslations("QuestionInput") // Reuse existing translations if possible
    const [isSmallDevice, setIsSmallDevice] = useState(false)

    // Detect small devices
    useEffect(() => {
        const checkDevice = () => {
            setIsSmallDevice(
                window.innerWidth < 768 ||
                    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                        navigator.userAgent
                    )
            )
        }

        checkDevice()
        window.addEventListener("resize", checkDevice)

        return () => window.removeEventListener("resize", checkDevice)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            if (!isSmallDevice && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault()
                if (value.trim() && !isLoading) {
                    onSubmit()
                }
                return
            }
        }
    }

    return (
        <div className='w-full mb-6 text-left'>
            {label && (
                <Label htmlFor={id} className='block mb-2 text-lg text-white'>
                    {label}
                </Label>
            )}
            <div className='relative group w-full'>
                <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90 group-focus-within:opacity-0 transition-opacity' />
                <AutoHeightTextarea
                    id={id}
                    name={id}
                    placeholder={placeholder || "Ask about your love life, career, etc..."}
                    className='relative z-10 w-full pl-4 pr-15 py-2 text-white placeholder:text-white/70 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/40 rounded-2xl resize-y shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] resize-none'
                    onChange={(e) => onChange(e.target.value)}
                    value={value}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <Button
                    onClick={onSubmit}
                    disabled={!value.trim() || isLoading}
                    size='lg'
                    variant='ghost'
                    className='absolute bottom-0 right-0 z-20 bg-transparent hover:bg-transparent border-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 hover:text-white'
                >
                    <span className='pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400/50 via-purple-400/50 to-cyan-400/50 opacity-80 hover:opacity-0' />
                    <Send className='relative z-10 w-5 h-5 drop-shadow-sm' />
                </Button>
            </div>
        </div>
    )
}
