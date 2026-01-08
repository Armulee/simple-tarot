import { z } from "zod";

export const astrologySummarySchema = z.object({
    transits: z.array(z.object({
        planet: z.string().describe("The planet name, e.g., 'Sun', 'Mars'."),
        house: z.string().describe("The house number as a string, e.g., '1', '7'."),
    })).describe("The top 3 most significant transit-to-natal house influences."),
    vibeIcon: z.string().describe("The Lucide icon name that best represents the overall vibe (e.g., 'Heart', 'Zap', 'Sparkles')."),
    interpretation: z.string().describe("The main horoscope reading for the transit day. Focus on feelings and impact, avoid jargon."),
});

export type AstrologySummary = z.infer<typeof astrologySummarySchema>;

