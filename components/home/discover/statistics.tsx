"use client"

export default function StatisticsSection() {
    return (
        <div className='bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border border-primary/20 rounded-2xl p-8'>
            <h2 className='text-3xl font-bold text-white text-center mb-8'>
                Platform Impact
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-8 text-center'>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        50K+
                    </div>
                    <div className='text-gray-300'>Active Users</div>
                </div>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        1M+
                    </div>
                    <div className='text-gray-300'>Readings Completed</div>
                </div>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        98%
                    </div>
                    <div className='text-gray-300'>User Satisfaction</div>
                </div>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        24/7
                    </div>
                    <div className='text-gray-300'>Available</div>
                </div>
            </div>
        </div>
    )
}
