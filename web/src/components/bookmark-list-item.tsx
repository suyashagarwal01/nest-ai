"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Pencil, Trash2, Check, X } from "lucide-react";
import type { Bookmark, Tag } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

interface BookmarkListItemProps {
  bookmark: Bookmark & { bookmark_tags?: { tags: Tag }[] };
  onDelete: (id: string) => void;
  onUpdate: (bookmark: Bookmark) => void;
}

export function BookmarkListItem({
  bookmark,
  onDelete,
  onUpdate,
}: BookmarkListItemProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const supabase = createSupabaseBrowser();
  const tags =
    bookmark.bookmark_tags?.map((bt) => bt.tags) ?? bookmark.tags ?? [];
  const timeAgo = formatDistanceToNow(new Date(bookmark.created_at), {
    addSuffix: true,
  });

  async function handleSave() {
    const { data, error } = await supabase
      .from("bookmarks")
      .update({ title })
      .eq("id", bookmark.id)
      .select()
      .single();

    if (!error && data) {
      onUpdate({ ...bookmark, ...data });
    }
    setEditing(false);
  }

  async function handleDelete() {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", bookmark.id);

    if (!error) {
      onDelete(bookmark.id);
    }
  }

  return (
    <div className="group flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors border-b border-neutral-100 last:border-0">
      {/* Favicon */}
      <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center shrink-0 overflow-hidden">
        {bookmark.favicon_url ? (
          <img
            src={bookmark.favicon_url}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-xs font-bold text-neutral-300">
            {(bookmark.domain ?? "?")[0].toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-2 py-1 border border-neutral-200 rounded-md text-sm outline-none focus:border-neutral-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button
              onClick={handleSave}
              className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded hover:bg-neutral-100 text-neutral-400 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-neutral-900 hover:text-neutral-600 truncate block"
            >
              {bookmark.title || bookmark.url}
            </a>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-neutral-400 truncate">
                {bookmark.domain}
              </span>
              <span className="text-xs text-neutral-300">·</span>
              <span className="text-xs text-neutral-400 shrink-0">
                {timeAgo}
              </span>
              {(bookmark.category || bookmark.domain_context || tags.length > 0) && (
                <>
                  <span className="text-xs text-neutral-300">·</span>
                  <div className="flex items-center gap-1 overflow-hidden">
                    {bookmark.category && bookmark.category !== "Other" && (
                      <span className="px-1.5 py-0 bg-neutral-900 text-white text-[10px] rounded-full shrink-0 font-medium">
                        {bookmark.category}
                      </span>
                    )}
                    {bookmark.domain_context && (
                      <span className="px-1.5 py-0 bg-neutral-200 text-neutral-700 text-[10px] rounded-full shrink-0 font-medium">
                        {bookmark.domain_context}
                      </span>
                    )}
                    {tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-1.5 py-0 bg-neutral-100 text-neutral-400 text-[10px] rounded-full shrink-0"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
          >
            <Pencil size={13} />
          </button>
          {confirmDelete ? (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md hover:bg-red-50 text-red-500 cursor-pointer"
            >
              <Check size={13} />
            </button>
          ) : (
            <button
              onClick={() => {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }}
              className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
