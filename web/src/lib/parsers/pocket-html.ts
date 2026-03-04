import type { ParseResult, ParsedBookmark } from "./index";

export function parsePocketHtml(html: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const bookmarks: ParsedBookmark[] = [];
  const errors: string[] = [];

  const links = doc.querySelectorAll("a");
  if (links.length === 0) {
    errors.push("No links found in the Pocket export file.");
    return { bookmarks, errors };
  }

  links.forEach((a) => {
    const url = a.getAttribute("href");
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return;

    const title = a.textContent?.trim() ?? url;
    const tagsAttr = a.getAttribute("tags");
    const timeAdded = a.getAttribute("time_added");

    const tags = tagsAttr
      ? tagsAttr.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    let created_at: string | null = null;
    if (timeAdded) {
      const ts = parseInt(timeAdded, 10);
      if (!isNaN(ts)) {
        created_at = new Date(ts * 1000).toISOString();
      }
    }

    bookmarks.push({ url, title, tags, category: "", note: "", created_at });
  });

  return { bookmarks, errors };
}
