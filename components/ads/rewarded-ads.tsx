"use client"

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, Clock, Sparkles, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AD_CONFIG } from '@/lib/admob-config';
import { createRewardedAd, RewardedAdCallbacks } from '@/lib/google-ad-manager';

interface RewardedAdsProps {
    onAdCompleted: (interpretationData?: string) => void;
    onAdSkipped?: () => void;
    onAdError?: (error: string) => void;
    onStartInterpretation?: () => void;
    interpretationPromise?: Promise<string>;
}

interface AdState {
    status: 'loading' | 'ready' | 'playing' | 'completed' | 'error';
    watchTime: number;
    progress: number;
    error?: string;
    interpretationReady: boolean;
}

export default function RewardedAds({ 
    onAdCompleted, 
    onAdSkipped, 
    onAdError,
    onStartInterpretation,
    interpretationPromise
}: RewardedAdsProps) {
    const t = useTranslations('ReadingPage.optimizedRewardedAd');
    const [adState, setAdState] = useState<AdState>({
        status: 'loading',
        watchTime: 0,
        progress: 0,
        interpretationReady: false,
    });
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const interpretationRef = useRef<string | null>(null);
    const adManagerRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

    // Start interpretation fetching when component mounts
    useEffect(() => {
        if (interpretationPromise && onStartInterpretation) {
            onStartInterpretation();
            
            interpretationPromise
                .then((interpretation) => {
                    interpretationRef.current = interpretation;
                    setAdState(prev => ({
                        ...prev,
                        interpretationReady: true,
                    }));
                })
                .catch(() => {
                    console.error('Interpretation fetch failed');
                    setAdState(prev => ({
                        ...prev,
                        interpretationReady: false,
                    }));
                });
        }
    }, [interpretationPromise, onStartInterpretation]);

    // Helper functions for real ad handling
    const startRealAd = useCallback(() => {
        if (adManagerRef.current) {
            adManagerRef.current.showAd();
        }
    }, []);

    const handleRealAdComplete = useCallback(() => {
        // Save that ads have been watched
        localStorage.setItem('watchedAds', 'true');
        setAdState(prev => ({
            ...prev,
            status: 'completed',
            progress: 100,
        }));
        onAdCompleted(interpretationRef.current || undefined);
    }, [onAdCompleted]);

    const handleAdSkip = useCallback(() => {
        // Save that ads have been watched (even if skipped)
        localStorage.setItem('watchedAds', 'true');
        onAdSkipped?.();
    }, [onAdSkipped]);

    // Fallback to simulated ad when real ads fail
    const fallbackToSimulatedAd = useCallback(() => {
        console.log('Falling back to simulated ad');
        setAdState(prev => ({
            ...prev,
            status: 'ready',
        }));

        // Auto-start the simulated ad after a short delay
        setTimeout(() => {
            startAd();
        }, 500);
    }, []);

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

    // Initialize and load real Google Ad Manager ads
    useEffect(() => {
        const watchedAds = localStorage.getItem('watchedAds');
        if (watchedAds === 'true') {
            // Ads already watched, skip directly to completion
            console.log('Ads already watched, skipping...');
            onAdCompleted();
            return;
        }

        // Initialize Google Ad Manager
        const initializeRealAds = async () => {
            try {
                // Create real rewarded ad instance
                const adUnitId = AD_CONFIG.getRewardedVideoId();
                adManagerRef.current = createRewardedAd(adUnitId);

                // Set up ad callbacks
                const callbacks: RewardedAdCallbacks = {
                    onAdLoaded: () => {
                        console.log('Real ad loaded successfully');
                        setAdState(prev => ({
                            ...prev,
                            status: 'ready',
                        }));

                        // Auto-start the ad after a short delay
                        setTimeout(() => {
                            startRealAd();
                        }, 500);
                    },
                    onAdFailedToLoad: (error: string) => {
                        console.error('Real ad failed to load:', error);
                        // Fallback to simulated ad on error
                        fallbackToSimulatedAd();
                    },
                    onAdStarted: () => {
                        console.log('Real ad started playing');
                        setAdState(prev => ({
                            ...prev,
                            status: 'playing',
                        }));
                    },
                    onAdCompleted: () => {
                        console.log('Real ad completed');
                        handleRealAdComplete();
                    },
                    onAdClosed: () => {
                        console.log('Real ad closed');
                        handleAdSkip();
                    },
                    onUserEarnedReward: (reward) => {
                        console.log('User earned reward:', reward);
                        // Reward logic can be added here
                    }
                };

                adManagerRef.current.setCallbacks(callbacks);

                // Load the real ad
                await adManagerRef.current.loadAd();

            } catch (error) {
                console.error('Failed to initialize real ads:', error);
                // Fallback to simulated ad
                fallbackToSimulatedAd();
            }
        };

        initializeRealAds();

        // Cleanup function
        return () => {
            if (adManagerRef.current) {
                adManagerRef.current.destroy();
            }
        };
    }, [onAdError, onAdCompleted, startRealAd, handleRealAdComplete, handleAdSkip, fallbackToSimulatedAd]);

    const handleAdComplete = () => {
        if (adState.watchTime >= AD_CONFIG.AD_SETTINGS.MIN_WATCH_TIME) {
            // Save that ads have been watched
            localStorage.setItem('watchedAds', 'true');
            onAdCompleted(interpretationRef.current || undefined);
        } else {
            onAdError?.('Ad not watched completely');
        }
    };

    const handleSkip = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        // Save that ads have been watched (even if skipped)
        localStorage.setItem('watchedAds', 'true');
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
                        {interpretationPromise && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Zap className="w-4 h-4" />
                                <span>{t('preparingReading')}</span>
                            </div>
                        )}
                    </div>
                );
            
            case 'ready':
                return (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                            <Play className="w-10 h-10 text-primary animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg">{t('ready.title')}</h3>
                            <p className="text-muted-foreground">{t('ready.description')}</p>
                            <p className="text-sm text-primary font-medium">Real ad will start automatically...</p>
                            <Badge variant="outline" className="text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Google Ad Manager
                            </Badge>
                        </div>
                        
                        {/* Show interpretation status */}
                        {interpretationPromise && (
                            <div className="flex items-center space-x-2 text-sm">
                                {adState.interpretationReady ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-green-600">{t('interpretationReady')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                        <span className="text-primary">{t('preparingInterpretation')}</span>
                                    </>
                                )}
                            </div>
                        )}
                        
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

                        {/* Show interpretation status while playing */}
                        {interpretationPromise && (
                            <div className="flex items-center space-x-2 text-sm">
                                {adState.interpretationReady ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-green-600">{t('interpretationReady')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                        <span className="text-primary">{t('preparingInterpretation')}</span>
                                    </>
                                )}
                            </div>
                        )}
                        
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

                        {/* Show interpretation status */}
                        {interpretationPromise && (
                            <div className="flex items-center space-x-2 text-sm">
                                {adState.interpretationReady ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-green-600">{t('interpretationReady')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                        <span className="text-primary">{t('preparingInterpretation')}</span>
                                    </>
                                )}
                            </div>
                        )}
                        
                        <Button 
                            onClick={handleAdComplete}
                            disabled={interpretationPromise && !adState.interpretationReady}
                            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="min-h-[300px]">
                    {renderAdContent()}
                </div>

                {/* Footer info */}
                <div className="mt-6 pt-4 border-t border-border/20">
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                            {t('reward')}
                        </Badge>
                        {interpretationPromise && (
                            <Badge variant="outline" className="text-xs">
                                {t('optimized')}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}