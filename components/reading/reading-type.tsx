"use client"
import { Pencil } from "lucide-react"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { Badge } from "../ui/badge"
import { useTarot } from "@/contexts/tarot-context"
import { ReadingConfig } from "../../app/[locale]/reading/page"
import { isFollowUpQuestion, getCleanQuestionText } from "@/lib/question-utils"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { InlineQuestionEdit } from "./inline-question-edit"

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

    const handleReadingTypeSelect = (
        type: "simple" | "intermediate" | "advanced"
    ) => {
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
                    <Card className='px-6 pt-12 pb-6 border-0'>
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

                    {isFollowUpQuestion(question || "", { isFollowUp }) ? (
                        <div className='space-y-6'>
                            <div className='text-center space-y-4'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    {t("followUp.title")}
                                </h2>
                                <p className='text-muted-foreground'>
                                    {t("followUp.desc")}
                                </p>
                                <div className='flex justify-center'>
                                    <Badge
                                        variant='secondary'
                                        className='bg-accent/20 text-accent border-accent/30 px-4 py-2'
                                    >
                                        {t("followUp.simple")}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-6'>
                            <div className='text-center space-y-2'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    {t("chooseType.title")}
                                </h2>
                                <p className='text-muted-foreground'>
                                    {t("chooseType.desc")}
                                </p>
                            </div>

                            <div className='grid gap-6 md:grid-cols-3'>
                                {Object.entries(readingConfig).map(
                                    ([key, config]) => (
                                        <Card
                                            key={key}
                                            className='p-6 bg-card/10 backdrop-blur-sm border-border/20 hover:border-primary/50 cursor-pointer transition-all duration-300 hover:scale-105 card-glow'
                                            onClick={() =>
                                                handleReadingTypeSelect(
                                                    key as
                                                        | "simple"
                                                        | "intermediate"
                                                        | "advanced"
                                                )
                                            }
                                        >
                                            <div className='text-center space-y-4'>
                                                <div className='w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center'>
                                                    <span className='text-primary text-2xl font-bold'>
                                                        {config.cards}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className='font-serif font-semibold text-lg'>
                                                        {config.title}
                                                    </h3>
                                                    <p className='text-sm text-muted-foreground mt-1'>
                                                        {config.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
