"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react"

export default function TestimonialsSection() {
    const t = useTranslations("HomeDiscover.Testimonials")
    const [isVisible, setIsVisible] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isAutoPlaying, setIsAutoPlaying] = useState(true)

    const items = t.raw("items") as Array<{
        quote: string
        author: string
        role: string
        initial: string
    }>

    useEffect(() => {
        setIsVisible(true)
    }, [])

    useEffect(() => {
        if (!isAutoPlaying) return

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % items.length)
        }, 5000)

        return () => clearInterval(interval)
    }, [isAutoPlaying, items.length])

    const nextTestimonial = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length)
        setIsAutoPlaying(false)
    }

    const prevTestimonial = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
        setIsAutoPlaying(false)
    }

    const goToTestimonial = (index: number) => {
        setCurrentIndex(index)
        setIsAutoPlaying(false)
    }

    return (
        <div className='space-y-12'>
            {/* Enhanced section header */}
            <div
                className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
                <div className='inline-flex items-center gap-2 mb-4'>
                    <Star className='w-6 h-6 text-accent animate-pulse' />
                    <span className='text-primary font-semibold text-sm uppercase tracking-wider'>
                        {t("label")}
                    </span>
                    <Star className='w-6 h-6 text-accent animate-pulse' />
                </div>
                <h2 className='text-4xl md:text-5xl font-bold text-white mb-4'>
                    {t("title")}
                </h2>
                <p className='text-gray-400 max-w-2xl mx-auto text-lg'>
                    {t("description")}
                </p>
            </div>

            {/* Carousel container */}
            <div className='relative max-w-4xl mx-auto'>
                {/* Main testimonial display */}
                <div className='relative overflow-hidden rounded-2xl'>
                    <div
                        className='flex transition-transform duration-500 ease-in-out'
                        style={{
                            transform: `translateX(-${currentIndex * 100}%)`,
                        }}
                    >
                        {items.map((item, index) => (
                            <div key={index} className='w-full flex-shrink-0'>
                                <div className='bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 mx-4'>
                                    {/* Quote icon */}
                                    <div className='flex justify-center mb-6'>
                                        <div className='w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center shadow-lg'>
                                            <Quote className='w-8 h-8 text-white' />
                                        </div>
                                    </div>

                                    {/* Quote text */}
                                    <blockquote className='text-center mb-8'>
                                        <p className='text-xl text-gray-300 italic leading-relaxed mb-4'>
                                            &quot;{item.quote}&quot;
                                        </p>

                                        {/* Star rating */}
                                        <div className='flex justify-center space-x-1 mb-4'>
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className='w-5 h-5 text-yellow-400 fill-current'
                                                />
                                            ))}
                                        </div>
                                    </blockquote>

                                    {/* Author info */}
                                    <div className='flex items-center justify-center space-x-4'>
                                        <div className='w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center shadow-lg'>
                                            <span className='text-white font-bold text-lg'>
                                                {item.initial}
                                            </span>
                                        </div>
                                        <div className='text-center'>
                                            <p className='text-white font-semibold text-lg'>
                                                {item.author}
                                            </p>
                                            <p className='text-gray-400'>
                                                {item.role}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Navigation controls */}
                <div className='flex items-center justify-center space-x-4 mt-8'>
                    <button
                        onClick={prevTestimonial}
                        className='w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-primary hover:to-secondary rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg'
                    >
                        <ChevronLeft className='w-6 h-6 text-white' />
                    </button>

                    {/* Dots indicator */}
                    <div className='flex space-x-2'>
                        {items.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToTestimonial(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    index === currentIndex
                                        ? "bg-primary scale-125"
                                        : "bg-gray-600 hover:bg-gray-500"
                                }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={nextTestimonial}
                        className='w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-primary hover:to-secondary rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg'
                    >
                        <ChevronRight className='w-6 h-6 text-white' />
                    </button>
                </div>

                {/* Auto-play indicator */}
                <div className='text-center mt-4'>
                    <button
                        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                        className={`text-sm transition-colors duration-300 ${
                            isAutoPlaying
                                ? "text-primary"
                                : "text-gray-500 hover:text-gray-400"
                        }`}
                    >
                        {isAutoPlaying
                            ? t("autoPlay.autoPlaying")
                            : t("autoPlay.clickToAutoPlay")}
                    </button>
                </div>
            </div>

            {/* Additional testimonials grid (for smaller screens) */}
            <div className='hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12'>
                {items.slice(0, 4).map((item, index) => (
                    <div
                        key={index}
                        className={`transition-all duration-700 delay-${index * 100} ${
                            isVisible
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-8"
                        }`}
                    >
                        <div className='bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/30 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 group'>
                            <div className='flex items-start space-x-4'>
                                <div className='w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300'>
                                    <span className='text-white font-semibold'>
                                        {item.initial}
                                    </span>
                                </div>
                                <div className='flex-1'>
                                    <div className='flex items-center space-x-1 mb-2'>
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className='w-4 h-4 text-yellow-400 fill-current'
                                            />
                                        ))}
                                    </div>
                                    <p className='text-gray-300 italic mb-3 text-sm leading-relaxed'>
                                        &quot;{item.quote}&quot;
                                    </p>
                                    <div>
                                        <p className='text-white font-semibold text-sm'>
                                            {item.author}
                                        </p>
                                        <p className='text-gray-400 text-xs'>
                                            {item.role}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
