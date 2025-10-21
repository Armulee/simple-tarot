"use client"

import { Zap, Shield, Globe } from "lucide-react"

export default function TechnologySection() {
    return (
        <div className='space-y-8'>
            <h2 className='text-3xl font-bold text-white text-center'>
                Technology & Innovation
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center'>
                    <Zap className='w-12 h-12 text-primary mx-auto mb-4' />
                    <h3 className='text-xl font-semibold text-white mb-2'>
                        AI-Powered
                    </h3>
                    <p className='text-gray-400'>
                        Advanced machine learning algorithms provide
                        personalized and accurate readings
                    </p>
                </div>
                <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center'>
                    <Shield className='w-12 h-12 text-primary mx-auto mb-4' />
                    <h3 className='text-xl font-semibold text-white mb-2'>
                        Secure & Private
                    </h3>
                    <p className='text-gray-400'>
                        End-to-end encryption ensures your personal data and
                        readings remain confidential
                    </p>
                </div>
                <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 text-center'>
                    <Globe className='w-12 h-12 text-primary mx-auto mb-4' />
                    <h3 className='text-xl font-semibold text-white mb-2'>
                        Global Access
                    </h3>
                    <p className='text-gray-400'>
                        Available worldwide with multi-language support and
                        cultural adaptations
                    </p>
                </div>
            </div>
        </div>
    )
}
