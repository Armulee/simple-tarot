// AdMob/AdSense Configuration
export const AD_CONFIG = {
    // Test ad unit IDs for development
    TEST_UNITS: {
        REWARDED_VIDEO: 'ca-app-pub-3940256099942544/5224354917', // Test rewarded video
        DISPLAY: 'ca-app-pub-3940256099942544/6300978111', // Test display ad
    },
    
    // Production ad unit IDs (replace with your actual IDs)
    PRODUCTION_UNITS: {
        REWARDED_VIDEO: process.env.NEXT_PUBLIC_ADMOB_REWARDED_VIDEO_ID || '',
        DISPLAY: process.env.NEXT_PUBLIC_ADMOB_DISPLAY_ID || '',
    },
    
    // Get the appropriate ad unit ID based on environment
    getRewardedVideoId: () => {
        return process.env.NODE_ENV === 'development' 
            ? AD_CONFIG.TEST_UNITS.REWARDED_VIDEO
            : AD_CONFIG.PRODUCTION_UNITS.REWARDED_VIDEO;
    },
    
    getDisplayId: () => {
        return process.env.NODE_ENV === 'development'
            ? AD_CONFIG.TEST_UNITS.DISPLAY
            : AD_CONFIG.PRODUCTION_UNITS.DISPLAY;
    },
    
    // Ad settings
    AD_SETTINGS: {
        REWARDED_VIDEO_DURATION: 30, // seconds
        MIN_WATCH_TIME: 25, // minimum seconds user must watch to get reward
        AD_TIMEOUT: 10000, // 10 seconds timeout for ad loading
    }
};

// Google AdSense configuration
export const ADSENSE_CONFIG = {
    CLIENT_ID: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-3940256099942544', // Test client ID
    ENABLED: process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' || process.env.NODE_ENV === 'development',
};