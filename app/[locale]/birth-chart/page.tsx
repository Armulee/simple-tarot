import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import PersonalBirthChart from "@/components/birth-chart/personal-chart"

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Meta.BirthChart")
    return {
        title: t("title"),
        description: t("description"),
    }
}

export default function MyBirthChartPage() {
    return (
        <div className='relative min-h-[calc(100dvh-64px)] overflow-hidden'>
            <CosmicBackdrop />
            <div className='relative z-10'>
                <PersonalBirthChart />
            </div>
        </div>
    )
}

function CosmicBackdrop() {
    const stars = buildStarField("birth-chart-page", 110)
    const spokes = Array.from({ length: 12 }, (_, i) => i * 30)

    return (
        <div
            aria-hidden
            className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
        >
            <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1b1f3a_0%,_#0a0d1f_55%,_#04060f_100%)]' />
            <div className='absolute -top-32 left-1/2 h-[520px] w-[680px] -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px]' />
            <div className='absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-[120px]' />
            <div className='absolute top-1/2 right-0 h-[360px] w-[360px] rounded-full bg-indigo-500/20 blur-[120px]' />

            <svg
                className='absolute inset-0 h-full w-full opacity-70'
                viewBox='0 0 100 100'
                preserveAspectRatio='none'
            >
                {stars.map((s) => (
                    <circle
                        key={s.id}
                        cx={s.x}
                        cy={s.y}
                        r={s.r}
                        fill='white'
                        opacity={s.o}
                    />
                ))}
            </svg>

            <svg
                className='absolute left-1/2 top-24 h-[80vh] w-[120vh] max-w-none -translate-x-1/2 opacity-30'
                viewBox='0 0 1000 1000'
                preserveAspectRatio='xMidYMid meet'
            >
                <defs>
                    <radialGradient
                        id='bc-page-core'
                        cx='50%'
                        cy='50%'
                        r='50%'
                    >
                        <stop
                            offset='0%'
                            stopColor='rgba(252,211,77,0.35)'
                        />
                        <stop
                            offset='80%'
                            stopColor='rgba(252,211,77,0)'
                        />
                    </radialGradient>
                </defs>
                {[180, 240, 300, 360, 420].map((rx) => (
                    <ellipse
                        key={rx}
                        cx={500}
                        cy={500}
                        rx={rx}
                        ry={rx * 0.82}
                        fill='none'
                        stroke='rgba(203,213,225,0.22)'
                        strokeWidth={1}
                    />
                ))}
                {spokes.map((angle) => {
                    const rad = (angle * Math.PI) / 180
                    const x = 500 + 420 * Math.cos(rad)
                    const y = 500 + 420 * 0.82 * Math.sin(rad)
                    return (
                        <line
                            key={angle}
                            x1={500}
                            y1={500}
                            x2={x}
                            y2={y}
                            stroke='rgba(255,255,255,0.08)'
                            strokeWidth={0.7}
                        />
                    )
                })}
                <circle
                    cx={500}
                    cy={500}
                    r={60}
                    fill='url(#bc-page-core)'
                />
            </svg>
        </div>
    )
}

function buildStarField(seed: string, count: number) {
    let s = 0
    for (let i = 0; i < seed.length; i++) {
        s = (s * 31 + seed.charCodeAt(i)) >>> 0
    }
    const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 0xffffffff
    }
    return Array.from({ length: count }, (_, id) => ({
        id,
        x: rand() * 100,
        y: rand() * 100,
        r: rand() * 0.45 + 0.15,
        o: rand() * 0.55 + 0.2,
    }))
}
