export type RoadmapPhaseDefinition = {
    id: string
    translationKey: string
    phaseKey: string
    statusKey: "status.completed" | "status.inDevelopment" | "status.planned"
    startDate: string
    targetDate: string
    color: string
    glowColor: string
    featureIconKeys: string[]
}

export const roadmapPhases: RoadmapPhaseDefinition[] = [
    {
        id: "tarot",
        translationKey: "tarot",
        phaseKey: "phases.completed",
        statusKey: "status.completed",
        startDate: "2024-01-01",
        targetDate: "2024-12-31",
        color: "from-primary to-secondary",
        glowColor: "shadow-primary/20",
        featureIconKeys: ["BookOpen", "Sparkles", "MessageCircle"],
    },
    {
        id: "birth-chart",
        translationKey: "birthChart",
        phaseKey: "phases.dec_2025",
        statusKey: "status.inDevelopment",
        startDate: "2025-07-01",
        targetDate: "2025-12-12",
        color: "from-indigo-500 to-sky-500",
        glowColor: "shadow-indigo-500/20",
        featureIconKeys: ["BarChart3", "Compass", "MessageCircle"],
    },
    {
        id: "astrology",
        translationKey: "astrology",
        phaseKey: "phases.dec_2025",
        statusKey: "status.inDevelopment",
        startDate: "2025-07-01",
        targetDate: "2025-12-12",
        color: "from-fuchsia-500 to-rose-500",
        glowColor: "shadow-fuchsia-500/20",
        featureIconKeys: ["Orbit", "Sparkles", "MessageCircle"],
    },
    {
        id: "namelogy",
        translationKey: "namelogy",
        phaseKey: "phases.jan_2026",
        statusKey: "status.planned",
        startDate: "2025-09-15",
        targetDate: "2026-01-15",
        color: "from-amber-500 to-orange-500",
        glowColor: "shadow-amber-500/20",
        featureIconKeys: ["Type", "ShieldCheck", "Sparkles"],
    },
    {
        id: "numerology",
        translationKey: "numerology",
        phaseKey: "phases.jan_2026",
        statusKey: "status.planned",
        startDate: "2025-09-15",
        targetDate: "2026-01-15",
        color: "from-emerald-500 to-teal-500",
        glowColor: "shadow-emerald-500/20",
        featureIconKeys: ["Hash", "AlertTriangle", "Brain"],
    },
    {
        id: "lucky-colors",
        translationKey: "luckyColors",
        phaseKey: "phases.jan_2026",
        statusKey: "status.planned",
        startDate: "2025-10-01",
        targetDate: "2026-01-20",
        color: "from-cyan-500 to-blue-500",
        glowColor: "shadow-cyan-500/20",
        featureIconKeys: ["Palette", "Shirt", "Sparkles"],
    },
    {
        id: "mobile-app",
        translationKey: "mobileApp",
        phaseKey: "phases.q1_2026",
        statusKey: "status.planned",
        startDate: "2025-11-01",
        targetDate: "2026-03-31",
        color: "from-purple-500 to-indigo-500",
        glowColor: "shadow-purple-500/20",
        featureIconKeys: ["Smartphone", "Cloud", "LayoutDashboard"],
    },
    {
        id: "fated-relations",
        translationKey: "fatedRelations",
        phaseKey: "phases.q1_2026",
        statusKey: "status.planned",
        startDate: "2025-11-15",
        targetDate: "2026-03-31",
        color: "from-pink-500 to-red-500",
        glowColor: "shadow-pink-500/20",
        featureIconKeys: ["Heart", "Sparkles", "NotebookPen"],
    },
    {
        id: "palmistry",
        translationKey: "palmistry",
        phaseKey: "phases.mar_2026",
        statusKey: "status.planned",
        startDate: "2026-01-01",
        targetDate: "2026-03-31",
        color: "from-slate-500 to-violet-500",
        glowColor: "shadow-violet-500/20",
        featureIconKeys: ["Hand", "LineChart", "Lightbulb"],
    },
]

export type AvailabilityCountdown = {
    hours: number
    minutes: number
    seconds: number
    phaseId: string
    targetDate: Date
}

type UpcomingPhase = {
    phase: RoadmapPhaseDefinition
    targetDate: Date
}

function parseDate(value?: string) {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.valueOf()) ? null : date
}

export function getUpcomingRoadmapPhase(
    referenceDate = new Date()
): UpcomingPhase | null {
    const now = referenceDate.getTime()
    const futurePhases = roadmapPhases
        .map((phase) => {
            const targetDate = parseDate(phase.targetDate)
            return targetDate ? { phase, targetDate } : null
        })
        .filter((entry): entry is UpcomingPhase => {
            if (!entry) return false
            return entry.targetDate.getTime() > now
        })

    if (futurePhases.length === 0) {
        return null
    }

    futurePhases.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
    return futurePhases[0]
}

export function getAvailabilityCountdown(
    referenceDate = new Date()
): AvailabilityCountdown | null {
    const upcoming = getUpcomingRoadmapPhase(referenceDate)
    if (!upcoming) return null
    const diffMs = upcoming.targetDate.getTime() - referenceDate.getTime()
    if (diffMs <= 0) return null
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    return {
        hours,
        minutes,
        seconds,
        phaseId: upcoming.phase.id,
        targetDate: upcoming.targetDate,
    }
}

export function formatAvailabilityCountdown(
    countdown?: AvailabilityCountdown | null
) {
    if (!countdown) return undefined
    const minuteLabel = countdown.minutes.toString().padStart(2, "0")
    const secondLabel = countdown.seconds.toString().padStart(2, "0")
    return `Available ${countdown.hours}h ${minuteLabel}m ${secondLabel}s`
}

export function getAvailabilityLabel(
    referenceDate = new Date()
): string | undefined {
    const countdown = getAvailabilityCountdown(referenceDate)
    return formatAvailabilityCountdown(countdown)
}
