"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export default function HomeRefHandler() {
    const searchParams = useSearchParams()

    useEffect(() => {
        const ref = searchParams.get("ref")
        if (ref) {
            // Save referral code to localStorage
            localStorage.setItem("referral_code", ref)
            console.log("Referral code saved:", ref)
        }
    }, [searchParams])

    return null
}