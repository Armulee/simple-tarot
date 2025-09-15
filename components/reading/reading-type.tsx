"use client"
import { Card } from "../ui/card"
import { Badge } from "../ui/badge"
import { useTarot } from "@/contexts/tarot-context"
import { ReadingConfig } from "../../app/reading/page"
import { isFollowUpQuestion } from "@/lib/question-utils"
import { useEffect } from "react"
import EditableQuestion from "./editable-question"

export default function ReadingType({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    const {
        currentStep,
        setCurrentStep,
        question,
        setQuestion,
        readingType,
        setReadingType,
    } = useTarot()

    const handleReadingTypeSelect = (
        type: "simple" | "intermediate" | "advanced"
    ) => {
        setReadingType(type)
        setCurrentStep("card-selection")
    }

    // For follow-up questions, automatically go to card selection
    useEffect(() => {
        if (isFollowUpQuestion(question) && readingType === "simple") {
            setCurrentStep("card-selection")
        }
    }, [question, readingType, setCurrentStep])
    return (
        <>
            {currentStep === "reading-type" && (
                <div className='space-y-8 animate-fade-in'>
                    <Card className='px-6 pt-12 pb-6 border-0'>
                        <EditableQuestion
                            question={question}
                            onQuestionChange={setQuestion}
                        />
                    </Card>

                    {isFollowUpQuestion(question) ? (
                        <div className='space-y-6'>
                            <div className='text-center space-y-4'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    Follow-up Reading
                                </h2>
                                <p className='text-muted-foreground'>
                                    Follow-up questions use a simple single-card
                                    reading for focused guidance
                                </p>
                                <div className='flex justify-center'>
                                    <Badge
                                        variant='secondary'
                                        className='bg-primary/20 text-primary border-primary/30 px-4 py-2'
                                    >
                                        Simple Reading - 1 Card
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-6'>
                            <div className='text-center space-y-2'>
                                <h2 className='font-serif font-bold text-2xl'>
                                    Choose Your Reading Type
                                </h2>
                                <p className='text-muted-foreground'>
                                    Select the depth of guidance you seek
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
