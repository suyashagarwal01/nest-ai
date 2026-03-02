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
}

/** Data extracted from the active tab by the content script */
export interface PageMeta {
  url: string;
  title: string;
  description: string;
  favicon: string;
  ogImage: string;
}

/** Payload sent from popup → background to save a bookmark */
export interface SavePayload {
  url: string;
  title: string;
  note: string;
  captureScreenshot: boolean;
  meta: PageMeta;
}

/** Result of AI tagging */
export interface TagResult {
  category: string;
  tags: string[];
}

/** Messages between extension components */
export type ExtensionMessage =
  | { type: "GET_PAGE_META" }
  | { type: "PAGE_META"; data: PageMeta }
  | { type: "SAVE_BOOKMARK"; data: SavePayload }
  | { type: "SAVE_RESULT"; success: boolean; error?: string };
