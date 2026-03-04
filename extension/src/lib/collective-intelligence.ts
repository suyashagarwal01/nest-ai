/**
 * Collective Intelligence — cross-user tag consensus and keyword patterns.
 * Fetches consensus tags per URL, caches keyword patterns + aliases locally.
 */

import { getSupabase } from "./supabase";
import type { ConsensusTag, KeywordTagPattern, DisplayTag } from "./types";

// ─── Storage Keys ────────────────────────────────────────────

const KEYWORD_CACHE_KEY = "collective_keyword_cache";
const KEYWORD_CACHE_TS_KEY = "collective_keyword_cache_ts";
const ALIAS_CACHE_KEY = "collective_alias_cache";
const ALIAS_CACHE_TS_KEY = "collective_alias_cache_ts";
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const ALARM_NAME_COLLECTIVE = "refresh-collective-intelligence";

// ─── In-memory Caches ────────────────────────────────────────

let keywordCache: KeywordTagPattern[] = [];
let aliasCache = new Map<string, string>();

// ─── Consensus Tags (per-URL, not cached) ────────────────────

/**
 * Fetch consensus tags for a specific URL from Supabase.
 * Not cached — too many unique URLs to cache locally.
 */
export async function fetchConsensusTags(
  url: string
): Promise<ConsensusTag[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("url_tag_consensus")
      .select("tag_name, user_count, total_saves, frequency, confidence")
      .eq("url", url)
      .order("confidence", { ascending: false })
      .limit(10);

    if (error) {
      console.warn("Consensus tag fetch failed:", error.message);
      return [];
    }

    return (data as ConsensusTag[]) ?? [];
  } catch (err) {
    console.warn("Consensus tag fetch error:", err);
    return [];
  }
}

// ─── Keyword Pattern Matching (synchronous, from cache) ──────

/**
 * Match title words against cached keyword-tag patterns.
 * Returns DisplayTags for any matches found.
 */
export function matchKeywordPatterns(title: string): DisplayTag[] {
  if (!title || keywordCache.length === 0) return [];

  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);

  const wordSet = new Set(words);
  const matched = new Map<string, KeywordTagPattern>();

  for (const pattern of keywordCache) {
    if (wordSet.has(pattern.keyword) && !matched.has(pattern.tag_name)) {
      matched.set(pattern.tag_name, pattern);
    }
  }

  return Array.from(matched.values()).map((p) => ({
    name: p.tag_name,
    source: "collective_keyword" as const,
    confidence: p.confidence,
    isSuggested: p.confidence < 0.7,
  }));
}

// ─── Tag Alias Normalization ─────────────────────────────────

/**
 * Resolve a tag through the alias map. Returns canonical form if alias exists,
 * otherwise returns the tag as-is (lowercased, trimmed).
 */
export function normalizeTag(tag: string): string {
  const normalized = tag.toLowerCase().trim();
  return aliasCache.get(normalized) ?? normalized;
}

// ─── Cache Initialization & Sync ─────────────────────────────

/**
 * Initialize both keyword and alias caches from chrome.storage.local.
 * Syncs from Supabase if stale (>1h).
 */
export async function initCollectiveCache(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([
      KEYWORD_CACHE_KEY,
      KEYWORD_CACHE_TS_KEY,
      ALIAS_CACHE_KEY,
      ALIAS_CACHE_TS_KEY,
    ]);

    // Restore keyword cache
    if (stored[KEYWORD_CACHE_KEY]) {
      keywordCache = stored[KEYWORD_CACHE_KEY] as KeywordTagPattern[];
    }

    // Restore alias cache
    if (stored[ALIAS_CACHE_KEY]) {
      const entries = stored[ALIAS_CACHE_KEY] as Array<[string, string]>;
      aliasCache = new Map(entries);
    }

    // Sync keyword cache if stale
    const kwTs = stored[KEYWORD_CACHE_TS_KEY] as number | undefined;
    if (!kwTs || Date.now() - kwTs > CACHE_MAX_AGE_MS) {
      await syncKeywordCache();
    }

    // Sync alias cache if stale
    const aliasTs = stored[ALIAS_CACHE_TS_KEY] as number | undefined;
    if (!aliasTs || Date.now() - aliasTs > CACHE_MAX_AGE_MS) {
      await syncAliasCache();
    }

    console.log(
      `Collective intelligence cache initialized: ${keywordCache.length} keyword patterns, ${aliasCache.size} aliases`
    );
  } catch (err) {
    console.warn("Collective intelligence cache init failed:", err);
  }
}

/**
 * Fetch keyword-tag patterns from Supabase and persist to storage.
 */
export async function syncKeywordCache(): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("keyword_tag_patterns")
      .select("keyword, tag_name, confidence")
      .order("confidence", { ascending: false })
      .limit(500);

    if (error) {
      console.warn("Keyword pattern sync failed:", error.message);
      return;
    }

    if (data) {
      keywordCache = data as KeywordTagPattern[];
      await chrome.storage.local.set({
        [KEYWORD_CACHE_KEY]: keywordCache,
        [KEYWORD_CACHE_TS_KEY]: Date.now(),
      });
      console.log(`Keyword pattern cache synced: ${keywordCache.length} patterns`);
    }
  } catch (err) {
    console.warn("Keyword pattern sync error:", err);
  }
}

/**
 * Fetch tag aliases from Supabase and persist to storage.
 */
export async function syncAliasCache(): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("tag_aliases")
      .select("alias, canonical");

    if (error) {
      console.warn("Alias sync failed:", error.message);
      return;
    }

    if (data) {
      aliasCache = new Map(data.map((d: { alias: string; canonical: string }) => [d.alias, d.canonical]));
      await chrome.storage.local.set({
        [ALIAS_CACHE_KEY]: Array.from(aliasCache.entries()),
        [ALIAS_CACHE_TS_KEY]: Date.now(),
      });
      console.log(`Alias cache synced: ${aliasCache.size} aliases`);
    }
  } catch (err) {
    console.warn("Alias sync error:", err);
  }
}

// ─── Feedback Recording ──────────────────────────────────────

/**
 * Record a user's feedback on a tag. Fire-and-forget — doesn't block save.
 */
export async function recordFeedback(
  userId: string,
  url: string,
  tagName: string,
  action: "remove" | "add" | "accept",
  source: string
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("tag_feedback").insert({
      user_id: userId,
      url,
      tag_name: tagName,
      action,
      source,
    });
  } catch (err) {
    // Fire-and-forget — log but don't throw
    console.warn("Feedback recording failed:", err);
  }
}

// ─── Cache Refresh Alarm ─────────────────────────────────────

/**
 * Set up an hourly alarm to refresh keyword + alias caches.
 * Call once at service worker startup.
 */
export function setupCollectiveRefresh(): void {
  chrome.alarms.create(ALARM_NAME_COLLECTIVE, { periodInMinutes: 60 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME_COLLECTIVE) {
      syncKeywordCache();
      syncAliasCache();
    }
  });
}
