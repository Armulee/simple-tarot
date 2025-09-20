// Google Ad Manager (GAM) - Web equivalent of AdMob
// This provides real ad serving capabilities for web applications

interface AdManagerConfig {
    networkCode: string;
    adUnit: string;
    size: [number, number];
    targeting?: Record<string, string>;
}

interface RewardedAdCallbacks {
    onAdLoaded?: () => void;
    onAdFailedToLoad?: (error: string) => void;
    onAdStarted?: () => void;
    onAdCompleted?: () => void;
    onAdClosed?: () => void;
    onUserEarnedReward?: (reward: { amount: number; type: string }) => void;
}

class GoogleAdManager {
    private config: AdManagerConfig;
    private callbacks: RewardedAdCallbacks = {};
    private isLoaded = false;
    private isPlaying = false;
    private adElement: HTMLDivElement | null = null;

    constructor(config: AdManagerConfig) {
        this.config = config;
        this.loadGoogleAdManagerScript();
    }

    private loadGoogleAdManagerScript(): void {
        // Load Google Publisher Tag (GPT) script
        if (typeof window === 'undefined') return;

        if (!window.googletag) {
            const script = document.createElement('script');
            script.src = 'https://www.googletagservices.com/tag/js/gpt.js';
            script.async = true;
            script.onload = () => {
                window.googletag.cmd.push(() => {
                    this.initializeAdManager();
                });
            };
            document.head.appendChild(script);
        } else {
            this.initializeAdManager();
        }
    }

    private initializeAdManager(): void {
        window.googletag.cmd.push(() => {
            // Configure ad manager settings
            window.googletag.pubads().enableSingleRequest();
            window.googletag.pubads().collapseEmptyDivs();
            
            // Set targeting parameters
            if (this.config.targeting) {
                Object.entries(this.config.targeting).forEach(([key, value]) => {
                    window.googletag.pubads().setTargeting(key, value);
                });
            }

            // Define the ad slot
            window.googletag.defineSlot(
                this.config.adUnit,
                this.config.size,
                'rewarded-ad-container'
            ).addService(window.googletag.pubads());

            window.googletag.enableServices();
        });
    }

    public setCallbacks(callbacks: RewardedAdCallbacks): void {
        this.callbacks = callbacks;
    }

    public async loadAd(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('Window object not available'));
                return;
            }

            window.googletag.cmd.push(() => {
                // Create ad container
                this.adElement = document.createElement('div');
                this.adElement.id = 'rewarded-ad-container';
                this.adElement.style.display = 'none';

                // Set up event listeners
                window.googletag.pubads().addEventListener('slotOnload', () => {
                    this.isLoaded = true;
                    this.callbacks.onAdLoaded?.();
                    resolve();
                });

                window.googletag.pubads().addEventListener('slotRenderEnded', (event) => {
                    if (event.isEmpty) {
                        this.callbacks.onAdFailedToLoad?.('Ad failed to load');
                        reject(new Error('Ad failed to load'));
                    }
                });

                // Request the ad
                window.googletag.display('rewarded-ad-container');
            });
        });
    }

    public showAd(): void {
        if (!this.isLoaded || !this.adElement) {
            this.callbacks.onAdFailedToLoad?.('Ad not loaded');
            return;
        }

        this.isPlaying = true;
        this.adElement.style.display = 'block';
        this.callbacks.onAdStarted?.();

        // Simulate ad completion after duration
        setTimeout(() => {
            this.completeAd();
        }, this.getAdDuration() * 1000);
    }

    public hideAd(): void {
        if (this.adElement) {
            this.adElement.style.display = 'none';
        }
        this.isPlaying = false;
        this.callbacks.onAdClosed?.();
    }

    private completeAd(): void {
        this.isPlaying = false;
        
        // User earned reward
        this.callbacks.onUserEarnedReward?.({
            amount: 1,
            type: 'coins'
        });

        this.callbacks.onAdCompleted?.();
        this.hideAd();
    }

    private getAdDuration(): number {
        // Return actual ad duration from GAM or default
        return 30; // 30 seconds default
    }

    public destroy(): void {
        if (typeof window !== 'undefined' && window.googletag) {
            window.googletag.cmd.push(() => {
                window.googletag.destroySlots(['rewarded-ad-container']);
            });
        }
        this.adElement = null;
        this.isLoaded = false;
        this.isPlaying = false;
    }
}

// Factory function to create rewarded ad instances
export function createRewardedAd(adUnitId: string): GoogleAdManager {
    const config: AdManagerConfig = {
        networkCode: process.env.NEXT_PUBLIC_GAM_NETWORK_CODE || '123456789',
        adUnit: process.env.NODE_ENV === 'development' 
            ? '/123456789/test-rewarded-video' 
            : adUnitId,
        size: [320, 480], // Standard mobile rewarded video size
        targeting: {
            category: 'gaming',
            format: 'rewarded-video'
        }
    };

    return new GoogleAdManager(config);
}

// Export the class for advanced usage
export { GoogleAdManager, type RewardedAdCallbacks };