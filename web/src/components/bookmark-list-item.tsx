"use client";

import { Trash2, Copy, ExternalLink } from "lucide-react";
import type { Bookmark, Tag } from "@/lib/types";
import { showToast } from "@/components/toast";

interface BookmarkListItemProps {
  bookmark: Bookmark & { bookmark_tags?: { tags: Tag }[] };
  onDelete: (id: string) => void;
  onUpdate: (bookmark: Bookmark) => void;
}

function formatCompactTime(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay <= 29) return `${diffDay}d`;

  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export function BookmarkListItem({
  bookmark,
  onDelete,
}: BookmarkListItemProps) {
  const time = formatCompactTime(bookmark.created_at);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(bookmark.id);
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(bookmark.url);
    showToast("Link copied to clipboard");
  }

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(bookmark.url, "_blank");
  }

  return (
    <div
      className="bk-list-item"
      onClick={() => window.open(bookmark.url, "_blank")}
    >
      <div className="flex-1 min-w-0">
        <span className="bk-list-title">
          {bookmark.title || bookmark.url}
        </span>
        <div className="bk-list-meta">
          <span>{bookmark.domain}</span>
          <span>&middot;</span>
          <span>{time}</span>
        </div>
      </div>

      <div className="bk-list-actions">
        <button
          onClick={handleCopy}
          className="bk-list-action-btn"
          title="Copy link"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={handleOpen}
          className="bk-list-action-btn"
          title="Open in new tab"
        >
          <ExternalLink size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="bk-list-action-btn bk-list-action-btn--danger"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
