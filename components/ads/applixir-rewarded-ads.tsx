"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Script from "next/script"
import { Button } from "@/components/ui/button"

type AdStatus = {
    type: string
    message?: string
}

interface ApplixirRewardedAdsProps {
    onComplete?: () => void
    onSkip?: () => void
    onError?: (message: string) => void
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
    onError,
    buttonText = "Watch Ad",
    className,
    autoShowOnMount,
    hideButton,

    anchorId = "applixir-anchor",
}: ApplixirRewardedAdsProps) {
    const [sdkReady, setSdkReady] = useState(false)
    const mountedRef = useRef(false)
    const hasOpenedRef = useRef(false)

    // Local callbacks (Step 4)
    const handleAdStatus = useCallback(
        (status: AdStatus) => {
            if (!status) return
            if (status.type === "complete") {
                onComplete?.()
            } else if (status.type === "skipped") {
                onSkip?.()
            }
        },
        [onComplete, onSkip]
    )

    const handleAdError = useCallback(
        (error: unknown) => {
            try {
                let message = "Applixir ad failed"
                if (typeof error === "object" && error !== null) {
                    const obj = error as Record<string, unknown>
                    const maybeGetError = obj["getError"]
                    if (typeof maybeGetError === "function") {
                        const result = maybeGetError.call(obj) as unknown
                        if (typeof result === "object" && result !== null) {
                            const resultObj = result as Record<string, unknown>
                            const data = resultObj["data"]
                            const code = (resultObj["code"] ??
                                resultObj["errorCode"]) as unknown
                            const msg = (resultObj["message"] ??
                                resultObj["errorMessage"]) as unknown
                            if (code || msg) {
                                const codeStr = code != null ? String(code) : ""
                                const msgStr =
                                    msg != null
                                        ? String(msg)
                                        : String(data ?? "")
                                message = codeStr
                                    ? `AdError ${codeStr}: ${msgStr}`
                                    : msgStr || "Applixir ad failed"
                            } else if (data != null) {
                                message = String(data)
                            } else {
                                try {
                                    message = JSON.stringify(resultObj)
                                } catch {
                                    message = String(result)
                                }
                            }
                        } else {
                            message = String(result)
                        }
                    } else if (typeof obj["message"] === "string") {
                        message = String(obj["message"])
                    } else {
                        try {
                            message = JSON.stringify(obj)
                        } catch {
                            message = String(obj)
                        }
                    }
                } else if (error != null) {
                    message = String(error)
                }
                onError?.(message)
                // Accelerate fallback for no-fill cases in dev
                if (/303|No Ads/i.test(message)) {
                    onSkip?.()
                }
            } catch {
                onError?.("Applixir ad failed")
            }
        },
        [onError, onSkip]
    )

    // Initialize (Step 3) & open on demand
    const showAd = useCallback(() => {
        if (!sdkReady || typeof window.initializeAndOpenPlayer !== "function") {
            onError?.("Applixir SDK not loaded yet")
            return
        }

        const options = {
            apiKey: process.env.NEXT_PUBLIC_APPLIXIR_API_KEY,
            injectionElementId: anchorId, // Step 2: Anchor
            adStatusCallbackFn: handleAdStatus, // Step 4
            adErrorCallbackFn: handleAdError, // Step 4
        }

        try {
            window.initializeAndOpenPlayer?.(options)
            hasOpenedRef.current = true
        } catch (e: unknown) {
            handleAdError(e)
        }
    }, [sdkReady, anchorId, handleAdStatus, handleAdError, onError])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

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
            {/* Dev-safe consent stubs to prevent __gpp errors locally */}
            <Script id='consent-stub' strategy='afterInteractive'>
                {`
                  (function(){
                    try {
                      if (typeof window.__gpp !== 'function') {
                        window.__gpp = function(){ return; };
                      }
                      if (typeof window.__tcfapi !== 'function') {
                        window.__tcfapi = function(){ return; };
                      }
                    } catch(e) {}
                  })();
                `}
            </Script>
            <Script
                src='https://cdn.applixir.com/applixir.app.v6.0.1.js'
                strategy='afterInteractive'
                onReady={() => setSdkReady(true)}
                onError={() => onError?.("Failed to load Applixir SDK")}
            />

            {!hideButton && (
                <Button onClick={showAd} disabled={!sdkReady} className='px-6'>
                    {sdkReady ? buttonText : "Loading Ad..."}
                </Button>
            )}
        </div>
    )
}
