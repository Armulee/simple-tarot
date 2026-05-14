import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className='relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden'>
            <div className='mx-auto w-full max-w-3xl px-4 py-6 space-y-4'>
                {/* User message skeleton */}
                <div className='flex justify-end'>
                    <div className='w-full max-w-[80%] rounded-2xl border border-white/10 bg-white/5 p-4'>
                        <Skeleton className='h-3 w-[70%] bg-white/10' />
                        <Skeleton className='mt-2 h-3 w-[55%] bg-white/10' />
                    </div>
                </div>

                {/* Assistant message skeleton */}
                <div className='flex justify-start gap-3'>
                    <Skeleton className='h-9 w-9 rounded-full bg-white/10 shrink-0' />
                    <div className='w-full max-w-[80%] rounded-2xl border border-white/10 bg-white/5 p-4'>
                        <Skeleton className='h-3 w-[85%] bg-white/10' />
                        <Skeleton className='mt-2 h-3 w-[80%] bg-white/10' />
                        <Skeleton className='mt-2 h-3 w-[62%] bg-white/10' />
                    </div>
                </div>
            </div>
        </div>
    )
}

