"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { useTarot } from '@/contexts/tarot-context';
import { useTranslations } from 'next-intl';
import { useCompletion } from '@ai-sdk/react';
import AdViewingDialog from '@/components/ads/ad-viewing-dialog';
import OptimizedRewardedAd from '@/components/ads/optimized-rewarded-ad';
import { CardImage } from '@/components/card-image';
import { getCleanQuestionText } from '@/lib/question-utils';

export default function AdViewing() {
    const t = useTranslations('ReadingPage.adViewing');
    const {
        currentStep,
        setCurrentStep,
        question,
        selectedCards,
        setInterpretation,
        isFollowUp,
        followUpQuestion,
    } = useTarot();

    const [showDialog, setShowDialog] = useState(false);
    const [showAd, setShowAd] = useState(false);
    const [interpretationPromise, setInterpretationPromise] = useState<Promise<string> | null>(null);
    const hasInitiated = useRef(false);

    const { complete } = useCompletion({
        api: "/api/interpret-cards/question",
    });

    const startInterpretation = React.useCallback(async (): Promise<string> => {
        const currentQuestion = isFollowUp && followUpQuestion ? followUpQuestion : question;
        
        if (!currentQuestion || selectedCards.length === 0) {
            throw new Error('Missing question or cards');
        }

        const prompt = `Question: "${currentQuestion}"
Cards: ${selectedCards.map((c) => c.meaning).join(", ")}

From this information, provide a concise interpretation of the cards that directly addresses the user's question. If the interpretation is harm user's feeling, tone it down to be more positive and uplifting. Answer it as paragraph. No more than 100 words.

If the interpretation is too negative, tone it down to be more positive and uplifting.
If the interpretation is too positive, tone it down to be more realistic and down to earth.
If the interpretation is too vague, add more details to make it more specific.
If the interpretation is too long, shorten it to be more concise.
If the interpretation is too short, add more details to make it more specific.
If the interpretation is too generic, add more details to make it more specific.`;

        const result = await complete(prompt);
        return result || '';
    }, [complete, isFollowUp, followUpQuestion, question, selectedCards]);

    const startAdProcess = React.useCallback(() => {
        setShowDialog(false);
        
        // Start interpretation fetching
        const interpretationPromise = startInterpretation();
        setInterpretationPromise(interpretationPromise);
        
        // Show the ad
        setShowAd(true);
    }, [startInterpretation]);

    // Show dialog when entering ad-viewing step
    useEffect(() => {
        if (currentStep === 'ad-viewing' && !hasInitiated.current) {
            hasInitiated.current = true;
            
            // Check if user wants to auto-play ads
            const autoPlayAds = localStorage.getItem('auto-play-ads') === 'true';
            
            if (autoPlayAds) {
                // Auto-start the ad process
                startAdProcess();
            } else {
                // Show dialog
                setShowDialog(true);
            }
        }
    }, [currentStep, startAdProcess]);

    const handleAdCompleted = (interpretationData?: string) => {
        if (interpretationData) {
            setInterpretation(interpretationData);
        } else if (interpretationPromise) {
            // Fallback: get interpretation from promise
            interpretationPromise.then((interpretation) => {
                setInterpretation(interpretation);
            });
        }
        
        setShowAd(false);
        setCurrentStep('interpretation');
    };

    const handleAdSkipped = () => {
        console.log('Ad was skipped');
        setShowAd(false);
        setCurrentStep('interpretation');
    };

    const handleAdError = (error: string) => {
        console.error('Ad error:', error);
        setShowAd(false);
        setCurrentStep('interpretation');
    };

    if (currentStep !== 'ad-viewing') {
        return null;
    }

    return (
        <>
            {/* Ad Viewing Dialog */}
            <AdViewingDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                onWatchAd={startAdProcess}
                question={question}
                selectedCards={selectedCards}
                isFollowUp={isFollowUp}
                followUpQuestion={followUpQuestion}
            />

            {/* Ad Viewing Screen */}
            {showAd && (
                <div className="space-y-8 animate-fade-in">
                    {/* Header */}
                    <Card className="px-6 pt-10 pb-6 border-0 relative overflow-hidden">
                        {/* Background card images with aura */}
                        <div className="absolute inset-0 pointer-events-none">
                            {selectedCards.map((card, index) => {
                                const positions = [
                                    {
                                        top: "10%",
                                        left: "5%",
                                        transform: "rotate(-15deg)",
                                    },
                                    {
                                        top: "15%",
                                        right: "8%",
                                        transform: "rotate(20deg)",
                                    },
                                    {
                                        bottom: "20%",
                                        left: "10%",
                                        transform: "rotate(-10deg)",
                                    },
                                    {
                                        bottom: "15%",
                                        right: "12%",
                                        transform: "rotate(25deg)",
                                    },
                                ];
                                const position = positions[index % positions.length];

                                return (
                                    <div
                                        key={`bg-${index}`}
                                        className="absolute opacity-20"
                                        style={position}
                                    >
                                        <CardImage
                                            card={card}
                                            size="sm"
                                            showAura={true}
                                            showLabel={false}
                                            className="scale-75"
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center space-y-6 relative z-10">
                            <div className="flex items-center justify-center space-x-2 relative">
                                <Eye className="w-6 h-6 text-primary" />
                                <h1 className="font-serif font-bold text-2xl relative">
                                    {isFollowUp && (
                                        <Badge
                                            variant="secondary"
                                            className="absolute -top-6 -left-8 -rotate-12 bg-accent/20 text-white border-white/30"
                                        >
                                            {t('followUp.badge')}
                                        </Badge>
                                    )}
                                    {t('title')}
                                </h1>
                                <Eye className="w-6 h-6 text-primary" />
                            </div>
                            
                            <p className="text-muted-foreground italic">
                                &ldquo;
                                {getCleanQuestionText(
                                    isFollowUp && followUpQuestion
                                        ? followUpQuestion
                                        : question || ""
                                )}
                                &rdquo;
                            </p>

                            {/* Selected Cards Preview */}
                            <div className="flex flex-wrap gap-4 justify-center">
                                {selectedCards.map((card, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <Badge
                                            variant="secondary"
                                            className="bg-accent/20 text-accent border-accent/30"
                                        >
                                            {card.meaning}
                                        </Badge>
                                        <CardImage
                                            card={card}
                                            size="sm"
                                            showAura={true}
                                            showLabel={false}
                                            className="opacity-80"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="max-w-md mx-auto">
                                <p className="text-sm text-muted-foreground">
                                    {t('description')}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Optimized Rewarded Ad Component */}
                    <div className="flex justify-center">
                        <OptimizedRewardedAd
                            onAdCompleted={handleAdCompleted}
                            onAdSkipped={handleAdSkipped}
                            onAdError={handleAdError}
                            onStartInterpretation={() => {
                                // This will be called when interpretation starts
                                console.log('Starting interpretation...');
                            }}
                            interpretationPromise={interpretationPromise || undefined}
                        />
                    </div>

                    {/* Footer */}
                    <Card className="p-4 bg-card/5 backdrop-blur-sm border-border/10">
                        <p className="text-xs text-muted-foreground text-center">
                            {t('disclaimer')}
                        </p>
                    </Card>
                </div>
            )}
        </>
    );
}