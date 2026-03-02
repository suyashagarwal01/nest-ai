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
  tags?: Tag[];
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface BookmarkWithTags extends Bookmark {
  bookmark_tags: { tag_id: string; tags: Tag }[];
}
