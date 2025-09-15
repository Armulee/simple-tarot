"use client"
import { Send } from "lucide-react"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTarot } from "@/contexts/tarot-context"
import AutoHeightTextarea from "./ui/auto-height-textarea"
import { useTranslations } from "next-intl"

export default function QuestionInput({
    id = "question-input",
    label = "Your question",
    placeholder,
    defaultValue,
    value,
    onChange,
    followUp = false,
}: {
    id?: string
    label?: string
    placeholder?: string
    defaultValue?: string
    value?: string
    onChange?: (value: string) => void
    followUp?: boolean
}) {
    const t = useTranslations("QuestionInput")
    const pathname = usePathname()
    const [internalQuestion, setInternalQuestion] = useState("")
    const [isSmallDevice, setIsSmallDevice] = useState(false)
    const router = useRouter()
    const {
        setQuestion: setContextQuestion,
        setCurrentStep,
        setReadingType,
        setSelectedCards,
        setInterpretation,
        setIsFollowUp,
        setFollowUpQuestion,
        question: lastQuestion,
        selectedCards: lastCards,
        interpretation: lastInterpretation,
        clearReadingStorage,
    } = useTarot()

    // Use controlled value if provided, otherwise use internal state
    const question = value !== undefined ? value : internalQuestion
    const setQuestion = onChange || setInternalQuestion

    const handleStartReading = () => {
        const currentValue =
            (question || "").trim() || (defaultValue || "").trim()
        if (currentValue) {
            if (followUp) {
                handleFollowUpQuestion(currentValue)
            } else {
                // This is a new reading (not follow-up), clear localStorage and reset state
                clearReadingStorage()

                // Set new question and navigate
                setContextQuestion(currentValue)
                setIsFollowUp(false)
                setFollowUpQuestion(null)
                setCurrentStep("reading-type")

                // Persist immediately so /reading can restore after navigation/reload
                try {
                    const payload = JSON.stringify({
                        question: currentValue,
                        readingType: null,
                        selectedCards: [],
                        currentStep: "reading-type",
                        interpretation: null,
                        isFollowUp: false,
                        followUpQuestion: null,
                    })
                    localStorage.setItem("reading-state-v1", payload)
                } catch {
                    // ignore
                }
                if (pathname !== "/reading") {
                    router.push("/reading")
                }
            }
        }
    }

    const handleFollowUpQuestion = (fuQuestion: string) => {
        // Backup current reading data for follow-up context
        try {
            const backupData = {
                question: lastQuestion,
                selectedCards: lastCards,
                interpretation: lastInterpretation,
                timestamp: Date.now(),
            }
            localStorage.setItem(
                "reading-state-v1-backup",
                JSON.stringify(backupData)
            )
        } catch (e) {
            console.error("Failed to backup reading data:", e)
        }

        // DON'T clear localStorage - preserve the reading state
        // The reading state will be updated with the new follow-up data

        // Set up for follow-up reading without mutating the main question
        setIsFollowUp(true)
        setFollowUpQuestion(fuQuestion)
        setReadingType("simple") // Set to simple (single card) reading
        setSelectedCards([]) // Clear previous cards
        setInterpretation(null) // Clear previous interpretation
        setCurrentStep("card-selection") // Go to card selection

        // Persist follow-up state immediately
        try {
            const payload = JSON.stringify({
                question: lastQuestion,
                readingType: "simple",
                selectedCards: [],
                currentStep: "card-selection",
                interpretation: null,
                isFollowUp: true,
                followUpQuestion: fuQuestion,
            })
            localStorage.setItem("reading-state-v1", payload)
        } catch {
            // ignore
        }
    }

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
                // Plain Enter submits the form
                e.preventDefault()
                handleStartReading()
                return
            }
            // Shift+Enter, Ctrl+Enter, Cmd+Enter, or Enter on small devices adds a newline (default behavior)
        }
    }

    return (
        <div className='w-full mb-6 text-left'>
            <Label htmlFor={id} className='block mb-2 text-lg'>
                {label}
            </Label>
            <div className='relative group w-full'>
                <div className='pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.18),rgba(168,85,247,0.12)_35%,rgba(34,211,238,0.10)_70%,transparent_80%)] blur-xl opacity-90 group-focus-within:opacity-0 transition-opacity' />
                <AutoHeightTextarea
                    id={id}
                    name={id}
                    placeholder={placeholder || t("placeholder")}
                    className='relative z-10 w-full pl-4 pr-15 py-2 text-white placeholder:text-white/70 bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-cyan-500/15 backdrop-blur-xl border border-border/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/40 rounded-2xl resize-y shadow-[0_10px_30px_-10px_rgba(56,189,248,0.35)] resize-none'
                    onChange={(e) => setQuestion(e.target.value)}
                    value={question}
                    defaultValue={defaultValue}
                    onKeyDown={handleKeyDown}
                />
                <Button
                    onClick={handleStartReading}
                    disabled={!question.trim() && !defaultValue}
                    size='lg'
                    variant='ghost'
                    className='absolute bottom-0 right-0 z-20 bg-transparent hover:bg-transparent border-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed text-indigo-300 hover:text-white'
                >
                    {/* Gradient aura behind icon by default; hides on hover */}
                    <span className='pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400/50 via-purple-400/50 to-cyan-400/50 opacity-80 hover:opacity-0' />
                    <Send className='relative z-10 w-5 h-5 drop-shadow-sm' />
                </Button>
            </div>
        </div>
    )
}
