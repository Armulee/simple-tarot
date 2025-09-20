# Simplified Rewarded Ads Implementation Guide

## Overview

This implementation adds rewarded ads to the tarot reading flow using a clean dialog-based approach integrated directly into the interpretation component.

## Features

- **Dialog-Based Interface**: Clean shadcn/ui dialog explaining the ad viewing process
- **Remember Preference**: Checkbox to auto-play ads without showing the dialog again
- **Concurrent Fetching**: Interpretation API call starts while user watches the ad
- **Integrated Experience**: Ad dialog appears when step changes to interpretation
- **Progress Tracking**: Visual progress bar and timing indicators
- **Error Handling**: Graceful fallback if ads fail to load
- **Internationalization**: Full support for English and Thai languages

## Simplified Flow

1. User asks a question
2. User selects reading type (simple/intermediate/advanced)
3. User selects their cards
4. **Step changes to interpretation** - Ad dialog appears automatically
5. **Concurrent Process** - Ad starts playing while interpretation API call begins
6. User watches ad with real-time progress tracking
7. **Seamless**: User receives interpretation immediately after ad completion

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Enable/disable ads (set to 'false' to disable)
NEXT_PUBLIC_ADS_ENABLED=true

# AdMob Test IDs (for development)
NEXT_PUBLIC_ADMOB_REWARDED_VIDEO_ID=ca-app-pub-3940256099942544/5224354917
NEXT_PUBLIC_ADMOB_DISPLAY_ID=ca-app-pub-3940256099942544/6300978111
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-3940256099942544
```

### Production Setup

For production, replace the test IDs with your actual AdMob/AdSense IDs:

```bash
# Your actual AdMob/AdSense IDs
NEXT_PUBLIC_ADMOB_REWARDED_VIDEO_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
NEXT_PUBLIC_ADMOB_DISPLAY_ID=ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
```

## Ad Settings

The ad configuration can be modified in `/lib/admob-config.ts`:

```typescript
AD_SETTINGS: {
    REWARDED_VIDEO_DURATION: 30, // Total ad duration in seconds
    MIN_WATCH_TIME: 25, // Minimum seconds user must watch to get reward
    AD_TIMEOUT: 10000, // Ad loading timeout in milliseconds
}
```

## Components

### CustomAdDialog Component (`/components/ads/custom-ad-dialog.tsx`)

Beautiful cosmic dialog that:
- Shows cosmic stars background with twinkling animations
- Displays ad benefits and rewards
- Includes "Remember preference" checkbox for auto-play
- Provides "Watch Ad" and "Back to Card Selection" options
- Uses React portal for proper positioning

### OptimizedRewardedAd Component (`/components/ads/optimized-rewarded-ad.tsx`)

Enhanced ad component that:
- Shows real-time interpretation fetching status
- Displays progress tracking with timing
- Handles concurrent interpretation loading
- Provides immediate completion when ready

### Interpretation Component (`/components/reading/interpretation.tsx`)

Main component that orchestrates:
- Ad dialog management and display
- Concurrent interpretation fetching
- User preference handling and auto-play
- Seamless integration of ad and interpretation flow

## Integration Points

### Tarot Context (`/contexts/tarot-context.tsx`)

Simplified to remove the separate ad-viewing step (ads are now handled within interpretation):
```typescript
currentStep: "reading-type" | "card-selection" | "interpretation"
```

### Card Selection (`/components/reading/card-selection/index.tsx`)

Modified to navigate directly to interpretation (ads are handled within interpretation):
```typescript
setCurrentStep("interpretation") // Ad dialog appears automatically
```

## User Experience Features

### Remember Preference

Users can check "Don't show this message again" to automatically start ads without the dialog:
- Preference is saved in localStorage as `auto-play-ads`
- Next time user goes through the flow, ads start automatically
- Can be reset by clearing browser data or changing preference

### Concurrent Processing

The system optimizes user experience by:
- Starting interpretation API call when ad begins
- Showing real-time status of interpretation preparation
- Displaying "Interpretation ready!" when API call completes
- Enabling immediate transition to results when ad finishes

### Visual Feedback

Enhanced user feedback includes:
- Progress bar with percentage completion
- Time remaining counter
- Interpretation status indicators
- Loading states and completion confirmations

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `/reading`
3. Complete the reading flow:
   - Ask a question
   - Select reading type
   - Select cards
   - Watch the ad (or skip for testing)
   - Receive interpretation

## Production Deployment

1. Set up your AdMob/AdSense account
2. Create ad units for your app
3. Replace test IDs with production IDs in environment variables
4. Deploy with ads enabled

## Disabling Ads

To disable ads for testing or if you don't want to use them:

1. Set `NEXT_PUBLIC_ADS_ENABLED=false` in your environment variables
2. Or modify the card selection to skip the ad step:

```typescript
// In card-selection/index.tsx, change:
setCurrentStep("ad-viewing")
// To:
setCurrentStep("interpretation")
```

## Notes

- This implementation uses a simulated rewarded ad experience since Google doesn't provide native rewarded ads for web browsers
- The ad experience is designed to be engaging and clear about the reward
- Users can skip ads if needed, but the system encourages watching for the full experience
- The implementation is fully responsive and works on both desktop and mobile devices