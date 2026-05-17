"use client"

import { AlertTriangle, Moon, Sparkles, Sun } from "lucide-react"
import type { DayQuality } from "@/lib/calendar-helper"

export function QualityIcon({ quality }: { quality: DayQuality }) {
    switch (quality) {
        case "excellent":
            return <Sparkles className='h-3 w-3' />
        case "good":
            return <Sun className='h-3 w-3' />
        case "neutral":
            return <Moon className='h-3 w-3' />
        case "caution":
        case "avoid":
            return <AlertTriangle className='h-3 w-3' />
    }
}
