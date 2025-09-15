import type { ReadingType } from "@/contexts/tarot-context"

export type ReadingConfig = Record<
    ReadingType,
    {
        title: string
        description: string
        cards: number
    }
>
