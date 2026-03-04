/**
 * Interest-aware boosting: reorder candidate topics by user's historical interests.
 * Caches interest vector from profiles table (1h TTL).
 */

import { getSupabase } from "./supabase";

const INTEREST_CACHE_KEY = "inspace_interest_vector";
const INTEREST_CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface InterestCache {
  vector: Record<string, number>; // tag → frequency count
  cachedAt: number;
}

let memoryCache: InterestCache | null = null;

/**
 * Initialize interest vector cache from chrome.storage.local.
 */
export async function initInterestVector(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(INTEREST_CACHE_KEY);
    const cache = stored[INTEREST_CACHE_KEY] as InterestCache | undefined;

    if (cache && Date.now() - cache.cachedAt < INTEREST_CACHE_TTL) {
      memoryCache = cache;
      return;
    }

    await refreshInterestVector();
  } catch (err) {
    console.warn("Interest vector init failed:", err);
  }
}

/**
 * Refresh interest vector from profiles table.
 */
async function refreshInterestVector(): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("profiles")
    .select("interest_vector")
    .eq("id", user.id)
    .single();

  const vector = (data?.interest_vector as Record<string, number>) ?? {};
  memoryCache = { vector, cachedAt: Date.now() };
  await chrome.storage.local.set({ [INTEREST_CACHE_KEY]: memoryCache });
}

/**
 * Set up hourly cache refresh via Chrome alarms.
 */
export function setupInterestRefresh(): void {
  chrome.alarms.create("interest-vector-refresh", { periodInMinutes: 60 });
}

/**
 * Handle alarm for interest vector refresh.
 */
export async function handleInterestAlarm(alarmName: string): Promise<void> {
  if (alarmName === "interest-vector-refresh") {
    await refreshInterestVector();
  }
}

/**
 * Boost topics by user's historical interests.
 * Does NOT add new topics — only reorders existing candidates.
 * Topics with higher interest scores float to the top.
 */
export function boostWithInterests(
  topics: string[],
  vector?: Record<string, number>
): string[] {
  const v = vector ?? memoryCache?.vector ?? {};
  if (Object.keys(v).length === 0 || topics.length <= 1) return topics;

  // Score each topic: base position score + interest boost
  const scored = topics.map((topic, index) => {
    const interestCount = v[topic] ?? 0;
    // Base score: higher for topics that appeared earlier (already prioritized by tagger)
    const baseScore = (topics.length - index) * 10;
    // Interest boost: logarithmic to prevent domination
    const interestBoost = interestCount > 0 ? Math.log2(interestCount + 1) * 5 : 0;
    return { topic, score: baseScore + interestBoost };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.topic);
}
