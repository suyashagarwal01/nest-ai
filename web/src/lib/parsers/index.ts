export interface ParsedBookmark {
  url: string;
  title: string;
  tags: string[];
  category: string;
  note: string;
  created_at: string | null;
}

export interface ParseResult {
  bookmarks: ParsedBookmark[];
  errors: string[];
}
