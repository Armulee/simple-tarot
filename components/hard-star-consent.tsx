"use client"

import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Sparkle } from "lucide-react"
import { cn } from "@/lib/utils"

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
                className={cn(
                    "h-auto max-h-[80vh] overflow-y-auto [&>button]:!hidden",
                    "border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]",
                    "relative overflow-hidden"
                )}
            >
                {/* Beautiful ping orbs */}
                <Sparkle
                    className='absolute top-16 left-16 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "0.5s" }}
                />
                <Sparkle
                    className='absolute top-24 right-20 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "1.2s" }}
                />
                <Sparkle
                    className='absolute top-40 left-1/3 w-2.5 h-2.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "2.8s" }}
                />
                <Sparkle
                    className='absolute top-32 right-1/4 w-1.5 h-1.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "3.5s" }}
                />
                <Sparkle
                    className='absolute bottom-20 left-20 w-3.5 h-3.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "1.8s" }}
                />
                <Sparkle
                    className='absolute bottom-32 right-16 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "4.2s" }}
                />
                <Sparkle
                    className='absolute bottom-16 right-1/3 w-2.5 h-2.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "2.1s" }}
                />
                <Sparkle
                    className='absolute top-1/2 left-12 w-1.5 h-1.5 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "3.8s" }}
                />
                <Sparkle
                    className='absolute top-1/3 right-12 w-3 h-3 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "0.9s" }}
                />
                <Sparkle
                    className='absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full fill-yellow-400 opacity-50 animate-ping'
                    style={{ animationDelay: "4.7s" }}
                />

                {/* Deep-space stars background */}
                <div className='pointer-events-none absolute inset-0 opacity-20'>
                    <div className='w-full h-full bg-gradient-to-br from-yellow-400/5 via-transparent to-yellow-600/5' />
                </div>
                {/* Golden aura behind dialog */}
                <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl animate-pulse' />
                <div
                    className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px] animate-pulse'
                    style={{ animationDelay: "0.8s" }}
                />

                <div className="relative z-20 p-6 max-w-lg mx-auto min-h-[300px] flex flex-col justify-center bg-black/20 rounded-lg">
                    <SheetHeader>
                        <SheetTitle className='text-yellow-300 font-serif text-xl mb-4'>
                            Cookies Required
                        </SheetTitle>
                        <SheetDescription className='text-white/85 mb-4'>
                            We need to store a device ID to track your readings and prevent duplicate star awards.
                        </SheetDescription>
                    </SheetHeader>
                    
                    <div className='text-xs text-white/70 mb-6'>
                        This data is stored securely and not shared with third parties.
                    </div>
                    
                    <div className='flex gap-3 justify-end mt-auto'>
                        <Button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className='px-3 py-2 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)]'
                        >
                            {isAccepting ? "Setting up..." : "Accept"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}