import {
  getDomainInfo,
  inferCategoryFromPath,
  buildDomainContext,
  extractKeywords,
} from "./domain-map";
import {
  getCachedIntelligence,
  matchPathPattern,
} from "./domain-intelligence";
import type { PageMeta, TagResult } from "./types";

/** JSON-LD @type → category overrides */
const JSON_LD_CATEGORY_MAP: Record<string, string> = {
  BlogPosting: "Articles",
  NewsArticle: "News",
  ScholarlyArticle: "Research",
  TechArticle: "Documentation",
  HowTo: "Education",
  Course: "Education",
  Recipe: "Lifestyle",
  Product: "Shopping",
  SoftwareApplication: "Development",
  VideoObject: "Video",
  MusicRecording: "Audio",
};

/**
 * Tier 1 tagger: 3-layer taxonomy (Category + Domain Context + Topics).
 * Now enhanced with domain intelligence (learned patterns from aggregate saves).
 */
export function generateTags(meta: PageMeta): TagResult {
  let hostname = "";
  try {
    hostname = new URL(meta.url).hostname;
  } catch {
    // invalid URL, proceed without domain
  }

  // 1. Domain intelligence lookup (learned data)
  const intelligence = getCachedIntelligence(hostname);

  // 2. Path pattern match (highest priority signal for topics)
  const pathMatch = intelligence
    ? matchPathPattern(meta.url, intelligence)
    : null;

  // 3. Hardcoded domain map fallback
  const domainInfo = getDomainInfo(hostname);

  // 4. Category selection (priority: intelligence w/ enough data > hardcoded > "Other")
  let category: string;
  if (intelligence?.default_category && intelligence.save_count >= 10) {
    category = intelligence.default_category;
  } else {
    category = domainInfo?.category ?? "Other";
  }
  const label = domainInfo?.label ?? "";

  // 5. Path override (e.g. github.com/blog/ → "Articles")
  category = inferCategoryFromPath(meta.url, category);

  // 6. JSON-LD override
  if (meta.jsonLdType) {
    const ldCategory = JSON_LD_CATEGORY_MAP[meta.jsonLdType];
    if (ldCategory) {
      category = ldCategory;
    }
  }

  // 7. Domain context
  const domainContext = label ? buildDomainContext(label, category) : "";

  // 8. Topic extraction (priority order, deduplicated)
  // Pre-seed seen set with domain label words so they don't appear as topics
  const seen = new Set<string>();
  if (label) {
    for (const w of label.toLowerCase().split(/\s+/)) {
      if (w.length > 1) seen.add(w);
    }
  }
  // Also exclude the category itself
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

  // NEW — Highest signal: path pattern topics (learned from collective saves)
  if (pathMatch) {
    addTopics(pathMatch.topics);
  }

  // Publisher-declared article tags
  addTopics(meta.articleTags ?? []);

  // Meta keywords
  addTopics(meta.metaKeywords ?? []);

  // NEW — Intelligence common topics (learned aggregate)
  if (intelligence?.common_topics) {
    addTopics(intelligence.common_topics);
  }

  // Domain-level defaults (hardcoded)
  if (domainInfo?.defaultTopics) {
    addTopics(domainInfo.defaultTopics);
  }

  // Title keywords
  addTopics(extractKeywords(meta.title));

  // Heading keywords (use higher minLength — headings have more filler)
  if (meta.headings?.length) {
    addTopics(extractKeywords(meta.headings.join(" "), 5, 4));
  }

  // 9. Confidence (path match > intelligence-based > hardcoded > fallback)
  let confidence: number;
  if (pathMatch) {
    confidence = pathMatch.confidence;
  } else if (intelligence && intelligence.save_count >= 10) {
    // Scale 0.7–0.85 based on save count (10 → 0.7, 100+ → 0.85)
    confidence = Math.min(0.85, 0.7 + (intelligence.save_count / 1000) * 0.15);
  } else if (domainInfo) {
    confidence = 0.9;
  } else {
    confidence = 0.6;
  }

  return { category, domainContext, topics, confidence };
}
