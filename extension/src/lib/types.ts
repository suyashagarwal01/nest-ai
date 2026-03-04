export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  description: string | null;
  note: string | null;
  screenshot_url: string | null;
  thumbnail_url: string | null;
  favicon_url: string | null;
  domain: string | null;
  domain_context: string | null;
  category: string | null;
  has_screenshot: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface BookmarkTag {
  bookmark_id: string;
  tag_id: string;
  source: "user" | "ai_tier1" | "ai_tier2" | "ai_tier3" | "collective";
  confidence: number;
}

/** Data extracted from the active tab by the content script */
export interface PageMeta {
  url: string;
  title: string;
  description: string;
  favicon: string;
  ogImage: string;
  metaKeywords: string[];
  articleTags: string[];
  jsonLdType: string | null;
  headings: string[];
}

/** Structured domain info from domain map */
export interface DomainInfo {
  category: string;
  type: string;
  label: string;
  defaultTopics?: string[];
}

/** Payload sent from popup → background to save a bookmark */
export interface SavePayload {
  url: string;
  title: string;
  userTags: string[];
  captureScreenshot: boolean;
  meta: PageMeta;
}

/** Result of AI tagging (3-layer taxonomy) */
export interface TagResult {
  category: string;
  domainContext: string;
  topics: string[];
  confidence: number;
}

/** Learned domain intelligence data from aggregate saves */
export interface DomainIntelligenceData {
  domain: string;
  domain_type: string | null;
  default_category: string | null;
  common_topics: string[];
  path_patterns: {
    segments: Record<string, { topics: string[]; confidence: number; count: number }>;
  } | null;
  save_count: number;
  created_at: string;
  updated_at: string;
}

/** Messages between extension components */
export type ExtensionMessage =
  | { type: "GET_PAGE_META" }
  | { type: "PAGE_META"; data: PageMeta }
  | { type: "SAVE_BOOKMARK"; data: SavePayload }
  | { type: "SAVE_RESULT"; success: boolean; error?: string };
