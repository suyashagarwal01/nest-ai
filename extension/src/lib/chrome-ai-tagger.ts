/**
 * Tier 2: Chrome built-in AI (Prompt API) tagger.
 * Uses `self.ai.languageModel` when available in Chrome Canary / Dev.
 */

import type { PageMeta, TagResult } from "./types";

// Chrome AI types (not yet in stable TS definitions)
interface AILanguageModelCapabilities {
  available: "no" | "readily" | "after-download";
}

interface AILanguageModel {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

interface AILanguageModelFactory {
  capabilities(): Promise<AILanguageModelCapabilities>;
  create(opts?: { systemPrompt?: string }): Promise<AILanguageModel>;
}

declare global {
  interface WindowOrWorkerGlobalScope {
    ai?: {
      languageModel?: AILanguageModelFactory;
    };
  }
}

/** Check if Chrome's built-in Prompt API is available and ready. */
export async function isChromeAIAvailable(): Promise<boolean> {
  try {
    const factory = self.ai?.languageModel;
    if (!factory) return false;
    const caps = await factory.capabilities();
    return caps.available === "readily";
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `You are a bookmark categorization assistant. Given a webpage's metadata, output ONLY valid JSON with:
- "category": one of: Development, Design, News, Articles, Education, Research, Social, Video, Audio, Shopping, Finance, Productivity, Reference, Lifestyle, Entertainment, Gaming, Health, Travel, Government, Other
- "topics": array of 3-5 short lowercase topic tags (1-3 words each)

No explanation, no markdown fences — just the JSON object.`;

/** Generate tags using Chrome's built-in AI. Returns null on any failure. */
export async function generateTagsWithChromeAI(
  meta: PageMeta,
  tier1Result: TagResult
): Promise<{ category: string; topics: string[] } | null> {
  try {
    const factory = self.ai?.languageModel;
    if (!factory) return null;

    const session = await factory.create({ systemPrompt: SYSTEM_PROMPT });

    const prompt = [
      `URL: ${meta.url}`,
      `Title: ${meta.title}`,
      meta.description ? `Description: ${meta.description}` : "",
      tier1Result.category !== "Other"
        ? `Current category (may be wrong): ${tier1Result.category}`
        : "",
      tier1Result.topics.length > 0
        ? `Current topics: ${tier1Result.topics.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = await session.prompt(prompt);
    session.destroy();

    // Parse JSON from response (tolerate markdown fences)
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    if (
      typeof parsed.category === "string" &&
      Array.isArray(parsed.topics) &&
      parsed.topics.every((t: unknown) => typeof t === "string")
    ) {
      return {
        category: parsed.category,
        topics: parsed.topics.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
      };
    }

    return null;
  } catch {
    return null;
  }
}
