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
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface BookmarkWithTags extends Bookmark {
  bookmark_tags: { tag_id: string; source?: string; confidence?: number; tags: Tag }[];
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string | null;
  is_public: boolean;
  cover_url: string | null;
  bookmark_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionMember {
  collection_id: string;
  user_id: string;
  role: "viewer" | "editor";
  invited_at: string;
}

export interface CollectionWithBookmarks extends Collection {
  collection_bookmarks: { bookmark_id: string; added_at: string; bookmarks: Bookmark }[];
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface RelatedBookmark {
  id: string;
  url: string;
  title: string | null;
  domain: string | null;
  favicon_url: string | null;
  shared_tag_count: number;
  score: number;
}

export interface TagVocabulary {
  [original: string]: string; // e.g. { "ml": "machine-learning" }
}

export interface InterestVector {
  [tag: string]: number; // e.g. { "react": 15, "typescript": 12 }
}
