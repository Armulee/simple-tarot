import { useTarot } from "@/contexts/tarot-context"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export default function QuickInsight({
    index = 0,
    className = "",
}: {
    cardName: string
    positionMeaning: string
    question: string
    index?: number
    className?: string
}) {
    const t = useTranslations("Home")
    const { cardInsights } = useTarot()
    const insight = cardInsights?.[index]

    if (insight) {
        return (
            <div
                className={`px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md relative group/insight animate-fade-in shadow-lg ${className}`}
            >
                {/* Decorative corner accents */}
                <div className='absolute -top-1 -left-1 w-2 h-2 border-t border-l border-primary/40 rounded-tl-sm' />
                <div className='absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-primary/40 rounded-br-sm' />

                {/* Left arrow/tail for side-by-side layout (only on md+) */}
                <div className='hidden md:block absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500/10 border-l border-b border-indigo-500/20 rotate-45 -translate-x-1/2 backdrop-blur-md' />

                <p className='text-[10px] font-serif italic text-indigo-100 text-left leading-relaxed tracking-tight relative z-10'>
                    &ldquo;{insight}&rdquo;
                </p>

                <div className='absolute -inset-1 bg-primary/10 blur-md rounded-full opacity-0 group-hover/insight:opacity-100 transition-opacity duration-700' />
            </div>
        )
    }

    return (
        <div
            className={`flex items-center justify-center min-h-[32px] ${className}`}
        >
            <div className='relative flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5'>
                <Loader2 className='w-3 h-3 animate-spin text-primary' />
                <span className='text-[10px] font-medium tracking-tighter text-white/40 uppercase'>
                    {`${t("consulting")}...`}
                </span>
            </div>
        </div>
    )
}
