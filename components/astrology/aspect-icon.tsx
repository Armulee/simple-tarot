import { Layers, Minus, MoveHorizontal, Square, Triangle } from "lucide-react"

export function AspectIcon({
    aspectType,
    className = "h-4 w-4 text-cyan-200",
}: {
    aspectType: string
    className?: string
}) {
    if (aspectType === "conjunction") return <Layers className={className} />
    if (aspectType === "opposition")
        return <MoveHorizontal className={className} />
    if (aspectType === "square") return <Square className={className} />
    if (aspectType === "trine") return <Triangle className={className} />
    return <Minus className={className} />
}
