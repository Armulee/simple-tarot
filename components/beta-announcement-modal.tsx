"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkle } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "beta-announcement-seen"

export function BetaAnnouncementModal() {
    const [open, setOpen] = useState(false)

    useEffect(() => {
        // Check if user has seen the announcement
        const hasSeen = localStorage.getItem(STORAGE_KEY)
        if (!hasSeen) {
            // Small delay to ensure smooth page load
            setTimeout(() => {
                setOpen(true)
            }, 500)
        }
    }, [])

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        // If dialog is being closed, mark as seen in localStorage
        if (!isOpen) {
            localStorage.setItem(STORAGE_KEY, "true")
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <BetaDialog className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 relative overflow-hidden'>
                <DialogHeader className='text-center space-y-4'>
                    <DialogTitle className='text-yellow-300 font-serif text-xl'>
                        Beta Testing Notice
                    </DialogTitle>
                    <DialogDescription className='text-white/85 text-center leading-relaxed space-y-3'>
                        <p>
                            Welcome to our platform! We&apos;re currently in beta
                            testing, which means you might experience several bugs
                            or unexpected behavior while using our services.
                        </p>
                        <p className='text-sm text-white/75'>
                            We appreciate your patience and feedback as we work to
                            improve the experience. If you encounter any issues,
                            please don&apos;t hesitate to reach out to our support
                            team.
                        </p>
                    </DialogDescription>
                </DialogHeader>
                <div className='flex justify-center mt-6'>
                    <Button
                        onClick={() => handleOpenChange(false)}
                        className='px-6 py-2 rounded-md bg-gradient-to-r from-yellow-400 to-yellow-600 text-black border border-yellow-500/40 hover:from-yellow-300 hover:to-yellow-500 shadow-[0_12px_30px_-10px_rgba(234,179,8,0.45)] font-medium'
                    >
                        I Understand
                    </Button>
                </div>
            </BetaDialog>
        </Dialog>
    )
}

function BetaDialog({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    return (
        <DialogContent
            className={cn(
                "max-w-lg w-[92vw] border border-yellow-400/20 bg-gradient-to-br from-[#0a0a1a]/95 via-[#0d0b1f]/90 to-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(234,179,8,0.35)]",
                className
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
            <div className='pointer-events-none absolute inset-0 opacity-40'>
                <div className='cosmic-stars-layer-3' />
                <div className='cosmic-stars-layer-4' />
                <div className='cosmic-stars-layer-5' />
            </div>
            {/* Golden aura behind dialog */}
            <div className='pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-br from-yellow-300/25 via-yellow-500/15 to-transparent blur-3xl animate-pulse' />
            <div
                className='pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-gradient-to-tl from-yellow-400/20 via-yellow-600/10 to-transparent blur-[100px] animate-pulse'
                style={{ animationDelay: "0.8s" }}
            />

            {children}
        </DialogContent>
    )
}
