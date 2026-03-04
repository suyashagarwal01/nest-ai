import type { ParseResult, ParsedBookmark } from "./index";

export function parseBrowserBookmarks(html: string): ParseResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const bookmarks: ParsedBookmark[] = [];
  const errors: string[] = [];

  function walk(node: Element, folderPath: string[]) {
    for (const child of Array.from(node.children)) {
      if (child.tagName === "DT") {
        const h3 = child.querySelector(":scope > H3");
        if (h3) {
          // It's a folder
          const folderName = h3.textContent?.trim() ?? "";
          const dl = child.querySelector(":scope > DL");
          if (dl) {
            walk(dl, [...folderPath, folderName]);
          }
          continue;
        }

        const a = child.querySelector(":scope > A");
        if (a) {
          const url = a.getAttribute("HREF");
          if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) continue;

          const title = a.textContent?.trim() ?? url;
          const addDate = a.getAttribute("ADD_DATE");
          const tagsAttr = a.getAttribute("TAGS");

          const tags = tagsAttr
            ? tagsAttr.split(",").map((t) => t.trim()).filter(Boolean)
            : [];

          let created_at: string | null = null;
          if (addDate) {
            const ts = parseInt(addDate, 10);
            if (!isNaN(ts)) {
              created_at = new Date(ts * 1000).toISOString();
            }
          }

          // Use deepest folder as category
          const category = folderPath.length > 0
            ? folderPath[folderPath.length - 1]
            : "";

          bookmarks.push({ url, title, tags, category, note: "", created_at });
        }
      } else if (child.tagName === "DL") {
        walk(child, folderPath);
      }
    }
  }

  const rootDl = doc.querySelector("DL");
  if (rootDl) {
    walk(rootDl, []);
  } else {
    errors.push("No bookmark structure found in the HTML file.");
  }

  return { bookmarks, errors };
}
