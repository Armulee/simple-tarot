# Tarot Reading Slug Generation

This document explains how readable slugs are generated for tarot reading share links to increase credibility and user-friendliness.

## Overview

Instead of using random IDs like `abc123def`, the system now generates meaningful slugs directly from the question text like:

- `will-i-find-love-this-year-axt3`
- `what-should-i-do-about-my-career-uqbk`
- `how-can-i-improve-my-health-wn97`

## How It Works

### 1. Direct Question Slugification

The system takes the user's question and converts it directly into a URL-friendly slug:

- Removes special characters and punctuation
- Converts to lowercase
- Replaces spaces with hyphens
- Filters out common words like "the", "and", "for", etc.

### 2. Length Management

- Limits slug length to 60 characters for readability
- If question is too short (< 10 chars), extracts meaningful keywords
- If question is too long, intelligently truncates while preserving meaning

### 3. Uniqueness

- Adds a 4-character random suffix to ensure uniqueness
- Prevents collisions with existing slugs in the database

## Examples

| Question                            | Generated Slug                          | Full URL                                                          |
| ----------------------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| "Will I find love this year?"       | `will-i-find-love-this-year-axt3`       | `https://dooduang.ai/tarot/will-i-find-love-this-year-axt3`       |
| "What should I do about my career?" | `what-should-i-do-about-my-career-uqbk` | `https://dooduang.ai/tarot/what-should-i-do-about-my-career-uqbk` |
| "How can I improve my health?"      | `how-can-i-improve-my-health-wn97`      | `https://dooduang.ai/tarot/how-can-i-improve-my-health-wn97`      |
| "What does the future hold?"        | `what-does-the-future-hold-melr`        | `https://dooduang.ai/tarot/what-does-the-future-hold-melr`        |

## Fallback System

If the main generation fails or produces invalid slugs, the system uses fallback slugs:

- `mystical-reading-abc123`
- `divine-guidance-def456`
- `cosmic-wisdom-ghi789`

## Collision Handling

The system prevents duplicate slugs by:

1. Checking if the generated slug exists in the database
2. Adding a number suffix if it exists (`will-i-find-love-this-year-1`, `will-i-find-love-this-year-2`)
3. Using a completely random fallback if all attempts fail

## Benefits

1. **Immediate Understanding**: Users can instantly see what the reading is about from the URL
2. **Maximum Credibility**: Question-based URLs are the most trustworthy and professional
3. **SEO Optimized**: Search engines can easily understand and index the content
4. **Social Sharing**: Much more appealing to share on social media platforms
5. **User Trust**: People are more likely to click on URLs that clearly show the content
6. **Brand Consistency**: Maintains the mystical/spiritual theme while being practical

## Technical Implementation

- **File**: `/lib/slug-utils.ts`
- **API**: `/app/api/interpretations/share/route.ts`
- **Validation**: Ensures slugs are 3-100 characters, lowercase, alphanumeric with hyphens
- **Database**: Uses the slug as the primary key in `shared_tarot` table

## Future Enhancements

- Add more tarot card variations and synonyms
- Include astrological themes (zodiac signs, planets)
- Add seasonal/calendar themes
- Support for multiple languages
- Custom slug preferences for users
