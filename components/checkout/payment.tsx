interface PaymentStepProps {
    summary?: {
        label: string
        total: number
    } | null
    flowContainerRef: React.RefObject<HTMLDivElement | null>
}

export default function Payment({
    summary,
    flowContainerRef,
}: PaymentStepProps) {
    return (
        <div className='space-y-4'>
            <div className='flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10'>
                <div>
                    <div className='text-white/60 text-[10px]'>
                        Selected package
                    </div>
                    <div className='font-semibold'>
                        {summary?.label || "Plan"}
                    </div>
                </div>
                <div className='text-right'>
                    <div className='text-[10px] text-white/60'>Amount due</div>
                    <div className='font-semibold'>
                        ${(summary?.total || 0).toFixed(2)}
                    </div>
                </div>
            </div>
            <div className='relative min-h-[240px]'>
                <div
                    id='flow-container'
                    ref={flowContainerRef}
                    className='bg-transparent'
                />
            </div>
        </div>
    )
}
