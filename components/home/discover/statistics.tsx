"use client"

export default function StatisticsSection() {
    return (
        <div className='bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-sm border border-primary/20 rounded-2xl p-8'>
            <h2 className='text-3xl font-bold text-white text-center mb-8'>
                Quick stats
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-8 text-center'>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        ~500
                    </div>
                    <div className='text-gray-300'>Early users</div>
                </div>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        Thousands
                    </div>
                    <div className='text-gray-300'>Cards drawn</div>
                </div>
                <div>
                    <div className='text-4xl font-bold text-primary mb-2'>
                        Weekly
                    </div>
                    <div className='text-gray-300'>Updates shipped</div>
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
