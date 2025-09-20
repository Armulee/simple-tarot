"use client"

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { useTarot } from '@/contexts/tarot-context';
import { useTranslations } from 'next-intl';
import RewardedAd from '@/components/ads/rewarded-ad';
import { CardImage } from '@/components/card-image';
import { getCleanQuestionText } from '@/lib/question-utils';

export default function AdViewing() {
    const t = useTranslations('ReadingPage.adViewing');
    const {
        currentStep,
        setCurrentStep,
        question,
        selectedCards,
        isFollowUp,
        followUpQuestion,
    } = useTarot();

    const handleAdCompleted = () => {
        // Move to interpretation step after ad is completed
        setCurrentStep('interpretation');
    };

    const handleAdSkipped = () => {
        // Handle case where user skips ad (optional - you might want to redirect or show message)
        console.log('Ad was skipped');
        // For now, we'll still proceed to interpretation
        setCurrentStep('interpretation');
    };

    const handleAdError = (error: string) => {
        console.error('Ad error:', error);
        // Handle ad error - for now, proceed to interpretation
        setCurrentStep('interpretation');
    };

    if (currentStep !== 'ad-viewing') {
        return null;
    }

    return (
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

            {/* Rewarded Ad Component */}
            <div className="flex justify-center">
                <RewardedAd
                    onAdCompleted={handleAdCompleted}
                    onAdSkipped={handleAdSkipped}
                    onAdError={handleAdError}
                />
            </div>

            {/* Footer */}
            <Card className="p-4 bg-card/5 backdrop-blur-sm border-border/10">
                <p className="text-xs text-muted-foreground text-center">
                    {t('disclaimer')}
                </p>
            </Card>
        </div>
    );
}