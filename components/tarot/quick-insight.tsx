import { useTarot } from "@/contexts/tarot-context"
import { Loader2 } from "lucide-react"

export default function QuickInsight({
    index = 0,
}: {
    cardName: string
    positionMeaning: string
    question: string
    index?: number
}) {
    const { cardInsights } = useTarot()
    const insight = cardInsights?.[index]

    if (insight) {
        return (
            <div className='mt-3 px-4 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 backdrop-blur-sm relative group/insight animate-fade-in max-w-[160px]'>
                {/* Decorative corner accents */}
                <div className='absolute -top-1 -left-1 w-2 h-2 border-t border-l border-primary/30 rounded-tl-sm' />
                <div className='absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-primary/30 rounded-br-sm' />

                <p className='text-[11px] font-serif italic text-indigo-100/80 text-center leading-relaxed tracking-tight relative z-10'>
                    &ldquo;{insight}&rdquo;
                </p>

                <div className='absolute -inset-1 bg-primary/5 blur-md rounded-full opacity-0 group-hover/insight:opacity-100 transition-opacity duration-700' />
            </div>
        )
    }

    return (
        <div className='mt-3 flex items-center justify-center min-h-[32px]'>
            <div className='relative flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5'>
                <Loader2 className='w-3 h-3 animate-spin text-primary' />
                <span className='text-[10px] font-medium tracking-tighter text-white/40 uppercase'>
                    Consulting...
                </span>
            </div>
        </div>
    )
}
