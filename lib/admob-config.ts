// AdMob/AdSense Configuration
export const AD_CONFIG = {
    // Test ad unit IDs for development
    TEST_UNITS: {
        REWARDED_VIDEO: 'ca-app-pub-3940256099942544/5224354917', // Test rewarded video
    },
    
    // Production ad unit IDs (replace with your actual IDs)
    PRODUCTION_UNITS: {
        REWARDED_VIDEO: process.env.NEXT_PUBLIC_ADMOB_REWARDED_VIDEO_ID || '',
    },
    
    // Get the appropriate ad unit ID based on environment
    getRewardedVideoId: () => {
        return process.env.NODE_ENV === 'development' 
            ? AD_CONFIG.TEST_UNITS.REWARDED_VIDEO
            : AD_CONFIG.PRODUCTION_UNITS.REWARDED_VIDEO;
    },
    
    // Ad settings
    AD_SETTINGS: {
        REWARDED_VIDEO_DURATION: 30, // seconds
        MIN_WATCH_TIME: 25, // minimum seconds user must watch to get reward
        AD_TIMEOUT: 10000, // 10 seconds timeout for ad loading
    }
};