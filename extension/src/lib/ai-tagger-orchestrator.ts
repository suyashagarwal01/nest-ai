/**
 * AI Tagger Orchestrator — coordinates Tier 1, 2, and 3 tagging.
 *
 * Flow:
 * 1. Run Tier 1 (rule-based) synchronously → callback with immediate result
 * 2. If escalation needed, try Tier 2 (Chrome AI) → callback with upgraded result
 * 3. If Tier 2 unavailable/failed, try Tier 3 (Gemini Edge Function) → callback
 */

import { generateTags } from "./tagger";
import { isChromeAIAvailable, generateTagsWithChromeAI } from "./chrome-ai-tagger";
import { getSupabase } from "./supabase";
import type { PageMeta, TagResult } from "./types";

type AISource = "ai_tier1" | "ai_tier2" | "ai_tier3";

interface AITagUpdate {
  tagResult: TagResult;
  source: AISource;
}

/** Check whether Tier 1 result is confident enough or needs AI escalation. */
function shouldEscalate(tier1: TagResult): boolean {
  return (
    tier1.category === "Other" ||
    tier1.topics.length < 3 ||
    tier1.confidence < 0.7
  );
}

/** Merge AI result into a Tier 1 TagResult. AI category replaces "Other", AI topics prepended. */
function mergeAIResult(
  tier1: TagResult,
  aiResult: { category: string; topics: string[] }
): TagResult {
  // Category: use AI category if Tier 1 was "Other", otherwise keep Tier 1
  const category =
    tier1.category === "Other" ? aiResult.category : tier1.category;

  // Topics: AI topics first, then Tier 1 topics, deduplicated, capped at 5
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const t of [...aiResult.topics, ...tier1.topics]) {
    const lower = t.toLowerCase().trim();
    if (lower && !seen.has(lower) && merged.length < 5) {
      seen.add(lower);
      merged.push(lower);
    }
  }

  return {
    category,
    domainContext: tier1.domainContext,
    topics: merged,
    confidence: Math.max(tier1.confidence, 0.8),
  };
}

/** Call the Gemini tagger Edge Function (Tier 3). */
async function callGeminiTagger(
  meta: PageMeta,
  tier1: TagResult
): Promise<{ category: string; topics: string[] } | null> {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
    if (!supabaseUrl) return null;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/gemini-tagger`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""}`,
        },
        body: JSON.stringify({
          title: meta.title,
          url: meta.url,
          description: meta.description,
          currentCategory: tier1.category,
          currentTopics: tier1.topics,
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (
      typeof data.category === "string" &&
      Array.isArray(data.topics)
    ) {
      return {
        category: data.category,
        topics: data.topics,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Orchestrate AI tagging with callbacks.
 *
 * @param meta - Page metadata from content script
 * @param onTier1 - Called immediately with Tier 1 result
 * @param onUpgrade - Called if AI (Tier 2 or 3) produces better tags
 */
export async function generateTagsWithAI(
  meta: PageMeta,
  onTier1: (result: AITagUpdate) => void,
  onUpgrade: (result: AITagUpdate) => void
): Promise<void> {
  // Step 1: Tier 1 — synchronous, immediate
  const tier1 = generateTags(meta);
  onTier1({ tagResult: tier1, source: "ai_tier1" });

  // Step 2: Check if escalation is needed
  if (!shouldEscalate(tier1)) return;

  // Step 3: Try Tier 2 (Chrome AI)
  const chromeAIReady = await isChromeAIAvailable();
  if (chromeAIReady) {
    const aiResult = await generateTagsWithChromeAI(meta, tier1);
    if (aiResult) {
      const merged = mergeAIResult(tier1, aiResult);
      onUpgrade({ tagResult: merged, source: "ai_tier2" });
      return;
    }
  }

  // Step 4: Fall back to Tier 3 (Gemini Edge Function)
  const geminiResult = await callGeminiTagger(meta, tier1);
  if (geminiResult) {
    const merged = mergeAIResult(tier1, geminiResult);
    onUpgrade({ tagResult: merged, source: "ai_tier3" });
  }
}
