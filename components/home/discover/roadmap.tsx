"use client"

import { CheckCircle, Clock, Target, Sparkles } from "lucide-react"

export default function RoadmapSection() {
    const roadmap = [
        {
            phase: "Q4 2025",
            title: "Team & Workspaces",
            status: "Planned",
            eta: "Nov 2025",
            features: ["Shared workspaces", "Simple roles"],
        },
        {
            phase: "Q4 2025",
            title: "Saved Readings & Journal",
            status: "Planned",
            eta: "Dec 2025",
            features: ["Save readings", "Add notes", "Export"],
        },
        {
            phase: "Q1 2026",
            title: "Multi‑language (EN/TH)",
            status: "Planned",
            eta: "Jan 2026",
            features: ["English", "ไทย (beta)"]
        },
        {
            phase: "Q1 2026",
            title: "Mobile Web Enhancements",
            status: "Planned",
            eta: "Feb 2026",
            features: ["Faster loads", "Offline-friendly"],
        },
        {
            phase: "Q1 2026",
            title: "Public API (limited beta)",
            status: "Planned",
            eta: "Mar 2026",
            features: ["Readings API", "Webhooks (beta)"]
        },
    ]

    return (
        <div className='space-y-8'>
            <h2 className='text-3xl font-bold text-white text-center'>
                Roadmap (expected dates)
            </h2>
            <div className='space-y-6'>
                {roadmap.map((phase) => (
                    <div
                        key={phase.phase}
                        className='bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6'
                    >
                        <div className='flex items-center justify-between mb-4'>
                            <div className='flex items-center space-x-4'>
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        phase.status === "Completed"
                                            ? "bg-green-500/20 border border-green-500/30"
                                            : phase.status === "In Development"
                                              ? "bg-blue-500/20 border border-blue-500/30"
                                              : "bg-gray-500/20 border border-gray-500/30"
                                    }`}
                                >
                                    {phase.status === "Completed" ? (
                                        <CheckCircle className='w-5 h-5 text-green-400' />
                                    ) : phase.status === "In Development" ? (
                                        <Clock className='w-5 h-5 text-blue-400' />
                                    ) : (
                                        <Target className='w-5 h-5 text-gray-400' />
                                    )}
                                </div>
                                <div>
                                    <h3 className='text-xl font-semibold text-white'>
                                        {phase.phase}: {phase.title}
                                    </h3>
                                    <span
                                        className={`text-sm px-3 py-1 rounded-full ${
                                            phase.status === "Completed"
                                                ? "bg-green-500/20 text-green-400"
                                                : phase.status ===
                                                    "In Development"
                                                  ? "bg-blue-500/20 text-blue-400"
                                                  : "bg-gray-500/20 text-gray-400"
                                        }`}
                                    >
                                        {phase.status}
                                    </span>
                                    {"eta" in phase && phase.eta && (
                                        <span className='ml-3 text-sm text-gray-400'>
                                            ETA: {phase.eta}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                            {phase.features.map((feature, featureIndex) => (
                                <div
                                    key={featureIndex}
                                    className='flex items-center space-x-2'
                                >
                                    <Sparkles className='w-4 h-4 text-primary' />
                                    <span className='text-gray-300 text-sm'>
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
