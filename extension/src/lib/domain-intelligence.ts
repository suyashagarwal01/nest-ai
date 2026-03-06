/**
 * Domain Intelligence Cache — loads learned domain/path patterns
 * from Supabase and caches them in chrome.storage.local.
 */

import { getSupabase } from "./supabase";
import type { DomainIntelligenceData } from "./types";

const STORAGE_KEY = "domain_intelligence_cache";
const STORAGE_TS_KEY = "domain_intelligence_cache_ts";
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHED_DOMAINS = 500;
const ALARM_NAME = "refresh-domain-intelligence";

/** In-memory cache for synchronous lookups */
let cache = new Map<string, DomainIntelligenceData>();

/**
 * Initialize the cache: load from chrome.storage.local,
 * then sync from Supabase if data is stale (>1h old).
 */
export async function initCache(): Promise<void> {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEY, STORAGE_TS_KEY]);
    if (stored[STORAGE_KEY]) {
      const entries: DomainIntelligenceData[] = stored[STORAGE_KEY];
      cache = new Map(entries.map((e) => [e.domain, e]));
    }

    const lastSync = stored[STORAGE_TS_KEY] as number | undefined;
    const isStale = !lastSync || Date.now() - lastSync > CACHE_MAX_AGE_MS;

    if (isStale) {
      await syncCache();
    }

    console.log(`Domain intelligence cache initialized: ${cache.size} domains`);
  } catch (err) {
    console.warn("Domain intelligence cache init failed:", err);
  }
}

/**
 * Fetch top domains from domain_intelligence table and persist to storage.
 */
export async function syncCache(): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("domain_intelligence")
      .select("*")
      .order("save_count", { ascending: false })
      .limit(MAX_CACHED_DOMAINS);

    if (error) {
      console.warn("Domain intelligence sync failed:", error.message);
      return;
    }

    if (data && data.length > 0) {
      cache = new Map(data.map((d: DomainIntelligenceData) => [d.domain, d]));
      await chrome.storage.local.set({
        [STORAGE_KEY]: data,
        [STORAGE_TS_KEY]: Date.now(),
      });
      console.log(`Domain intelligence cache synced: ${data.length} domains`);
    }
  } catch (err) {
    console.warn("Domain intelligence sync error:", err);
  }
}

/**
 * Synchronous lookup with subdomain fallback.
 * e.g. "blog.medium.com" → tries exact, then "medium.com"
 */
export function getCachedIntelligence(
  domain: string
): DomainIntelligenceData | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  const exact = cache.get(normalized);
  if (exact) return exact;

  // Strip one subdomain level
  const parts = normalized.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(1).join(".");
    return cache.get(parent) ?? null;
  }

  return null;
}

/**
 * Match the first path segment of a URL against learned path patterns.
 * Returns topics + confidence if a match is found.
 */
export function matchPathPattern(
  url: string,
  intelligence: DomainIntelligenceData
): { topics: string[]; confidence: number } | null {
  if (!intelligence.path_patterns?.segments) return null;

  let firstSegment: string;
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter((p) => p.length > 1);
    if (parts.length === 0) return null;
    firstSegment = parts[0]!.toLowerCase();
  } catch {
    return null;
  }

  const match = intelligence.path_patterns.segments[firstSegment];
  if (match && match.topics.length > 0) {
    return { topics: match.topics, confidence: match.confidence };
  }

  return null;
}

/**
 * Set up an hourly alarm to refresh the cache.
 * Call once at service worker startup.
 */
export function setupCacheRefresh(): void {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 60 });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      syncCache();
    }
  });
}
