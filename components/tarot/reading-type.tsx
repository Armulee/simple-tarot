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
                <div className='max-w-6xl mx-auto space-y-12 animate-fade-in'>
                    {/* Question Banner */}
                    <div className='relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-md p-8 md:p-10 shadow-2xl'>
                        <div className='absolute top-0 right-0 p-8 opacity-5'>
                            <Sparkles className='w-32 h-32' />
                        </div>

                        <div className='relative z-10 text-center space-y-4'>
                            <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary-foreground text-xs font-bold uppercase tracking-widest'>
                                {isFollowUpQuestion(question || "", {
                                    isFollowUp,
                                }) ? (
                                    <>
                                        <Layers className='w-3 h-3' />
                                        <span>{t("followUp.badge")}</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className='w-3 h-3' />
                                        <span>{t("questionHeading")}</span>
                                    </>
                                )}
                            </div>

                            <div className='flex items-center justify-center gap-3'>
                                {isEditing ? (
                                    <div className='w-full max-w-2xl'>
                                        <InlineQuestionEdit
                                            currentQuestion={question || ""}
                                            onSave={handleSaveQuestion}
                                            onCancel={handleCancelEdit}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className='text-2xl md:text-3xl font-serif italic text-white leading-relaxed max-w-3xl'>
                                            &ldquo;
                                            {getCleanQuestionText(
                                                question || ""
                                            )}
                                            &rdquo;
                                        </h2>
                                        <Button
                                            onClick={handleEditQuestion}
                                            variant='ghost'
                                            size='icon'
                                            className='shrink-0 h-10 w-10 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors'
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reading Type Selection */}
                    <div className='space-y-10'>
                        <div className='text-center space-y-3'>
                            <h2 className='text-4xl md:text-5xl font-serif font-bold text-white tracking-tight'>
                                {isFollowUpQuestion(question || "", {
                                    isFollowUp,
                                })
                                    ? t("followUp.title")
                                    : t("chooseType.title")}
                            </h2>
                            <p className='text-lg text-white/60 font-light max-w-2xl mx-auto'>
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
                                    className='group relative w-full max-w-md overflow-hidden rounded-[2.5rem] border-white/10 bg-gradient-to-br from-indigo-950/40 via-purple-950/40 to-slate-950/40 backdrop-blur-xl p-8 text-center transition-all duration-500 hover:border-primary/50 hover:scale-[1.02] cursor-pointer shadow-2xl shadow-black/40'
                                    onClick={() =>
                                        handleReadingTypeSelect("simple")
                                    }
                                >
                                    <div className='space-y-6'>
                                        <div className='mx-auto w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500'>
                                            <Sparkles className='w-10 h-10 text-primary-foreground' />
                                        </div>
                                        <div className='space-y-2'>
                                            <h3 className='text-2xl font-serif font-bold text-white'>
                                                {t("followUp.simple")}
                                            </h3>
                                            <p className='text-white/50 text-sm'>
                                                1 Card Insight
                                            </p>
                                        </div>
                                        <Button className='w-full rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/20'>
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
                                        const Icon = TYPE_ICONS[key] || Sparkles
                                        return (
                                            <Card
                                                key={key}
                                                className='group relative overflow-hidden rounded-[2.25rem] border-white/10 bg-white/[0.03] backdrop-blur-md p-6 transition-all duration-500 hover:border-primary/50 hover:-translate-y-2 cursor-pointer shadow-xl hover:shadow-primary/10 flex flex-col items-center text-center animate-fade-in-up'
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
                                                    {/* Card Icon Container */}
                                                    <div className='mx-auto w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500'>
                                                        <Icon className='w-8 h-8 text-white/80 group-hover:text-primary transition-colors' />
                                                    </div>

                                                    <div className='space-y-2'>
                                                        <h3 className='text-xl font-serif font-bold text-white group-hover:text-primary transition-colors'>
                                                            {config.title}
                                                        </h3>
                                                        <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-tighter'>
                                                            <Layers className='w-3 h-3' />
                                                            {config.cards} Cards
                                                        </div>
                                                    </div>

                                                    <p className='text-sm text-white/50 font-light leading-relaxed line-clamp-3'>
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
