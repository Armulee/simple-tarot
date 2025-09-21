"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"

interface ApplixirRewardedAdsProps {
    onComplete?: () => void
    onSkip?: () => void
    buttonText?: string
    className?: string
    // Auto open the ad when component mounts (after SDK is ready)
    autoShowOnMount?: boolean
    // Hide the call-to-action button (useful when auto-showing)
    hideButton?: boolean
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
    onSkip,
    buttonText = "Watch Ad",
    className,
    autoShowOnMount,
    hideButton,
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
                console.log("OUTSIDE Ad status: ", status)
                if (status.type === "complete") {
                    onComplete?.()
                } else if (status.type === "skipped") {
                    onSkip?.()
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
    }, [sdkReady, anchorId, onComplete, onSkip])

    // Auto show once the SDK is ready
    useEffect(() => {
        if (!autoShowOnMount) return
        if (!sdkReady) return
        if (hasOpenedRef.current) return
        showAd()
    }, [autoShowOnMount, sdkReady, showAd])

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

            {!hideButton && (
                <Button onClick={showAd} disabled={!sdkReady} className='px-6'>
                    {sdkReady ? buttonText : "Loading Ad..."}
                </Button>
            )}
        </div>
    )
}
