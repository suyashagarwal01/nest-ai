/**
 * Server-side Tier 1 tagger — adapted from extension/src/lib/tagger.ts.
 * No Chrome API dependencies. Used by API routes for auto-tagging.
 */

import {
  getDomainInfo,
  inferCategoryFromPath,
  buildDomainContext,
  extractKeywords,
} from "./domain-map";

export interface ServerTagResult {
  category: string;
  domainContext: string;
  topics: string[];
  confidence: number;
}

/**
 * Generate tags from a URL and optional title.
 * Simplified server-side version — uses domain map + keyword extraction only
 * (no Chrome built-in AI, no domain intelligence cache).
 */
export function generateTagsServer(url: string, title?: string): ServerTagResult {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { category: "Other", domainContext: "", topics: [], confidence: 0.5 };
  }

  const domainInfo = getDomainInfo(hostname);
  let category = domainInfo?.category ?? "Other";
  const label = domainInfo?.label ?? "";

  // Path override
  category = inferCategoryFromPath(url, category);

  // Domain context
  const domainContext = label ? buildDomainContext(label, category) : "";

  // Topic extraction
  const seen = new Set<string>();
  if (label) {
    for (const w of label.toLowerCase().split(/\s+/)) {
      if (w.length > 1) seen.add(w);
    }
  }
  seen.add(category.toLowerCase());

  const topics: string[] = [];
  function addTopics(items: string[]) {
    for (const raw of items) {
      const t = raw.toLowerCase().trim();
      if (t && t.length > 1 && !seen.has(t) && topics.length < 5) {
        seen.add(t);
        topics.push(t);
      }
    }
  }

  // Domain-level defaults
  if (domainInfo?.defaultTopics) {
    addTopics(domainInfo.defaultTopics);
  }

  // Title keywords
  if (title) {
    addTopics(extractKeywords(title));
  }

  const confidence = domainInfo ? 0.85 : 0.6;
  return { category, domainContext, topics, confidence };
}
