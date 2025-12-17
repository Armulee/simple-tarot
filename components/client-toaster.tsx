"use client"

import { Toaster } from "sonner"
import { useEffect, useState } from "react"

export function ClientToaster() {
    const [position, setPosition] = useState<"top-center" | "bottom-center">("bottom-center")

    useEffect(() => {
        const handlePositionChange = (e: CustomEvent<{ position: "top-center" | "bottom-center" }>) => {
            setPosition(e.detail.position)
        }
        window.addEventListener("toaster-position-change" as any, handlePositionChange)
        return () => window.removeEventListener("toaster-position-change" as any, handlePositionChange)
    }, [])

    return (
        <Toaster
            position={position}
            theme='dark'
            richColors
            closeButton
        />
    )
}
