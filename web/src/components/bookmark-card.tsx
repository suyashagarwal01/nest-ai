"use client";

import { Trash2, Copy, ExternalLink } from "lucide-react";
import type { Bookmark, Tag } from "@/lib/types";
import { showToast } from "@/components/toast";

interface BookmarkCardProps {
  bookmark: Bookmark & { bookmark_tags?: { tags: Tag }[] };
  onDelete: (id: string) => void;
  onUpdate: (bookmark: Bookmark) => void;
  onClick?: () => void;
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

export function BookmarkCard({ bookmark, onDelete, onClick }: BookmarkCardProps) {
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

  function handleCardClick() {
    if (onClick) {
      onClick();
    } else {
      window.open(bookmark.url, "_blank");
    }
  }

  const hasImage = !!bookmark.screenshot_url;

  return (
    <div className="bk-card" onClick={handleCardClick}>
      <div className="bk-card-image">
        {hasImage ? (
          <img
            src={bookmark.thumbnail_url ?? bookmark.screenshot_url!}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="bk-card-link-only">
            {bookmark.domain || bookmark.title || bookmark.url}
          </div>
        )}

        <div className="bk-card-overlay" />

        <div className="bk-card-actions">
          <button
            className="bk-card-action-btn bk-card-action-btn--delete"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
          <button
            className="bk-card-action-btn bk-card-action-btn--copy"
            onClick={handleCopy}
            title="Copy link"
          >
            <Copy size={16} />
          </button>
          <button
            className="bk-card-action-btn bk-card-action-btn--open"
            onClick={handleOpen}
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>

      <div className="bk-card-meta">
        <span className="bk-card-title">{bookmark.title || bookmark.url}</span>
        <span className="bk-card-time">{time}</span>
      </div>
    </div>
  );
}
