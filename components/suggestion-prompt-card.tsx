"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Autoplay, FreeMode } from "swiper/modules"
import { Badge } from "./ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"
import {
    Sparkles,
    Heart,
    Briefcase,
    DollarSign,
    Home,
    Users,
    Brain,
    Star,
    ChevronUp,
} from "lucide-react"
import type { Swiper as SwiperType } from "swiper"
import { useTranslations } from 'next-intl'
import { useMessages } from 'next-intl'

// Import Swiper styles
import "swiper/css"
import "swiper/css/autoplay"
import "swiper/css/free-mode"

interface SuggestionPromptCardProps {
    onSuggestionClick: (suggestion: string) => void
}

interface Category {
    id: string
    name: string
    icon: React.ReactNode
    color: string
    bgColor: string
    borderColor: string
    hoverColor: string
    questions: string[]
}

// Helper function to get questions array
function getQuestions(messages: Record<string, unknown>, category: string): string[] {
    const suggestions = messages.suggestions as Record<string, unknown>
    const questions = suggestions.questions as Record<string, string[]>
    return questions[category] || []
}

// Function to create categories with translations
function createCategories(t: (key: string) => string, messages: Record<string, unknown>): Category[] {
    return [
        {
            id: "daily-life",
            name: t('suggestions.dailyLife'),
            icon: <Star className='w-4 h-4 text-amber-400' />,
            color: "text-amber-400",
            bgColor: "bg-amber-500/20",
            borderColor: "border-amber-400/50",
            hoverColor: "hover:bg-amber-500/30",
            questions: getQuestions(messages, 'dailyLife'),
        },
        {
            id: "work-career",
            name: t('suggestions.workCareer'),
            icon: <Briefcase className='w-4 h-4 text-blue-400' />,
            color: "text-blue-400",
            bgColor: "bg-blue-500/20",
            borderColor: "border-blue-400/50",
            hoverColor: "hover:bg-blue-500/30",
            questions: getQuestions(messages, 'workCareer'),
        },
        {
            id: "financial",
            name: t('suggestions.financial'),
            icon: <DollarSign className='w-4 h-4 text-green-400' />,
            color: "text-green-400",
            bgColor: "bg-green-500/20",
            borderColor: "border-green-400/50",
            hoverColor: "hover:bg-green-500/30",
            questions: getQuestions(messages, 'financial'),
        },
        {
            id: "love-romance",
            name: t('suggestions.loveRomance'),
            icon: <Heart className='w-4 h-4 text-pink-400' />,
            color: "text-pink-400",
            bgColor: "bg-pink-500/20",
            borderColor: "border-pink-400/50",
            hoverColor: "hover:bg-pink-500/30",
            questions: getQuestions(messages, 'loveRomance'),
        },
        {
            id: "family",
            name: t('suggestions.family'),
            icon: <Home className='w-4 h-4 text-orange-400' />,
            color: "text-orange-400",
            bgColor: "bg-orange-500/20",
            borderColor: "border-orange-400/50",
            hoverColor: "hover:bg-orange-500/30",
            questions: getQuestions(messages, 'family'),
        },
        {
            id: "friendship-relationships",
            name: t('suggestions.friendshipRelationships'),
            icon: <Users className='w-4 h-4 text-purple-400' />,
            color: "text-purple-400",
            bgColor: "bg-purple-500/20",
            borderColor: "border-purple-400/50",
            hoverColor: "hover:bg-purple-500/30",
            questions: getQuestions(messages, 'friendshipRelationships'),
        },
        {
            id: "personal-growth",
            name: t('suggestions.personalGrowth'),
            icon: <Brain className='w-4 h-4 text-indigo-400' />,
            color: "text-indigo-400",
            bgColor: "bg-indigo-500/20",
            borderColor: "border-indigo-400/50",
            hoverColor: "hover:bg-indigo-500/30",
            questions: getQuestions(messages, 'personalGrowth'),
        },
    ]
}

export default function SuggestionPromptCard({
    onSuggestionClick,
}: SuggestionPromptCardProps) {
    const swiperRef = useRef<SwiperType | null>(null)
    const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const t = useTranslations()
    const messages = useMessages()
    const categories = createCategories(t, messages)
    const [selectedCategory, setSelectedCategory] = useState<Category>(
        categories[0]
    )
    const [showPrompts, setShowPrompts] = useState(false)

    const handleSuggestionClick = (suggestion: string) => {
        onSuggestionClick(suggestion)
    }

    const handleUserInteraction = useCallback(() => {
        if (swiperRef.current) {
            // Stop autoplay immediately when user interacts
            swiperRef.current.autoplay.stop()
            
            // Clear any existing timeout
            if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current)
            }
            
            // Set a new timeout to resume autoplay after 3 seconds
            pauseTimeoutRef.current = setTimeout(() => {
                if (swiperRef.current) {
                    swiperRef.current.autoplay.start()
                }
            }, 3000)
        }
    }, [])

    // Cleanup timeout on unmount or category change
    useEffect(() => {
        return () => {
            if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current)
            }
        }
    }, [selectedCategory])

    return (
        <div className='w-full max-w-6xl mx-auto'>
            {/* Category Selector and Toggle */}
            <div className='mb-6'>
                <div className='flex items-center justify-center gap-4 mb-4'>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                        <Sparkles className='w-4 h-4 text-secondary' />
                        <h3 className='text-sm font-medium text-white/70 whitespace-nowrap'>
                            {t('home.inspiringPrompts')}
                        </h3>
                    </div>
                    <Select
                        value={showPrompts ? selectedCategory.id : "hide"}
                        onValueChange={(value: string) => {
                            if (value === "hide") {
                                setShowPrompts(false)
                            } else {
                                const category = categories.find(
                                    (cat) => cat.id === value
                                )
                                if (category) {
                                    setSelectedCategory(category)
                                    setShowPrompts(true)
                                }
                            }
                        }}
                    >
                        <SelectTrigger
                            className={`w-auto min-w-0 backdrop-blur-sm transition-all duration-300 ${
                                showPrompts
                                    ? `${selectedCategory.bgColor} ${selectedCategory.borderColor} ${selectedCategory.color} border-2 hover:${selectedCategory.hoverColor}`
                                    : "bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                            }`}
                        >
                            <SelectValue>
                                <div className='flex items-center gap-2 text-xs min-w-0'>
                                    {showPrompts ? (
                                        <>
                                            {selectedCategory.icon}
                                            <span className='truncate'>
                                                {selectedCategory.name}
                                            </span>
                                        </>
                                    ) : (
                                        <span className='truncate'>{t('common.show')}</span>
                                    )}
                                </div>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className='backdrop-blur-sm border-white/20'>
                            <SelectItem
                                value='hide'
                                className='cursor-pointer text-white/70 hover:bg-white/10 transition-colors'
                            >
                                <div className='flex items-center gap-2'>
                                    <ChevronUp className='w-4 h-4' />
                                    {t('common.hide')}
                                </div>
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                    className={`cursor-pointer ${category.color} hover:${category.hoverColor} transition-colors`}
                                >
                                    <div className='flex items-center gap-2'>
                                        {category.icon}
                                        {category.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Suggestion Cards - Full Width */}
            {showPrompts && (
                <div className='-mx-6'>
                    <Swiper
                        onSwiper={(swiper) => {
                            swiperRef.current = swiper
                        }}
                        onTouchStart={handleUserInteraction}
                        onTouchMove={handleUserInteraction}
                        onMouseDown={handleUserInteraction}
                        onSliderMove={handleUserInteraction}
                        modules={[Autoplay, FreeMode]}
                        spaceBetween={12}
                        slidesPerView='auto'
                        freeMode={{
                            enabled: true,
                            momentum: true,
                            momentumRatio: 0.25,
                            momentumBounce: false,
                            momentumVelocityRatio: 0.2,
                            sticky: false,
                            minimumVelocity: 0.02,
                        }}
                        autoplay={{
                            delay: 0,
                            disableOnInteraction: false,
                            pauseOnMouseEnter: true,
                            reverseDirection: false,
                        }}
                        speed={8000}
                        loop={true}
                        className='suggestion-swiper'
                    >
                        {selectedCategory.questions.map((question, index) => (
                            <SwiperSlide key={index} className='!w-auto'>
                                <Badge
                                    variant='outline'
                                    onClick={() =>
                                        handleSuggestionClick(question)
                                    }
                                    className={`cursor-pointer px-4 py-2 text-xs font-medium bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 backdrop-blur-sm transition-all duration-300 whitespace-nowrap ${selectedCategory.borderColor} hover:${selectedCategory.color} hover:bg-gradient-to-r hover:from-indigo-500/30 hover:via-purple-500/30 hover:to-cyan-500/30 hover:${selectedCategory.borderColor} shadow-[0_4px_15px_-5px_rgba(56,189,248,0.25)] hover:shadow-[0_8px_25px_-8px_rgba(56,189,248,0.35)]`}
                                >
                                    {question}
                                </Badge>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            )}
        </div>
    )
}
