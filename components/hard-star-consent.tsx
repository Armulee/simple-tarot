"use client"

import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Shield, Cookie, Eye, Sparkle } from "lucide-react"

interface HardStarConsentProps {
    open: boolean
    onAccept: () => void
}

export default function HardStarConsent({ open, onAccept }: HardStarConsentProps) {
    const [isAccepting, setIsAccepting] = useState(false)

    const handleAccept = async () => {
        setIsAccepting(true)
        try {
            // Generate a new DID by calling the API (reusing the same logic as StarConsent)
            await fetch("/api/device/init", { method: "POST" })
            onAccept()
        } catch (error) {
            console.error("Failed to generate DID:", error)
            // Still call onAccept to proceed
            onAccept()
        } finally {
            setIsAccepting(false)
        }
    }

    return (
        <Sheet open={open}>
            <SheetContent 
                side="bottom" 
                className="h-auto max-h-[80vh] overflow-y-auto [&>button]:!hidden"
            >
                <div className="flex flex-col items-center text-center space-y-6 py-8">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative">
                        <Shield className="w-8 h-8 text-primary" />
                        {/* Sparkle effects */}
                        <Sparkle className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-ping" style={{ animationDelay: "0.5s" }} />
                        <Sparkle className="absolute -bottom-1 -left-1 w-2 h-2 text-yellow-400 animate-ping" style={{ animationDelay: "1.2s" }} />
                    </div>

                    {/* Header */}
                    <SheetHeader className="space-y-4">
                        <SheetTitle className="text-2xl font-bold text-yellow-300 font-serif">
                            Device Identification Required
                        </SheetTitle>
                        <SheetDescription className="text-base leading-relaxed max-w-md text-white/85">
                            To provide you with the best experience and ensure proper functionality, 
                            we need to create a unique device identifier for your browser.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Content */}
                    <div className="space-y-6 max-w-lg">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <Cookie className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-left">
                                    <h4 className="font-semibold text-sm text-yellow-300">What we collect:</h4>
                                    <p className="text-sm text-white/70 mt-1">
                                        A unique device identifier (DID) stored locally in your browser to track your tarot readings and prevent duplicate star awards.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3">
                                <Eye className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-left">
                                    <h4 className="font-semibold text-sm text-yellow-300">How we use it:</h4>
                                    <p className="text-sm text-white/70 mt-1">
                                        To identify you as the owner of your tarot readings and ensure you don&apos;t earn stars from viewing your own shared links.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 rounded-lg p-4 border border-yellow-400/20">
                            <p className="text-sm text-white/70">
                                <strong className="text-yellow-300">Note:</strong> This identifier is stored locally in your browser and is not shared with third parties. 
                                You can clear it anytime by clearing your browser&apos;s local storage.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <SheetFooter className="w-full">
                        <Button 
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full sm:w-auto min-w-[200px] bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)]"
                            size="lg"
                        >
                            {isAccepting ? "Setting up..." : "Accept & Continue"}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}