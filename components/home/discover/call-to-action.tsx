"use client"

export default function CallToActionSection() {
    return (
        <div className='bg-gradient-to-r from-primary/20 to-secondary/20 backdrop-blur-sm border border-primary/30 rounded-2xl p-8 text-center'>
            <h2 className='text-3xl font-bold text-white mb-4'>
                Ready to Begin Your Journey?
            </h2>
            <p className='text-lg text-gray-300 mb-6'>
                Join thousands of users who have discovered their path through
                our AI-powered mystical guidance.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <button className='bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity'>
                    Start Your Reading
                </button>
                <button className='border border-primary/30 text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary/10 transition-colors'>
                    Learn More
                </button>
            </div>
        </div>
    )
}
