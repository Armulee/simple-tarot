"use client"
import {
    Pencil,
    Sparkles,
    Layers,
    LayoutGrid,
    Compass,
    Globe,
    ArrowRight,
    LucideIcon,
} from "lucide-react"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Badge } from "../ui/badge"
import { useTarot, type ReadingType } from "@/contexts/tarot-context"
import { ReadingConfig } from "../../app/[locale]/tarot/page"
import { isFollowUpQuestion, getCleanQuestionText } from "@/lib/question-utils"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { InlineQuestionEdit } from "./inline-question-edit"

const TYPE_ICONS: Record<string, LucideIcon> = {
    simple: Sparkles,
    general: Layers,
    detailed: LayoutGrid,
    expanded: Compass,
    celtic: Globe,
}

const MiniCard = ({ 
    className = "", 
    style = {}, 
    delay = 0 
}: { 
    className?: string; 
    style?: React.CSSProperties; 
    delay?: number 
}) => (
    <div 
        className={`w-8 h-12 rounded-[4px] bg-white p-[1.5px] shadow-lg transition-all duration-700 group-hover:shadow-primary/40 ${className}`}
        style={{ ...style, transitionDelay: `${delay}ms` }}
    >
        <div className="w-full h-full rounded-[3px] overflow-hidden relative"
             style={{
                background: "linear-gradient(135deg, #05081a, #1a0b2e 60%, #3b0f4a)"
             }}>
            <div className="absolute inset-0 opacity-40"
                 style={{
                    background: "radial-gradient(circle at 30% 20%, #7b2cbf 0%, transparent 40%), radial-gradient(circle at 70% 80%, #00bcd4 0%, transparent 45%)"
                 }} />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[8px] text-amber-300/60 group-hover:text-amber-300 group-hover:scale-110 transition-all">✷</div>
            </div>
        </div>
    </div>
)

const MiniSpread = ({ type }: { type: string }) => {
    switch (type) {
        case 'simple':
            return (
                <div className="flex justify-center items-center h-24">
                    <MiniCard className="scale-125 rotate-[5deg] group-hover:rotate-0 shadow-indigo-500/50" />
                </div>
            )
        case 'general':
            return (
                <div className="flex justify-center items-center h-24 -space-x-4">
                    <MiniCard className="rotate-[-12deg] group-hover:rotate-[-8deg] translate-y-2 opacity-80" delay={100} />
                    <MiniCard className="z-10 scale-110 shadow-xl" delay={0} />
                    <MiniCard className="rotate-[12deg] group-hover:rotate-[8deg] translate-y-2 opacity-80" delay={200} />
                </div>
            )
        case 'detailed':
            return (
                <div className="relative h-24 w-32 mx-auto flex items-center justify-center">
                    <MiniCard className="absolute top-0 left-1/2 -translate-x-1/2 scale-75 opacity-60" delay={300} />
                    <MiniCard className="absolute top-1/2 left-0 -translate-y-1/2 scale-75 opacity-60 rotate-[-10deg]" delay={100} />
                    <MiniCard className="absolute z-10 scale-100 shadow-xl" delay={0} />
                    <MiniCard className="absolute top-1/2 right-0 -translate-y-1/2 scale-75 opacity-60 rotate-[10deg]" delay={200} />
                    <MiniCard className="absolute bottom-0 left-1/2 -translate-x-1/2 scale-75 opacity-60" delay={400} />
                </div>
            )
        case 'expanded':
            return (
                <div className="flex justify-center items-center h-24 -space-x-5">
                    {[...Array(7)].map((_, i) => (
                        <MiniCard 
                            key={i} 
                            className={`scale-[0.7] ${i === 3 ? 'z-10 scale-[0.85] shadow-xl' : 'opacity-60'}`}
                            style={{ 
                                transform: `rotate(${(i - 3) * 12}deg) translateY(${Math.abs(i - 3) * 4}px)`,
                                transitionDelay: `${Math.abs(i - 3) * 100}ms`
                            }}
                        />
                    ))}
                </div>
            )
        case 'celtic':
            return (
                <div className="flex justify-center items-center h-24 gap-4 scale-90">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                         <MiniCard className="absolute opacity-60 scale-75" delay={200} />
                         <MiniCard className="absolute rotate-90 z-10 scale-75 shadow-lg" delay={0} />
                         <div className="absolute -top-7 left-1/2 -translate-x-1/2 scale-[0.4] opacity-40"><MiniCard /></div>
                         <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 scale-[0.4] opacity-40"><MiniCard /></div>
                         <div className="absolute top-1/2 -left-7 -translate-y-1/2 scale-[0.4] opacity-40"><MiniCard /></div>
                         <div className="absolute top-1/2 -right-7 -translate-y-1/2 scale-[0.4] opacity-40"><MiniCard /></div>
                    </div>
                    <div className="flex flex-col -space-y-8 scale-[0.55] opacity-60 translate-x-1">
                        <MiniCard delay={400} />
                        <MiniCard delay={300} />
                        <MiniCard delay={200} />
                        <MiniCard delay={100} />
                    </div>
                </div>
            )
        default:
            return <Sparkles className="w-10 h-10 text-primary" />;
    }
}

export default function ReadingType({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    const t = useTranslations("ReadingPage")
    const {
        currentStep,
        setCurrentStep,
        question,
        setQuestion,
        readingType,
        setReadingType,
        isFollowUp,
    } = useTarot()
    const [isEditing, setIsEditing] = useState(false)

    const handleEditQuestion = () => {
        setIsEditing(true)
    }

    const handleSaveQuestion = (newQuestion: string) => {
        setQuestion(newQuestion)
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

    const handleReadingTypeSelect = (type: ReadingType) => {
        setReadingType(type)
        setCurrentStep("card-selection")
    }

    // For follow-up questions, automatically go to card selection
    useEffect(() => {
        if (isFollowUpQuestion(question || "") && readingType === "simple") {
            setCurrentStep("card-selection")
        }
    }, [question, readingType, setCurrentStep])

    return (
        <>
            {currentStep === "reading-type" && (
                <div className='space-y-8 animate-fade-in'>
                    {/* Question Banner */}
                    <Card className='px-6 pt-0 border-0'>
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center gap-2 relative'>
                                <h2 className='font-serif font-semibold text-xl relative'>
                                    {isFollowUpQuestion(question || "", {
                                        isFollowUp,
                                    }) && (
                                        <Badge
                                            variant='secondary'
                                            className='absolute -top-6 -left-8 -rotate-12 bg-primary/20 text-white border-white/30'
                                        >
                                            {t("followUp.badge")}
                                        </Badge>
                                    )}
                                    {t("questionHeading")}
                                </h2>
                                {!isEditing && (
                                    <Button
                                        onClick={handleEditQuestion}
                                        variant='ghost'
                                        size='sm'
                                        className='h-8 w-8 p-0 hover:bg-primary/10'
                                    >
                                        <Pencil className='h-4 w-4 text-muted-foreground hover:text-primary' />
                                    </Button>
                                )}
                            </div>

                            {isEditing ? (
                                <InlineQuestionEdit
                                    currentQuestion={question || ""}
                                    onSave={handleSaveQuestion}
                                    onCancel={handleCancelEdit}
                                />
                            ) : (
                                <p className='text-muted-foreground italic'>
                                    &ldquo;
                                    {getCleanQuestionText(question || "")}
                                    &rdquo;
                                </p>
                            )}
                        </div>
                    </Card>

                    {/* Reading Type Selection */}
                    <div className='space-y-6'>
                        <div className='text-center space-y-2'>
                            <h2 className='font-serif font-bold text-xl'>
                                {isFollowUpQuestion(question || "", {
                                    isFollowUp,
                                })
                                    ? t("followUp.title")
                                    : t("chooseType.title")}
                            </h2>
                            <p className='text-muted-foreground'>
                                {isFollowUpQuestion(question || "", {
                                    isFollowUp,
                                })
                                    ? t("followUp.desc")
                                    : t("chooseType.desc")}
                            </p>
                        </div>

                        {isFollowUpQuestion(question || "", { isFollowUp }) ? (
                            <div className='flex justify-center animate-fade-in-scale'>
                                <Card
                                    className='group relative w-full max-w-md overflow-hidden rounded-2xl border-primary/20 bg-primary/[0.02] backdrop-blur-xl p-8 text-center transition-all duration-500 hover:border-primary/50 hover:scale-[1.02] cursor-pointer shadow-2xl shadow-black/40'
                                    onClick={() =>
                                        handleReadingTypeSelect("simple")
                                    }
                                >
                                    <div className='space-y-6'>
                                        <div className='mx-auto w-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105'>
                                            <MiniSpread type="simple" />
                                        </div>
                                        <div className='space-y-2'>
                                            <h3 className='text-2xl font-serif font-bold text-white'>
                                                {t("followUp.simple")}
                                            </h3>
                                            <p className='text-white/60 text-sm'>
                                                1 Card Insight
                                            </p>
                                        </div>
                                        <Button className='w-full rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/30 transition-all duration-300'>
                                            Continue with Follow-up
                                            <ArrowRight className='w-4 h-4 ml-2' />
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <div className='grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
                                {Object.entries(readingConfig).map(
                                    ([key, config], index) => {
                                        return (
                                            <Card
                                                key={key}
                                                className='group relative overflow-hidden rounded-2xl border-primary/20 bg-primary/[0.02] backdrop-blur-md p-6 transition-all duration-500 hover:border-primary/50 hover:-translate-y-2 cursor-pointer shadow-xl hover:shadow-primary/10 flex flex-col items-center text-center animate-fade-in-up'
                                                style={{
                                                    animationDelay: `${index * 100}ms`,
                                                }}
                                                onClick={() =>
                                                    handleReadingTypeSelect(
                                                        key as ReadingType
                                                    )
                                                }
                                            >
                                                {/* Glow Effect */}
                                                <div className='absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500' />

                                                <div className='relative z-10 w-full space-y-6'>
                                                    {/* Spread Visualization */}
                                                    <div className='mx-auto w-full flex items-center justify-center transition-transform duration-500 group-hover:scale-105'>
                                                        <MiniSpread type={key} />
                                                    </div>

                                                    <div className='space-y-2'>
                                                        <h3 className='text-xl font-serif font-bold text-accent group-hover:text-primary transition-colors'>
                                                            {config.title}
                                                        </h3>
                                                        <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-[10px] font-bold text-white/40 uppercase tracking-wider border border-primary/20'>
                                                            <Layers className='w-3 h-3' />
                                                            {config.cards} Cards
                                                        </div>
                                                    </div>

                                                    <p className='text-sm text-white/60 font-light leading-relaxed line-clamp-3 group-hover:text-white/80 transition-colors'>
                                                        {config.description}
                                                    </p>

                                                    <div className='pt-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500'>
                                                        <div className='w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto'>
                                                            <ArrowRight className='w-5 h-5 text-primary' />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Decorative Corner */}
                                                <div className='absolute top-0 right-0 w-12 h-12 overflow-hidden opacity-10'>
                                                    <div className='absolute top-0 right-0 w-full h-full border-t-2 border-r-2 border-white' />
                                                </div>
                                            </Card>
                                        )
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
