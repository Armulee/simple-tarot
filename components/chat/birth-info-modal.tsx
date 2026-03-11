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
    onRemove?: () => void
    title: string
    submitLabel: string
}

export default function BirthInfoModal({
    open,
    onOpenChange,
    initial,
    currentLocation,
    onSubmit,
    onRemove,
    title,
    submitLabel,
}: BirthInfoModalProps) {
    const handleSubmit = (value: HoroscopeBirthData) => {
        onSubmit(value)
        onOpenChange(false)
    }

    const handleRemove = () => {
        onRemove?.()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-h-[90vh] overflow-y-auto border-white/10 bg-[#0a0912]'>
                <DialogTitle className='sr-only'>{title}</DialogTitle>
                <InlineUserDateForm
                    initial={initial}
                    currentLocation={currentLocation}
                    onSubmit={handleSubmit}
                    onRemove={handleRemove}
                    title={title}
                    submitLabel={submitLabel}
                    alwaysSave
                />
            </DialogContent>
        </Dialog>
    )
}
