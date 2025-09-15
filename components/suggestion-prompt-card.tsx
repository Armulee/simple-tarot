"use client"

import { useRef, useState, useEffect } from "react"
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
import { useTranslations } from "next-intl"

// Import Swiper styles
import "swiper/css"
import "swiper/css/autoplay"
import "swiper/css/free-mode"

interface SuggestionPromptCardProps {
    onSuggestionClick: (suggestion: string) => void
}

interface Category {
    id: string
    // name: string
    icon: React.ReactNode
    color: string
    bgColor: string
    borderColor: string
    hoverColor: string
    questions: string[]
}

const categories: Category[] = [
    {
        id: "daily-life",
        icon: <Star className='w-4 h-4 text-amber-400' />,
        color: "text-amber-400",
        bgColor: "bg-amber-500/20",
        borderColor: "border-amber-400/50",
        hoverColor: "hover:bg-amber-500/30",
        questions: [
            "How can I find more balance in my life?",
            "What do I need to let go of?",
            "How can I make better decisions?",
            "What is the universe trying to tell me?",
            "What should I focus on today?",
            "How can I improve my daily routine?",
            "What habits should I change?",
            "How can I be more mindful?",
        ],
    },
    {
        id: "work-career",
        icon: <Briefcase className='w-4 h-4 text-blue-400' />,
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        borderColor: "border-blue-400/50",
        hoverColor: "hover:bg-blue-500/30",
        questions: [
            "What should I focus on in my career right now?",
            "Should I take this new opportunity?",
            "How can I advance in my current role?",
            "What skills should I develop?",
            "Is it time for a career change?",
            "How can I improve my work relationships?",
            "What is blocking my professional growth?",
            "Should I start my own business?",
        ],
    },
    {
        id: "financial",
        icon: <DollarSign className='w-4 h-4 text-green-400' />,
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        borderColor: "border-green-400/50",
        hoverColor: "hover:bg-green-500/30",
        questions: [
            "How can I improve my financial situation?",
            "Should I make this investment?",
            "What is my financial future looking like?",
            "How can I save more money?",
            "Is this the right time to buy a house?",
            "What financial goals should I set?",
            "How can I reduce my expenses?",
            "Should I change my investment strategy?",
        ],
    },
    {
        id: "love-romance",
        icon: <Heart className='w-4 h-4 text-pink-400' />,
        color: "text-pink-400",
        bgColor: "bg-pink-500/20",
        borderColor: "border-pink-400/50",
        hoverColor: "hover:bg-pink-500/30",
        questions: [
            "What should I know about my love life?",
            "Is this person right for me?",
            "How can I attract the right partner?",
            "Should I confess my feelings?",
            "What is blocking my romantic life?",
            "How can I improve my current relationship?",
            "Is it time to move on?",
            "What does my future hold in love?",
        ],
    },
    {
        id: "family",
        icon: <Home className='w-4 h-4 text-orange-400' />,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
        borderColor: "border-orange-400/50",
        hoverColor: "hover:bg-orange-500/30",
        questions: [
            "How can I improve my family relationships?",
            "What does my family need from me?",
            "How can I resolve family conflicts?",
            "Should I have this difficult conversation?",
            "What is my role in the family?",
            "How can I support my family better?",
            "What family patterns should I break?",
            "How can I create better family harmony?",
        ],
    },
    {
        id: "friendship-relationships",
        icon: <Users className='w-4 h-4 text-purple-400' />,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        borderColor: "border-purple-400/50",
        hoverColor: "hover:bg-purple-500/30",
        questions: [
            "How can I improve my relationships?",
            "Should I end this friendship?",
            "How can I make new friends?",
            "What is causing relationship problems?",
            "How can I be a better friend?",
            "Should I trust this person?",
            "How can I resolve this conflict?",
            "What boundaries should I set?",
        ],
    },
    {
        id: "personal-growth",
        icon: <Brain className='w-4 h-4 text-indigo-400' />,
        color: "text-indigo-400",
        bgColor: "bg-indigo-500/20",
        borderColor: "border-indigo-400/50",
        hoverColor: "hover:bg-indigo-500/30",
        questions: [
            "What is blocking my personal growth?",
            "How can I overcome my current challenges?",
            "What is my soul's purpose?",
            "How can I develop my intuition?",
            "What limiting beliefs should I release?",
            "How can I build more confidence?",
            "What spiritual path should I follow?",
            "How can I find inner peace?",
        ],
    },
]

export default function SuggestionPromptCard({
    onSuggestionClick,
}: SuggestionPromptCardProps) {
    const t = useTranslations("Prompts")

    const swiperRef = useRef<SwiperType | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<Category>(
        categories[0]
    )
    const [showPrompts, setShowPrompts] = useState(true)
    const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const handleSuggestionClick = (suggestion: string) => {
        onSuggestionClick(suggestion)
    }

    const handleSwiperInteraction = () => {
        const swiper = swiperRef.current
        if (!swiper) return

        // Pause autoplay
        swiper.autoplay?.pause()

        // Clear any existing timeout
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current)
        }

        // Resume autoplay after 3 seconds
        pauseTimeoutRef.current = setTimeout(() => {
            swiper.autoplay?.resume()
        }, 3000)
    }

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (pauseTimeoutRef.current) {
                clearTimeout(pauseTimeoutRef.current)
            }
        }
    }, [])

    return (
        <div className='w-full max-w-6xl mx-auto'>
            {/* Category Selector and Toggle */}
            <div className='mb-6'>
                <div className='flex items-center justify-center gap-4 mb-4'>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                        <Sparkles className='w-4 h-4 text-secondary' />
                        <h3 className='text-sm font-medium text-white/70 whitespace-nowrap'>
                            {t("title")}
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
                                                {t(
                                                    `categories.${selectedCategory.id}.name`
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className='truncate'>
                                            {t("show")}
                                        </span>
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
                                    {t("hide")}
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
                                        {t(`categories.${category.id}.name`)}
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
                        onTouchStart={handleSwiperInteraction}
                        onTouchMove={handleSwiperInteraction}
                        onTouchEnd={handleSwiperInteraction}
                        onMouseDown={handleSwiperInteraction}
                        onMouseMove={handleSwiperInteraction}
                        onMouseUp={handleSwiperInteraction}
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
                                    {t(
                                        `categories.${selectedCategory.id}.questions.${index}`
                                    )}
                                </Badge>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            )}
        </div>
    )
}
