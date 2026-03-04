import type { Bookmark, Tag } from "./types";

export interface Suggestion {
  id: string;
  type: "recent_cluster" | "large_tag_group";
  tag: string;
  bookmarkCount: number;
  message: string;
}

type BookmarkRow = Bookmark & { bookmark_tags: { tags: Tag }[] };

const DISMISSED_KEY = "inspace_dismissed_suggestions";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed: { ids: string[]; resetAt: number } = JSON.parse(raw);
    if (Date.now() > parsed.resetAt) {
      localStorage.removeItem(DISMISSED_KEY);
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

export function dismissSuggestion(id: string): void {
  const dismissed = getDismissed();
  dismissed.add(id);
  localStorage.setItem(
    DISMISSED_KEY,
    JSON.stringify({
      ids: Array.from(dismissed),
      resetAt: Date.now() + DISMISS_TTL,
    })
  );
}

/**
 * Compute collection suggestions from loaded bookmarks.
 * Returns max 3 suggestions.
 */
export function computeSuggestions(
  bookmarks: BookmarkRow[],
  collections: { id: string; name: string }[]
): Suggestion[] {
  const dismissed = getDismissed();
  const collectionNames = new Set(collections.map((c) => c.name.toLowerCase()));
  const suggestions: Suggestion[] = [];

  // Build tag → bookmark mapping
  const tagBookmarks = new Map<string, BookmarkRow[]>();
  for (const b of bookmarks) {
    const tagNames =
      b.bookmark_tags?.map((bt) => bt.tags?.name).filter(Boolean) ?? [];
    for (const tag of tagNames) {
      const list = tagBookmarks.get(tag) || [];
      list.push(b);
      tagBookmarks.set(tag, list);
    }
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const [tag, tagBms] of tagBookmarks) {
    // Skip if a collection with this name already exists
    if (collectionNames.has(tag.toLowerCase())) continue;

    const id = `suggest_${tag}`;
    if (dismissed.has(id)) continue;

    // Rule 1: 3+ bookmarks in last 7 days share a tag → recent cluster
    const recentCount = tagBms.filter(
      (b) => new Date(b.created_at).getTime() > sevenDaysAgo
    ).length;

    if (recentCount >= 3) {
      suggestions.push({
        id,
        type: "recent_cluster",
        tag,
        bookmarkCount: recentCount,
        message: `You saved ${recentCount} "${tag}" bookmarks this week`,
      });
      continue;
    }

    // Rule 2: 15+ bookmarks with same tag → large group
    if (tagBms.length >= 15) {
      suggestions.push({
        id,
        type: "large_tag_group",
        tag,
        bookmarkCount: tagBms.length,
        message: `${tagBms.length} bookmarks tagged "${tag}"`,
      });
    }
  }

  // Sort: recent clusters first, then by count descending
  suggestions.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "recent_cluster" ? -1 : 1;
    }
    return b.bookmarkCount - a.bookmarkCount;
  });

  return suggestions.slice(0, 3);
}
