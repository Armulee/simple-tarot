"use client"

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog"
import InlineUserDateForm from "@/components/astrology/inline-user-date-form"
import type { HoroscopeBirthData } from "@/types/horoscope"

type BirthInfoModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial: HoroscopeBirthData | null
    currentLocation?: {
        country?: string
        state?: string
        lat?: number
        lng?: number
        timezone?: number
    } | null
    onSubmit: (value: HoroscopeBirthData) => void
    title: string
    submitLabel: string
    /** Called when user clicks remove (X) - e.g. to clear savedBirth state */
    onRemove?: () => void
}

export default function BirthInfoModal({
    open,
    onOpenChange,
    initial,
    currentLocation,
    onSubmit,
    title,
    submitLabel,
    onRemove,
}: BirthInfoModalProps) {
    const handleSubmit = (value: HoroscopeBirthData) => {
        onSubmit(value)
        onOpenChange(false)
    }

    const handleRemove = () => {
        onOpenChange(false)
        onRemove?.()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-h-[90vh] overflow-y-auto border-white/10 bg-[#0a0912]'>
                <DialogTitle className='sr-only'>{title}</DialogTitle>
                <InlineUserDateForm
                    initial={initial}
                    currentLocation={currentLocation}
                    onSubmit={handleSubmit}
                    title={title}
                    submitLabel={submitLabel}
                    alwaysSave
                    onRemove={handleRemove}
                />
            </DialogContent>
        </Dialog>
    )
}
