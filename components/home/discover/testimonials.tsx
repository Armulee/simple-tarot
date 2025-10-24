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
                        &quot;I use it most mornings to set an intention. It helps
                        me start the day a bit more grounded.&quot;
                    </p>
                    <div className='flex items-center space-x-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center'>
                            <span className='text-white font-semibold'>Y</span>
                        </div>
                        <div>
                            <p className='text-white font-semibold'>Yui</p>
                            <p className='text-gray-400 text-sm'>
                                Early user
                            </p>
                        </div>
                    </div>
                </div>
                <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6'>
                    <p className='text-gray-300 italic mb-4'>
                        &quot;The reflections feel balanced—useful without being pushy.
                        It&apos;s become a quiet ritual that helps me think more clearly.&quot;
                    </p>
                    <div className='flex items-center space-x-3'>
                        <div className='w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center'>
                            <span className='text-white font-semibold'>D</span>
                        </div>
                        <div>
                            <p className='text-white font-semibold'>Daniel</p>
                            <p className='text-gray-400 text-sm'>
                                Early user
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
