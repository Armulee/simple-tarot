"use client"

import { Target } from "lucide-react"

export default function MissionStatement() {
    return (
        <div className='bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border border-primary/20 rounded-2xl p-8'>
            <div className='text-center space-y-4'>
                <Target className='w-16 h-16 text-primary mx-auto' />
                <h2 className='text-3xl font-bold text-white'>Our Mission</h2>
                <p className='text-lg text-gray-300 max-w-4xl mx-auto'>
                    To democratize access to spiritual guidance by creating an
                    AI-powered platform that provides authentic, personalized
                    mystical insights. We believe everyone deserves access to
                    the wisdom that can help them navigate life&apos;s journey
                    with clarity and purpose.
                </p>
            </div>
        </div>
    )
}
