"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Play, Gift, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AdDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWatchAd: () => void;
}

interface Star {
    id: number;
    size: "1px" | "2px" | "3px";
    top: string;
    left: string;
    animation: string;
    duration: string;
    color: string;
}

const generateRandomStars = (count: number = 30): Star[] => {
    const animations = [
        "animate-pulse",
        "animate-bounce",
        "animate-ping",
        "animate-spin",
    ];
    const sizes: ("1px" | "2px" | "3px")[] = ["1px", "2px", "3px"];
    const colors = [
        "#ffffff",
        "#e0e7ff",
        "#c7d2fe",
        "#a5b4fc",
        "#818cf8",
        "#6366f1",
        "#8b5cf6",
        "#d946ef",
        "#f97316",
        "#fbbf24",
    ];
    const durations = [
        "2.0s",
        "2.5s",
        "3.0s",
        "3.5s",
        "4.0s",
        "4.5s",
        "5.0s",
        "5.5s",
        "6.0s",
        "6.5s",
        "7.0s",
    ];

    return Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        top: `${Math.floor(Math.random() * 95) + 2}%`,
        left: `${Math.floor(Math.random() * 95) + 2}%`,
        animation: animations[Math.floor(Math.random() * animations.length)],
        duration: durations[Math.floor(Math.random() * durations.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
    }));
};

export default function AdDialog({
    open,
    onOpenChange,
    onWatchAd,
}: AdDialogProps) {
    const t = useTranslations('ReadingPage.adViewingDialog');
    const [rememberPreference, setRememberPreference] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Generate cosmic stars for the dialog background
    const stars = useMemo(
        () => (mounted ? generateRandomStars(60) : []),
        [mounted]
    );

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
        // Don't save to localStorage here - only save when user actually watches ads
    };

    const handleWatchAd = () => {
        // Save the preference to localStorage only when user actually watches ads
        if (rememberPreference) {
            localStorage.setItem('auto-play-ads', 'true');
            // Clear watched ads localStorage when user sets preference to auto-play
            localStorage.removeItem('watchedAds');
        } else {
            // If unchecked, remove the preference
            localStorage.removeItem('auto-play-ads');
        }
        
        // Clear watched ads localStorage when user chooses to watch ads
        localStorage.removeItem('watchedAds');
        onWatchAd();
        onOpenChange(false);
    };

    if (!mounted || !open) {
        return null;
    }

    const dialogContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Enhanced Overlay with Cosmic Stars - Fully Opaque Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-900 to-black">
                {/* Cosmic Stars Background */}
                <div className="absolute inset-0 pointer-events-none">
                    {stars.map((star) => (
                        <div
                            key={star.id}
                            className={`absolute rounded-full pointer-events-none ${star.animation}`}
                            style={{
                                width: star.size,
                                height: star.size,
                                backgroundColor: star.color,
                                top: star.top,
                                left: star.left,
                                animationDuration: star.duration,
                                boxShadow: `0 0 ${star.size} ${star.color}`,
                            }}
                        />
                    ))}
                </div>
                
                {/* Cosmic gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/3 to-transparent" />
            </div>
            
            {/* Enhanced Dialog Content */}
            <div className="relative z-[110] w-full max-w-lg mx-auto">
                <div className="relative overflow-hidden bg-gradient-to-br from-background/95 via-background/90 to-background/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                    {/* Enhanced Background Effects */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Cosmic gradient backgrounds */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-500/5 to-transparent" />
                        
                        {/* Floating cosmic orbs */}
                        <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-x-20 -translate-y-20 animate-pulse" />
                        <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-accent/20 to-transparent rounded-full blur-3xl translate-x-20 translate-y-20 animate-pulse" />
                        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-2xl -translate-x-16 -translate-y-16 animate-pulse" style={{ animationDelay: '1s' }} />
                        
                        {/* Sparkle effects */}
                        <div className="absolute top-4 left-4 w-2 h-2 bg-white rounded-full opacity-60 animate-ping" style={{ animationDelay: '0.5s' }} />
                        <div className="absolute top-8 right-8 w-1 h-1 bg-blue-400 rounded-full opacity-80 animate-ping" style={{ animationDelay: '1.5s' }} />
                        <div className="absolute bottom-6 left-8 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-70 animate-ping" style={{ animationDelay: '2s' }} />
                    </div>


                    {/* Enhanced Header */}
                    <div className="relative z-10 p-8 pb-6">
                        <div className="text-center space-y-4">
                            {/* Cosmic title with sparkles */}
                            <div className="flex items-center justify-center space-x-3">
                                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                                <h2 className="font-serif font-bold text-2xl bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent">
                                    {t('title')}
                                </h2>
                                <Sparkles className="w-6 h-6 text-accent animate-pulse" style={{ animationDelay: '0.5s' }} />
                            </div>
                            
                            {/* Subtitle */}
                            <p className="text-muted-foreground text-sm">
                                Unlock your cosmic guidance with a short ad
                            </p>
                        </div>
                    </div>

                    {/* Enhanced Content */}
                    <div className="relative z-10 px-8 pb-6 space-y-6">
                        {/* Enhanced Ad benefits */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-xl border border-primary/20 p-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                            <div className="relative flex items-start space-x-3">
                                <div className="p-2 bg-primary/20 rounded-lg">
                                    <Gift className="w-5 h-5 text-primary" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-primary">{t('benefits.title')}</p>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1 h-1 bg-primary rounded-full" />
                                            <span>{t('benefits.freeReading')}</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1 h-1 bg-accent rounded-full" />
                                            <span>{t('benefits.detailedInterpretation')}</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1 h-1 bg-blue-400 rounded-full" />
                                            <span>{t('benefits.supportService')}</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>


                        {/* Enhanced Remember preference checkbox */}
                        <div className="flex items-center justify-center space-x-3 p-4 bg-gradient-to-r from-muted/20 via-muted/10 to-muted/20 rounded-xl border border-white/5">
                            <Checkbox
                                id="remember-preference"
                                checked={rememberPreference}
                                onCheckedChange={handlePreferenceChange}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label 
                                htmlFor="remember-preference" 
                                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                            >
                                {t('rememberPreference')}
                            </Label>
                        </div>

                        <div className="text-xs text-muted-foreground text-center px-4">
                            {t('disclaimer')}
                        </div>
                    </div>

                    {/* Enhanced Footer */}
                    <div className="relative z-10 px-8 pb-8 space-y-4">
                        
                        {/* Enhanced Watch Ad Button */}
                        <Button
                            onClick={handleWatchAd}
                            className="w-full h-12 bg-gradient-to-r from-[#15a6ff] via-[#8b5cf6] to-[#b56cff] hover:from-[#0ea5e9] hover:via-[#7c3aed] hover:to-[#a855f7] text-white font-semibold shadow-2xl hover:shadow-[#15a6ff]/25 transition-all duration-500 transform hover:scale-[1.02] relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <Play className="w-5 h-5 mr-2 relative z-10" />
                            <span className="relative z-10">{t('watchAd')}</span>
                        </Button>
                        
                        {/* Enhanced Back Button */}
                        <div className="text-center">
                            <button
                                onClick={() => onOpenChange(false)}
                                className="text-sm text-muted-foreground hover:text-foreground underline transition-all duration-300 hover:scale-105 px-2 py-1 rounded hover:bg-white/5"
                            >
                                {t('backToCardSelection')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Render using portal to ensure it's at document body level
    return createPortal(dialogContent, document.body);
}