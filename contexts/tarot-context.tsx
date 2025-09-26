"use client"

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
    type Dispatch,
    type SetStateAction,
} from "react"
import { usePathname } from "next/navigation"

export type ReadingType = "simple" | "intermediate" | "advanced"

export interface TarotCard {
    id: number
    name: string
    image: string
    meaning: string
    isReversed: boolean
}

export interface TarotContextType {
    // Question state
    question: string | null
    setQuestion: Dispatch<SetStateAction<string | null>>

    // Reading type state
    readingType: ReadingType | null
    setReadingType: (type: ReadingType) => void

    // Selected cards state
    selectedCards: TarotCard[]
    setSelectedCards: (cards: TarotCard[]) => void

    // Current step in the reading process
    currentStep:
        | "reading-type"
        | "card-selection"
        | "interpretation"
    setCurrentStep: (
        step:
            | "reading-type"
            | "card-selection"
            | "interpretation"
    ) => void

    // Interpretation result
    interpretation: string | null
    setInterpretation: (interpretation: string | null) => void

    // Star payment status for current interpretation run
    paidForInterpretation: boolean
    setPaidForInterpretation: (value: boolean) => void

    // Follow-up state
    isFollowUp: boolean
    followUpQuestion: string | null
    setIsFollowUp: (value: boolean) => void
    setFollowUpQuestion: (value: string | null) => void

    // Reset function
    resetReading: () => void

    // Clear in-memory reading state
    clearReadingStorage: () => void
    
    // Clear interpretation state (for new card selections)
    clearInterpretationState: () => void
}

const TarotContext = createContext<TarotContextType | undefined>(undefined)

export function TarotProvider({ children }: { children: ReactNode }) {
    const [question, setQuestion] = useState<string | null>(null)
    const [readingType, setReadingType] = useState<ReadingType | null>(null)
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([])
    const [currentStep, setCurrentStep] = useState<
        "reading-type" | "card-selection" | "interpretation"
    >("reading-type")
    const [interpretation, setInterpretation] = useState<string | null>(null)
    const [paidForInterpretation, setPaidForInterpretation] = useState(false)
    const [isFollowUp, setIsFollowUp] = useState(false)
    const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(
        null
    )
    const [isClearing, setIsClearing] = useState(false)
    const pathname = usePathname()

    // Removed localStorage persistence; state is in-memory only

    const resetReading = () => {
        setQuestion("")
        setReadingType(null)
        setSelectedCards([])
        setCurrentStep("reading-type")
        setInterpretation(null)
        setPaidForInterpretation(false)
        setIsFollowUp(false)
        setFollowUpQuestion(null)
    }

    const clearReadingStorage = () => {
        setIsClearing(true)
        resetReading()
        setTimeout(() => setIsClearing(false), 50)
    }

    const clearInterpretationState = () => {
        setIsClearing(true)
        setInterpretation(null)
        setPaidForInterpretation(false)
        setTimeout(() => setIsClearing(false), 50)
    }

    // No local persistence; ensure hydration marks question as empty string when entering reading page
    useEffect(() => {
        if (!pathname || !pathname.includes("/reading")) return
        setQuestion((prev) => (prev === null ? "" : prev))
    }, [pathname])

    // Removed local persistence

    // Preserve in-memory state across routes; do not reset on leaving /reading.
    // State will be reset only when a new question is submitted via QuestionInput.

    return (
        <TarotContext.Provider
            value={{
                question,
                setQuestion,
                readingType,
                setReadingType,
                selectedCards,
                setSelectedCards,
                currentStep,
                setCurrentStep,
                interpretation,
                setInterpretation,
                paidForInterpretation,
                setPaidForInterpretation,
                isFollowUp,
                followUpQuestion,
                setIsFollowUp,
                setFollowUpQuestion,
                resetReading,
                clearReadingStorage,
                clearInterpretationState,
            }}
        >
            {children}
        </TarotContext.Provider>
    )
}

export function useTarot() {
    const context = useContext(TarotContext)
    if (context === undefined) {
        throw new Error("useTarot must be used within a TarotProvider")
    }
    return context
}
