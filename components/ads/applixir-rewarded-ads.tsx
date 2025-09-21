"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"

interface ApplixirRewardedAdsProps {
    onComplete?: () => void
    className?: string
    // Optional: override anchor id (defaults to applixir-anchor)
    anchorId?: string
}

declare global {
    interface Window {
        initializeAndOpenPlayer?: (options: Record<string, unknown>) => void
    }
}

// Next.js client component to render a rewarded video button using Applixir (Steps 2-5)
export default function ApplixirRewardedAds({
    onComplete,
    className,
    anchorId = "applixir-anchor",
}: ApplixirRewardedAdsProps) {
    const [sdkReady, setSdkReady] = useState(false)
    const hasOpenedRef = useRef(false)

    // Initialize (Step 3) & open on demand
    const showAd = useCallback(() => {
        if (!sdkReady || typeof window.initializeAndOpenPlayer !== "function") {
            console.log("Applixir SDK not loaded yet")
            return
        }

        const options = {
            apiKey: process.env.NEXT_PUBLIC_APPLIXIR_API_KEY,
            injectionElementId: anchorId, // Step 2: Anchor
            // eslint-disable-next-line
            adStatusCallbackFn: (status: any) => {
                const type = String(status?.type || "").toLowerCase()
                console.log("Applixir status:", type, status)
                // Treat these as completion: close the ad and mark complete
                if (
                    type === "complete" ||
                    type === "skip" ||
                    type === "alladscomplete" ||
                    type === "thankyoumodalclosed"
                ) {
                    onComplete?.()
                }
            }, // Step 4
            // eslint-disable-next-line
            adErrorCallbackFn: (error: any) => {
                console.log(error.getError().data)
            }, // Step 4
        }

        try {
            window.initializeAndOpenPlayer?.(options)
            hasOpenedRef.current = true
            //eslint-disable-next-line
        } catch (e: any) {
            console.log(e.getError().data)
        }
    }, [sdkReady, anchorId, onComplete])

    // Auto show once the SDK is ready
    useEffect(() => {
        if (!sdkReady) return
        if (hasOpenedRef.current) return
        showAd()
    }, [sdkReady, showAd])

    return (
        <div className={className}>
            {/* Step 2: Adding an Anchor */}
            <div id={anchorId} className='w-screen h-screen' />

            {/* Step 3: Initializing Video Ad (SDK) */}
            <Script
                src='https://cdn.applixir.com/applixir.app.v6.0.1.js'
                strategy='afterInteractive'
                onReady={() => setSdkReady(true)}
                onError={() => console.log("Failed to load Applixir SDK")}
            />
        </div>
    )
}
