// shared/OpenAiModel.ts or similar
import OpenAI from "openai";

export const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY!,
  baseURL: "https://api.x.ai/v1",
});

// Available Grok models
export const GROK_MODELS = {
  BETA: "grok-beta", // Latest with 128k context
  LATEST: "grok-2-latest", // Stable production model
  VISION: "grok-vision-beta", // Multi-modal (image + text)
} as const;
