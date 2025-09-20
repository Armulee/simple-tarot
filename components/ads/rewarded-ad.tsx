"use client"

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AD_CONFIG } from '@/lib/admob-config';

interface RewardedAdProps {
    onAdCompleted: () => void;
    onAdSkipped?: () => void;
    onAdError?: (error: string) => void;
}

interface AdState {
    status: 'loading' | 'ready' | 'playing' | 'completed' | 'error';
    watchTime: number;
    progress: number;
    error?: string;
}

export default function RewardedAd({ onAdCompleted, onAdSkipped, onAdError }: RewardedAdProps) {
    const t = useTranslations('ReadingPage.rewardedAd');
    const [adState, setAdState] = useState<AdState>({
        status: 'loading',
        watchTime: 0,
        progress: 0,
    });
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const adContainerRef = useRef<HTMLDivElement>(null);

    // Simulate ad loading
    useEffect(() => {
        const loadAd = async () => {
            try {
                // Simulate loading time
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                setAdState(prev => ({
                    ...prev,
                    status: 'ready',
                }));
            } catch (error) {
                setAdState(prev => ({
                    ...prev,
                    status: 'error',
                    error: 'Failed to load ad',
                }));
                onAdError?.('Failed to load ad');
            }
        };

        loadAd();
    }, [onAdError]);

    const startAd = () => {
        setAdState(prev => ({
            ...prev,
            status: 'playing',
        }));

        // Start progress tracking
        intervalRef.current = setInterval(() => {
            setAdState(prev => {
                const newWatchTime = prev.watchTime + 1;
                const progress = (newWatchTime / AD_CONFIG.AD_SETTINGS.REWARDED_VIDEO_DURATION) * 100;
                
                // Check if user has watched enough to get reward
                if (newWatchTime >= AD_CONFIG.AD_SETTINGS.MIN_WATCH_TIME && prev.status === 'playing') {
                    clearInterval(intervalRef.current!);
                    return {
                        ...prev,
                        status: 'completed',
                        watchTime: newWatchTime,
                        progress: 100,
                    };
                }
                
                // Check if ad is finished
                if (newWatchTime >= AD_CONFIG.AD_SETTINGS.REWARDED_VIDEO_DURATION) {
                    clearInterval(intervalRef.current!);
                    return {
                        ...prev,
                        status: 'completed',
                        watchTime: newWatchTime,
                        progress: 100,
                    };
                }
                
                return {
                    ...prev,
                    watchTime: newWatchTime,
                    progress,
                };
            });
        }, 1000);
    };

    const handleAdComplete = () => {
        if (adState.watchTime >= AD_CONFIG.AD_SETTINGS.MIN_WATCH_TIME) {
            onAdCompleted();
        } else {
            onAdError?.('Ad not watched completely');
        }
    };

    const handleSkip = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        onAdSkipped?.();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    const renderAdContent = () => {
        switch (adState.status) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">{t('loading')}</p>
                    </div>
                );
            
            case 'ready':
                return (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                            <Play className="w-10 h-10 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg">{t('ready.title')}</h3>
                            <p className="text-muted-foreground">{t('ready.description')}</p>
                        </div>
                        <Button 
                            onClick={startAd}
                            className="px-8 py-3 bg-gradient-to-r from-[#15a6ff] to-[#b56cff] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            {t('ready.button')}
                        </Button>
                    </div>
                );
            
            case 'playing':
                return (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                            <Clock className="w-10 h-10 text-accent" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg">{t('playing.title')}</h3>
                            <p className="text-muted-foreground">
                                {t('playing.timeRemaining', { 
                                    seconds: AD_CONFIG.AD_SETTINGS.REWARDED_VIDEO_DURATION - adState.watchTime 
                                })}
                            </p>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full max-w-xs">
                            <div className="flex justify-between text-sm text-muted-foreground mb-2">
                                <span>{t('playing.progress')}</span>
                                <span>{Math.round(adState.progress)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                    className="bg-gradient-to-r from-[#15a6ff] to-[#b56cff] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${adState.progress}%` }}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <Button 
                                onClick={handleSkip}
                                variant="outline"
                                className="px-6"
                            >
                                {t('playing.skip')}
                            </Button>
                        </div>
                    </div>
                );
            
            case 'completed':
                return (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg text-green-600">{t('completed.title')}</h3>
                            <p className="text-muted-foreground">{t('completed.description')}</p>
                        </div>
                        <Button 
                            onClick={handleAdComplete}
                            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            {t('completed.button')}
                        </Button>
                    </div>
                );
            
            case 'error':
                return (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-destructive" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg text-destructive">{t('error.title')}</h3>
                            <p className="text-muted-foreground">{adState.error}</p>
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                onClick={() => window.location.reload()}
                                variant="outline"
                            >
                                {t('error.retry')}
                            </Button>
                            <Button 
                                onClick={onAdSkipped}
                                variant="default"
                            >
                                {t('error.skip')}
                            </Button>
                        </div>
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto border-0 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl translate-x-16 translate-y-16" />
            </div>
            
            <div className="relative z-10 p-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h2 className="font-serif font-bold text-xl">{t('title')}</h2>
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-muted-foreground">{t('subtitle')}</p>
                </div>

                {/* Ad content */}
                <div ref={adContainerRef} className="min-h-[300px]">
                    {renderAdContent()}
                </div>

                {/* Footer info */}
                <div className="mt-6 pt-4 border-t border-border/20">
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                            {t('reward')}
                        </Badge>
                    </div>
                </div>
            </div>
        </Card>
    );
}