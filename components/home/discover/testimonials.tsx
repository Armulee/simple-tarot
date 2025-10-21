"use client"

export default function TestimonialsSection() {
    return (
        <div className='space-y-8'>
            <h2 className='text-3xl font-bold text-white text-center'>
                What Our Users Say
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6'>
                    <p className='text-gray-300 italic mb-4'>
                        &quot;The AI tarot readings feel incredibly personal and
                        accurate. It&apos;s like having a spiritual guide
                        available 24/7.&quot;
                    </p>
                    <div className='flex items-center space-x-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center'>
                            <span className='text-white font-semibold'>S</span>
                        </div>
                        <div>
                            <p className='text-white font-semibold'>Sarah M.</p>
                            <p className='text-gray-400 text-sm'>
                                Premium User
                            </p>
                        </div>
                    </div>
                </div>
                <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6'>
                    <p className='text-gray-300 italic mb-4'>
                        &quot;I love how the platform combines ancient wisdom
                        with modern technology. The readings have helped me gain
                        clarity in difficult times.&quot;
                    </p>
                    <div className='flex items-center space-x-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center'>
                            <span className='text-white font-semibold'>M</span>
                        </div>
                        <div>
                            <p className='text-white font-semibold'>
                                Michael R.
                            </p>
                            <p className='text-gray-400 text-sm'>
                                Regular User
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
