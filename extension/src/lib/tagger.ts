import { getCategoryForDomain, extractKeywords } from "./domain-map";
import type { PageMeta, TagResult } from "./types";

/**
 * Tier 1 tagger: rule-based, runs client-side, instant.
 * Uses domain map + keyword extraction from title/description.
 */
export function generateTags(meta: PageMeta): TagResult {
  let domain = "";
  try {
    domain = new URL(meta.url).hostname;
  } catch {
    // invalid URL, proceed without domain
  }

  // Category from domain map
  const category = getCategoryForDomain(domain) ?? "Other";

  // Keywords from title and description
  const titleKeywords = extractKeywords(meta.title);
  const descKeywords = extractKeywords(meta.description);

  // Merge and deduplicate, prefer title keywords
  const combined = [...new Set([...titleKeywords, ...descKeywords])];
  const tags = combined.slice(0, 5);

  // If we got a category, include it as a tag too (if not already there)
  if (category !== "Other" && !tags.includes(category.toLowerCase())) {
    tags.unshift(category.toLowerCase());
    if (tags.length > 5) tags.pop();
  }

  return { category, tags };
}
