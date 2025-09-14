"use client"
import { Pencil } from "lucide-react"
import { Button } from "../ui/button"
import { Card } from "../ui/card"
import { useTarot } from "@/contexts/tarot-context"
import { ReadingConfig } from "./reading-page-content"

export default function ReadingType({
    readingConfig,
}: {
    readingConfig: ReadingConfig
}) {
    const { currentStep, setCurrentStep, question, setReadingType } = useTarot()
    const handleEditQuestion = () => {
        setCurrentStep("question")
    }

    const handleReadingTypeSelect = (
        type: "simple" | "intermediate" | "advanced"
    ) => {
        setReadingType(type)
        setCurrentStep("card-selection")
    }
    return (
        <>
            {currentStep === "reading-type" && (
                <div className='space-y-8 animate-fade-in'>
                    <Card className='px-6 pt-10 pb-6 border-0'>
                        <div className='text-center space-y-2'>
                            <div className='flex items-center justify-center gap-2'>
                                <h2 className='font-serif font-semibold text-xl'>
                                    Your Question
                                </h2>
                                <Button
                                    onClick={handleEditQuestion}
                                    variant='ghost'
                                    size='sm'
                                    className='h-8 w-8 p-0 hover:bg-primary/10'
                                >
                                    <Pencil className='h-4 w-4 text-muted-foreground hover:text-primary' />
                                </Button>
                            </div>
                            <p className='text-muted-foreground italic'>
                                &ldquo;{question}&rdquo;
                            </p>
                        </div>
                    </Card>

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
                </div>
            )}
        </>
    )
}
