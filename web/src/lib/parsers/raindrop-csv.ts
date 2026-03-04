import type { ParseResult, ParsedBookmark } from "./index";

export function parseRaindropCsv(csv: string): ParseResult {
  const bookmarks: ParsedBookmark[] = [];
  const errors: string[] = [];

  const lines = csv.split("\n");
  if (lines.length < 2) {
    errors.push("CSV file appears empty or has no data rows.");
    return { bookmarks, errors };
  }

  // Parse header to find column indices
  const header = parseCsvLine(lines[0]);
  const colMap: Record<string, number> = {};
  header.forEach((col, i) => {
    colMap[col.toLowerCase().trim()] = i;
  });

  const urlIdx = colMap["url"] ?? -1;
  if (urlIdx === -1) {
    errors.push('CSV file missing required "url" column.');
    return { bookmarks, errors };
  }

  const titleIdx = colMap["title"] ?? -1;
  const folderIdx = colMap["folder"] ?? -1;
  const noteIdx = colMap["note"] ?? colMap["description"] ?? colMap["excerpt"] ?? -1;
  const tagsIdx = colMap["tags"] ?? -1;
  const createdIdx = colMap["created"] ?? colMap["created_at"] ?? -1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(line);
    const url = cols[urlIdx]?.trim();
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) continue;

    const title = (titleIdx >= 0 ? cols[titleIdx]?.trim() : "") || url;
    const category = folderIdx >= 0 ? cols[folderIdx]?.trim() ?? "" : "";
    const note = noteIdx >= 0 ? cols[noteIdx]?.trim() ?? "" : "";
    const tagsRaw = tagsIdx >= 0 ? cols[tagsIdx]?.trim() ?? "" : "";
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    let created_at: string | null = null;
    if (createdIdx >= 0 && cols[createdIdx]) {
      const d = new Date(cols[createdIdx].trim());
      if (!isNaN(d.getTime())) {
        created_at = d.toISOString();
      }
    }

    bookmarks.push({ url, title, tags, category, note, created_at });
  }

  return { bookmarks, errors };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
