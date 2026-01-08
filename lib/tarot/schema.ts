import { z } from "zod";

export const tarotInterpretationSchema = z.object({
    keywords: z.string().describe("Three comma-separated keywords reflecting the overall vibe of the reading."),
    cardInsights: z.array(z.string()).describe("A short, punchy 1-sentence insight for each card. Jump straight to the meaning. Do NOT mention 'this card', 'the card', the card name, or the position label."),
    interpretation: z.string().describe("The main 3-6 sentence reading based on the question and spread, in a warm and conversational tone."),
});

export type TarotInterpretation = z.infer<typeof tarotInterpretationSchema>;

