import { CheckCircle } from "lucide-react"

interface SuccessStepProps {
    paymentResult: {
        added?: number
        newBalance?: number
    }
}

export default function Success({ paymentResult }: SuccessStepProps) {
    return (
        <div className='space-y-4'>
            <div className='p-6 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-emerald-600/10 to-emerald-700/10'>
                <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 grid place-items-center'>
                        <CheckCircle className='w-6 h-6 text-emerald-300' />
                    </div>
                    <div>
                        <div className='font-semibold'>Payment successful</div>
                        <div className='text-sm text-white/80'>
                            {typeof paymentResult.added === "number" &&
                            paymentResult.added > 0
                                ? `+${paymentResult.added} stars added to your balance.`
                                : "Your balance has been updated."}
                        </div>
                    </div>
                </div>
                <div className='mt-3 p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-sm'>
                    <span className='text-white/80'>New balance</span>
                    <span className='font-semibold'>
                        {typeof paymentResult.newBalance === "number"
                            ? paymentResult.newBalance
                            : "Updated"}
                    </span>
                </div>
            </div>
        </div>
    )
}
