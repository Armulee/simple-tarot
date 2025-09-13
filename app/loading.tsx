export default function Loading() {
  return (
    <div className='min-h-screen relative overflow-hidden flex items-center justify-center'>
      <div className='text-center space-y-6'>
        {/* Loading Animation */}
        <div className='w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-spin'>
          <div className='w-16 h-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin'></div>
        </div>
        
        {/* Loading Text */}
        <div className='space-y-2'>
          <h2 className='font-serif font-bold text-2xl text-foreground'>
            Consulting the Stars
          </h2>
          <p className='text-muted-foreground'>
            Preparing your cosmic guidance...
          </p>
        </div>

        {/* Loading Dots */}
        <div className='flex justify-center space-x-2'>
          <div className='w-2 h-2 bg-primary rounded-full animate-bounce' style={{ animationDelay: '0ms' }}></div>
          <div className='w-2 h-2 bg-primary rounded-full animate-bounce' style={{ animationDelay: '150ms' }}></div>
          <div className='w-2 h-2 bg-primary rounded-full animate-bounce' style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}