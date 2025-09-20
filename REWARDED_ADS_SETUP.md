# Rewarded Ads Implementation Guide

## Overview

This implementation adds rewarded ads to the tarot reading flow. Users must watch a complete ad after selecting their cards and before receiving their interpretation.

## Features

- **Custom Rewarded Ad Component**: Simulates a rewarded ad experience with progress tracking
- **Ad Viewing Step**: New step between card selection and interpretation
- **Progress Tracking**: Users must watch for a minimum duration to unlock their reading
- **Error Handling**: Graceful fallback if ads fail to load
- **Internationalization**: Full support for English and Thai languages

## Flow

1. User asks a question
2. User selects reading type (simple/intermediate/advanced)
3. User selects their cards
4. **NEW: Ad viewing step** - User must watch a rewarded ad
5. User receives their interpretation

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

### RewardedAd Component (`/components/ads/rewarded-ad.tsx`)

Main ad component that handles:
- Ad loading simulation
- Progress tracking
- User interaction (play, skip)
- Completion validation

### AdViewing Component (`/components/reading/ad-viewing.tsx`)

Wrapper component that:
- Shows selected cards preview
- Displays the rewarded ad
- Handles ad completion and navigation

## Integration Points

### Tarot Context (`/contexts/tarot-context.tsx`)

Added new step `"ad-viewing"` to the reading flow:
```typescript
currentStep: "reading-type" | "card-selection" | "ad-viewing" | "interpretation"
```

### Card Selection (`/components/reading/card-selection/index.tsx`)

Modified to navigate to ad-viewing instead of directly to interpretation:
```typescript
setCurrentStep("ad-viewing") // Instead of "interpretation"
```

## Customization

### Ad Duration

To change the ad duration, modify the `REWARDED_VIDEO_DURATION` in `admob-config.ts`.

### Minimum Watch Time

To change how long users must watch to get the reward, modify `MIN_WATCH_TIME`.

### Styling

The ad components use Tailwind CSS and can be customized by modifying the className props.

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