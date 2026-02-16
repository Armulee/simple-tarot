import type { LanguageModel } from "ai"
import { google } from "@ai-sdk/google"

export const MODEL = google("gemini-2.0-flash") as unknown as LanguageModel
