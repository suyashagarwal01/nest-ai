/**
 * User preferences: tag vocabulary cache and learning.
 * Caches vocabulary from profiles table (1h TTL).
 */

import { getSupabase } from "./supabase";

const VOCAB_CACHE_KEY = "nest_tag_vocabulary";
const VOCAB_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface VocabCache {
  vocabulary: Record<string, string>;
  cachedAt: number;
}

let memoryCache: VocabCache | null = null;

/**
 * Initialize vocabulary cache from chrome.storage.local on startup.
 */
export async function initVocabCache(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(VOCAB_CACHE_KEY);
    const cache = stored[VOCAB_CACHE_KEY] as VocabCache | undefined;

    if (cache && Date.now() - cache.cachedAt < VOCAB_CACHE_TTL) {
      memoryCache = cache;
      return;
    }

    // Fetch fresh from Supabase
    await refreshVocabCache();
  } catch (err) {
    console.warn("Vocab cache init failed:", err);
  }
}

/**
 * Refresh vocabulary from profiles table.
 */
async function refreshVocabCache(): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("profiles")
    .select("tag_vocabulary")
    .eq("id", user.id)
    .single();

  const vocabulary = (data?.tag_vocabulary as Record<string, string>) ?? {};
  memoryCache = { vocabulary, cachedAt: Date.now() };
  await chrome.storage.local.set({ [VOCAB_CACHE_KEY]: memoryCache });
}

/**
 * Set up hourly cache refresh via Chrome alarms.
 */
export function setupVocabRefresh(): void {
  chrome.alarms.create("vocab-cache-refresh", { periodInMinutes: 60 });
}

/**
 * Handle alarm for vocab refresh (call from alarm listener).
 */
export async function handleVocabAlarm(alarmName: string): Promise<void> {
  if (alarmName === "vocab-cache-refresh") {
    await refreshVocabCache();
  }
}

/**
 * Apply user's vocabulary overrides to a list of topics.
 * Replaces any topic that matches a known alias with its canonical form.
 */
export function applyVocabulary(
  topics: string[],
  vocab?: Record<string, string>
): string[] {
  const v = vocab ?? memoryCache?.vocabulary ?? {};
  if (Object.keys(v).length === 0) return topics;

  const seen = new Set<string>();
  const result: string[] = [];

  for (const topic of topics) {
    const mapped = v[topic] ?? topic;
    if (!seen.has(mapped)) {
      seen.add(mapped);
      result.push(mapped);
    }
  }

  return result;
}

/**
 * Learn vocabulary from user edits.
 * When a user removes "ml" and adds "machine-learning",
 * we learn {"ml": "machine-learning"}.
 */
export async function learnVocabulary(
  removed: string[],
  added: string[]
): Promise<void> {
  if (removed.length === 0 || added.length === 0) return;

  // Simple heuristic: if exactly one tag was removed and one was added,
  // treat it as a rename. For multiple, pair by position.
  const pairs: [string, string][] = [];
  const len = Math.min(removed.length, added.length);
  for (let i = 0; i < len; i++) {
    if (removed[i] !== added[i]) {
      pairs.push([removed[i]!, added[i]!]);
    }
  }

  if (pairs.length === 0) return;

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Get current vocabulary
  const { data } = await supabase
    .from("profiles")
    .select("tag_vocabulary")
    .eq("id", user.id)
    .single();

  const vocabulary = (data?.tag_vocabulary as Record<string, string>) ?? {};

  // Add new mappings
  for (const [from, to] of pairs) {
    vocabulary[from] = to;
  }

  // Save back
  await supabase
    .from("profiles")
    .update({ tag_vocabulary: vocabulary })
    .eq("id", user.id);

  // Update local cache
  memoryCache = { vocabulary, cachedAt: Date.now() };
  await chrome.storage.local.set({ [VOCAB_CACHE_KEY]: memoryCache });
}
