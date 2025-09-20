"use client"

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Play, Eye, Clock, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CardImage } from '@/components/card-image';
import { TarotCard } from '@/contexts/tarot-context';
import { getCleanQuestionText } from '@/lib/question-utils';

interface CustomAdDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWatchAd: () => void;
    question: string | null;
    selectedCards: TarotCard[];
    isFollowUp?: boolean;
    followUpQuestion?: string | null;
}

export default function CustomAdDialog({
    open,
    onOpenChange,
    onWatchAd,
    question,
    selectedCards,
    isFollowUp,
    followUpQuestion,
}: CustomAdDialogProps) {
    const t = useTranslations('ReadingPage.adViewingDialog');
    const [rememberPreference, setRememberPreference] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Ensure component is mounted on client side
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load saved preference on mount
    useEffect(() => {
        const savedPreference = localStorage.getItem('auto-play-ads');
        setRememberPreference(savedPreference === 'true');
    }, []);

    const handlePreferenceChange = (checked: boolean) => {
        setRememberPreference(checked);
        localStorage.setItem('auto-play-ads', checked.toString());
    };

    const handleWatchAd = () => {
        onWatchAd();
        onOpenChange(false);
    };

    if (!mounted || !open) {
        return null;
    }

    const dialogContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            
            {/* Dialog Content */}
            <div className="relative z-[110] w-full max-w-md mx-auto bg-background border border-border rounded-lg shadow-xl">
                <div className="relative overflow-hidden">
                    {/* Background effects */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                        <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-x-16 -translate-y-16" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl translate-x-16 translate-y-16" />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute top-4 right-4 z-20 p-1 rounded-full hover:bg-muted/50 transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>

                    {/* Header */}
                    <div className="relative z-10 p-6 pb-4">
                        <div className="flex items-center justify-center space-x-2 mb-4">
                            <Eye className="w-6 h-6 text-primary" />
                            <h2 className="font-serif font-bold text-xl text-center">
                                {t('title')}
                            </h2>
                            <Eye className="w-6 h-6 text-primary" />
                        </div>

                        {/* Question preview */}
                        <div className="text-center space-y-2 mb-6">
                            <p className="text-sm text-muted-foreground">{t('questionLabel')}</p>
                            <p className="text-sm italic text-foreground">
                                &ldquo;
                                {getCleanQuestionText(
                                    isFollowUp && followUpQuestion
                                        ? followUpQuestion
                                        : question || ""
                                )}
                                &rdquo;
                            </p>
                        </div>

                        {/* Selected cards preview */}
                        <div className="space-y-3 mb-6">
                            <p className="text-sm text-muted-foreground text-center">{t('selectedCards')}</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {selectedCards.map((card, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col items-center gap-1"
                                    >
                                        <Badge
                                            variant="secondary"
                                            className="bg-accent/20 text-accent border-accent/30 text-xs"
                                        >
                                            {card.meaning}
                                        </Badge>
                                        <CardImage
                                            card={card}
                                            size="sm"
                                            showAura={true}
                                            showLabel={false}
                                            className="opacity-80 scale-75"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 px-6 pb-6 space-y-4">
                        {/* Ad benefits */}
                        <div className="flex items-start space-x-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <Gift className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-primary">{t('benefits.title')}</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• {t('benefits.freeReading')}</li>
                                    <li>• {t('benefits.detailedInterpretation')}</li>
                                    <li>• {t('benefits.supportService')}</li>
                                </ul>
                            </div>
                        </div>

                        {/* Ad duration info */}
                        <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded-lg">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{t('duration')}</span>
                        </div>

                        {/* Remember preference checkbox */}
                        <div className="flex items-center space-x-2 p-2 bg-muted/30 rounded-lg">
                            <Checkbox
                                id="remember-preference"
                                checked={rememberPreference}
                                onCheckedChange={handlePreferenceChange}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label 
                                htmlFor="remember-preference" 
                                className="text-sm text-muted-foreground cursor-pointer"
                            >
                                {t('rememberPreference')}
                            </Label>
                        </div>

                        <div className="text-xs text-muted-foreground text-center">
                            {t('disclaimer')}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="relative z-10 px-6 pb-6 flex space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            {t('skip')}
                        </Button>
                        <Button
                            onClick={handleWatchAd}
                            className="flex-1 bg-gradient-to-r from-[#15a6ff] to-[#b56cff] hover:from-[#0ea5e9] hover:to-[#a855f7] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            {t('watchAd')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render using portal to ensure it's at document body level
    return createPortal(dialogContent, document.body);
}