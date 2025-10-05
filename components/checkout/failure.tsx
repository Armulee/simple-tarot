import { XCircle } from "lucide-react"

export default function Failure() {
    return (
        <div className='space-y-4'>
            <div className='p-6 rounded-xl border border-red-400/30 bg-gradient-to-br from-red-500/10 via-rose-600/10 to-red-700/10'>
                <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-red-500/20 border border-red-400/40 grid place-items-center'>
                        <XCircle className='w-6 h-6 text-red-300' />
                    </div>
                    <div>
                        <div className='font-semibold'>Payment failed</div>
                        <div className='text-sm text-white/80'>
                            Please try again or use another method.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
