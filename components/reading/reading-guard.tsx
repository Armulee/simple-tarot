"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTarot } from "@/contexts/tarot-context"
import { toast } from "sonner"

interface ReadingGuardProps {
    children: ReactNode
}

export default function ReadingGuard({ children }: ReadingGuardProps) {
    const { question } = useTarot()
    const router = useRouter()

    useEffect(() => {
        // Check if there's no question and redirect to homepage
        if (!question || question.trim() === "") {
            toast.info("Please ask a question first", {
                description: "Redirecting to homepage to input your question",
                duration: 3000,
            })

            // Add a small delay to show the toast before redirecting
            setTimeout(() => {
                router.push("/")
            })
        }
    }, [question, router])

    // If no question, don't render children (will redirect)
    if (!question || question.trim() === "") {
        return null
    }

    // Render children if question exists
    return (
        <div className='relative overflow-hidden relative z-10 max-w-4xl mx-auto px-6 pb-16'>
            {children}
        </div>
    )
}
