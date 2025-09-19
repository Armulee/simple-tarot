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
import { useAuth } from "./auth-context"
import { useStars } from "./stars-context"

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
        | "ad-viewing"
        | "interpretation"
    setCurrentStep: (
        step:
            | "reading-type"
            | "card-selection"
            | "ad-viewing"
            | "interpretation"
    ) => void

    // Interpretation result
    interpretation: string | null
    setInterpretation: (interpretation: string | null) => void

    // Follow-up state
    isFollowUp: boolean
    followUpQuestion: string | null
    setIsFollowUp: (value: boolean) => void
    setFollowUpQuestion: (value: string | null) => void

    // Stars integration
    canAffordReading: boolean
    readingCost: number
    processReading: () => Promise<{ success: boolean; message: string }>

    // Reset function
    resetReading: () => void

    // Clear localStorage function (for new readings)
    clearReadingStorage: () => void
    
    // Clear interpretation state and localStorage (for new card selections)
    clearInterpretationState: () => void
}

const TarotContext = createContext<TarotContextType | undefined>(undefined)

export function TarotProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const { stars, useStarsForReading } = useStars()
    const [question, setQuestion] = useState<string | null>(null)
    const [readingType, setReadingType] = useState<ReadingType | null>(null)
    const [selectedCards, setSelectedCards] = useState<TarotCard[]>([])
    const [currentStep, setCurrentStep] = useState<
        "reading-type" | "card-selection" | "ad-viewing" | "interpretation"
    >("reading-type")
    const [interpretation, setInterpretation] = useState<string | null>(null)
    const [isFollowUp, setIsFollowUp] = useState(false)
    const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(
        null
    )
    const [isClearing, setIsClearing] = useState(false)
    const pathname = usePathname()

    const readingCost = 2
    const canAffordReading = stars >= readingCost

    const STORAGE_KEY = "reading-state-v1"

    const resetReading = () => {
        setQuestion("")
        setReadingType(null)
        setSelectedCards([])
        setCurrentStep("reading-type")
        setInterpretation(null)
        setIsFollowUp(false)
        setFollowUpQuestion(null)
    }

    const clearReadingStorage = () => {
        try {
            setIsClearing(true)
            localStorage.removeItem(STORAGE_KEY)
            localStorage.removeItem(STORAGE_KEY + "-backup")
            // Also reset the in-memory state to ensure clean slate
            resetReading()
            // Reset the clearing flag after a brief delay
            setTimeout(() => setIsClearing(false), 100)
        } catch (e) {
            console.error("Failed to clear reading storage:", e)
            setIsClearing(false)
        }
    }

    const clearInterpretationState = () => {
        try {
            setIsClearing(true)
            // Only clear interpretation-related localStorage data
            localStorage.removeItem(STORAGE_KEY + "-backup")
            // Clear interpretation state
            setInterpretation(null)
            // Reset the clearing flag after a brief delay
            setTimeout(() => setIsClearing(false), 100)
        } catch (e) {
            console.error("Failed to clear interpretation state:", e)
            setIsClearing(false)
        }
    }

    const processReading = async (): Promise<{ success: boolean; message: string }> => {
        if (!canAffordReading) {
            return {
                success: false,
                message: `You need ${readingCost} stars for a reading. You have ${stars} stars.`
            }
        }

        // Deduct stars before processing the reading
        const result = await useStarsForReading(readingCost)
        if (!result.success) {
            return result
        }

        // Move to interpretation step
        setCurrentStep("interpretation")
        return {
            success: true,
            message: `Reading started! ${readingCost} stars deducted.`
        }
    }

    // Restore reading state when entering /reading (supports locale prefixes)
    useEffect(() => {
        if (typeof window === "undefined") return
        if (!pathname || !pathname.includes("/reading")) return
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (raw) {
                const data = JSON.parse(raw) as {
                    question?: string
                    readingType?: ReadingType | null
                    selectedCards?: TarotCard[]
                    currentStep?: TarotContextType["currentStep"]
                    interpretation?: string | null
                    isFollowUp?: boolean
                    followUpQuestion?: string | null
                }
                if (data.question !== undefined) setQuestion(data.question)
                if (data.readingType !== undefined)
                    setReadingType(data.readingType ?? null)
                if (Array.isArray(data.selectedCards))
                    setSelectedCards(data.selectedCards)
                if (data.currentStep) setCurrentStep(data.currentStep)
                if (data.interpretation !== undefined)
                    setInterpretation(data.interpretation ?? null)
                if (data.isFollowUp !== undefined)
                    setIsFollowUp(!!data.isFollowUp)
                if (data.followUpQuestion !== undefined)
                    setFollowUpQuestion(data.followUpQuestion ?? null)
            }
        } catch {
            // ignore corrupt storage
        }
        // If nothing was restored, explicitly mark as empty to allow guard to decide
        setQuestion((prev) => (prev === null ? "" : prev))
    }, [pathname])

    // Persist reading state while on /reading (supports locale prefixes)
    useEffect(() => {
        if (typeof window === "undefined") return
        if (!pathname || !pathname.includes("/reading")) return
        if (isClearing) return // Don't save during clearing process
        if (question === null) return // Skip until hydration completes
        try {
            const payload = JSON.stringify({
                question,
                readingType,
                selectedCards,
                currentStep,
                interpretation,
                isFollowUp,
                followUpQuestion,
            })
            localStorage.setItem(STORAGE_KEY, payload)
        } catch {
            // ignore quota errors
        }
    }, [
        question,
        readingType,
        selectedCards,
        currentStep,
        interpretation,
        isFollowUp,
        followUpQuestion,
        pathname,
        isClearing,
    ])

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
                isFollowUp,
                followUpQuestion,
                setIsFollowUp,
                setFollowUpQuestion,
                canAffordReading,
                readingCost,
                processReading,
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
