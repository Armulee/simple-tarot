import { Separator } from "@/components/ui/separator"

interface SummaryStepProps {
    summary: {
        label: string
        stars?: number
        base: number
        discount: number
        total: number
    }
    progress: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export default function Summary({ summary, progress }: SummaryStepProps) {
    const base = summary.base || 0
    const total = summary.total || 0
    const fee = round2(total * 0.025 + 0.25)
    const discountAdj = round2(Math.max(0, base - total + fee))

    return (
        <div className='space-y-4'>
            <div className='p-4 rounded-lg bg-white/5 border border-white/10'>
                <div className='flex items-center justify-between'>
                    <div>
                        <div className='text-white/60 text-[10px]'>
                            Selected package
                        </div>
                        <div className='font-semibold'>
                            {summary.label || "Plan"}
                        </div>
                    </div>
                    <div className='text-right'>
                        <div className='text-[10px] text-white/60'>
                            Amount due
                        </div>
                        <div className='font-semibold'>
                            ${(summary.total || 0).toFixed(2)}
                        </div>
                    </div>
                </div>
                <div className='mt-3'>
                    <Separator className='my-2' />
                    <div className='flex items-center justify-between text-sm'>
                        <span className='text-white/80'>Base price</span>
                        <span>${base.toFixed(2)}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                        <span className='text-white/80'>Transaction fee</span>
                        <span>${fee.toFixed(2)}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm mb-2'>
                        <span className='text-white/80'>Package discount</span>
                        <span>- ${discountAdj.toFixed(2)}</span>
                    </div>
                    <div className='flex items-center justify-between'>
                        <span className='font-semibold'>Total</span>
                        <span className='font-bold text-lg'>
                            ${total.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
            <div className='h-1 w-full rounded bg-white/10 overflow-hidden'>
                <div
                    className='h-full bg-yellow-400 transition-[width] duration-200'
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}
