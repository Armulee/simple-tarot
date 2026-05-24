"use client"

import { STAR_FIELD } from "./constants"

export function Backdrop() {
    return (
        <div
            aria-hidden
            className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
        >
            <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#241a4a_0%,_#0a0a1a_45%,_#000_100%)]' />
            <div className='absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl' />
            <div className='absolute top-1/3 -right-40 h-[24rem] w-[24rem] rounded-full bg-amber-500/15 blur-3xl' />
            <div className='absolute bottom-0 left-1/2 -translate-x-1/2 h-[20rem] w-[40rem] rounded-full bg-indigo-700/15 blur-3xl' />

            <div className='absolute inset-0'>
                {STAR_FIELD.map((dot, i) => (
                    <div
                        key={i}
                        className='absolute rounded-full bg-white animate-pulse'
                        style={{
                            top: dot.top,
                            left: dot.left,
                            width: dot.size,
                            height: dot.size,
                            opacity: dot.opacity,
                            animationDelay: `${(i % 9) * 0.4}s`,
                            animationDuration: `${3 + (i % 5)}s`,
                            boxShadow:
                                dot.size > 2
                                    ? "0 0 6px rgba(255,255,255,0.6)"
                                    : undefined,
                        }}
                    />
                ))}
            </div>

            <svg
                className='absolute inset-0 h-full w-full opacity-[0.025] mix-blend-overlay'
                xmlns='http://www.w3.org/2000/svg'
            >
                <filter id='calendar-noise'>
                    <feTurbulence
                        type='fractalNoise'
                        baseFrequency='0.9'
                        numOctaves='2'
                        seed='4'
                    />
                </filter>
                <rect
                    width='100%'
                    height='100%'
                    filter='url(#calendar-noise)'
                />
            </svg>
        </div>
    )
}
