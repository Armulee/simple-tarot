import Image from "next/image"

type CosmicCenteredLoaderProps = {
    label: string
    variant?: "page" | "embedded"
    className?: string
}

export default function CosmicCenteredLoader({
    label,
    variant = "page",
    className,
}: CosmicCenteredLoaderProps) {
    const wrapperClassName =
        variant === "embedded"
            ? "flex min-h-[320px] flex-col items-center justify-center px-6 py-10"
            : "min-h-[calc(100dvh-64px)] flex flex-col items-center justify-center px-6"

    return (
        <div className={`${wrapperClassName}${className ? ` ${className}` : ""}`}>
            <div className='relative h-52 w-52'>
                <div
                    aria-hidden
                    className='absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.20),transparent_60%)] blur-2xl'
                />

                <span
                    aria-hidden
                    className='absolute inset-0 rounded-full border border-white/10 animate-[spin_18s_linear_infinite]'
                >
                    <span className='absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-200 shadow-[0_0_14px_rgba(252,211,77,0.9)]' />
                </span>

                <span
                    aria-hidden
                    className='absolute inset-5 rounded-full border border-amber-300/25 animate-[spin_11s_linear_infinite_reverse]'
                >
                    <span className='absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-sky-200 shadow-[0_0_10px_rgba(125,211,252,0.9)]' />
                </span>

                <span
                    aria-hidden
                    className='absolute inset-10 rounded-full border border-violet-400/30 animate-[spin_7s_linear_infinite]'
                >
                    <span className='absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rose-200 shadow-[0_0_10px_rgba(254,205,211,0.9)]' />
                </span>

                <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='relative h-16 w-16'>
                        <span
                            aria-hidden
                            className='absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(125,211,252,0.55),rgba(14,165,233,0.25),transparent_70%)] blur-md'
                        />
                        <span className='absolute -inset-1 rounded-full ring-1 ring-sky-300/40' />
                        <Image
                            src='/assets/planetary/earth.png'
                            alt=''
                            aria-hidden
                            width={64}
                            height={64}
                            priority
                            className='relative h-16 w-16 rounded-full object-cover animate-[spin_24s_linear_infinite] drop-shadow-[0_8px_22px_rgba(56,189,248,0.55)]'
                        />
                    </div>
                </div>
            </div>

            <div className='mt-10 inline-flex items-center justify-center gap-3'>
                <span className='h-px w-6 bg-gradient-to-r from-transparent to-amber-300/60' />
                <p className='text-[10px] font-medium uppercase tracking-[0.32em] text-amber-200/80'>
                    AskingFate
                </p>
                <span className='h-px w-6 bg-gradient-to-l from-transparent to-amber-300/60' />
            </div>
            <div className='mt-3 font-serif italic text-xl text-white/90'>
                {label}
            </div>
            <div className='mt-1.5 flex items-center justify-center gap-1'>
                <span className='h-1 w-1 rounded-full bg-white/45 animate-pulse [animation-delay:0ms]' />
                <span className='h-1 w-1 rounded-full bg-white/45 animate-pulse [animation-delay:150ms]' />
                <span className='h-1 w-1 rounded-full bg-white/45 animate-pulse [animation-delay:300ms]' />
            </div>
        </div>
    )
}
