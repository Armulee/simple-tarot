"use client"

import { useEffect, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        Beta Testing Notice
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        Welcome to our platform! We&apos;re currently in beta
                        testing, which means you might experience several bugs
                        or unexpected behavior while using our services.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                        We appreciate your patience and feedback as we work to
                        improve the experience. If you encounter any issues,
                        please don&apos;t hesitate to reach out to our support
                        team.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        onClick={() => handleOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        I Understand
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
