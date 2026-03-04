"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2, X, Check, FolderPlus, Link2 } from "lucide-react";
import type { Bookmark, Tag } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { CollectionPickerDropdown } from "@/components/collection-picker-dropdown";
import { RelatedBookmarks } from "@/components/related-bookmarks";

interface BookmarkCardProps {
  bookmark: Bookmark & { bookmark_tags?: { tags: Tag }[] };
  onDelete: (id: string) => void;
  onUpdate: (bookmark: Bookmark) => void;
  readOnly?: boolean;
}

export function BookmarkCard({ bookmark, onDelete, onUpdate, readOnly }: BookmarkCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(bookmark.title ?? "");
  const [note, setNote] = useState(bookmark.note ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showRelated, setShowRelated] = useState(false);

  const supabase = createSupabaseBrowser();
  const tags =
    bookmark.bookmark_tags?.map((bt) => bt.tags) ?? bookmark.tags ?? [];
  const timeAgo = formatDistanceToNow(new Date(bookmark.created_at), {
    addSuffix: true,
  });

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from("bookmarks")
      .update({ title, note })
      .eq("id", bookmark.id)
      .select()
      .single();

    if (!error && data) {
      onUpdate({ ...bookmark, ...data });
    }
    setSaving(false);
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
    <div className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-300 hover:shadow-sm transition-all">
      {/* Screenshot */}
      {bookmark.screenshot_url ? (
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="aspect-[16/10] bg-neutral-100 overflow-hidden">
            <img
              src={bookmark.thumbnail_url ?? bookmark.screenshot_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </a>
      ) : (
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="aspect-[16/10] bg-neutral-100 flex items-center justify-center">
            <span className="text-4xl font-bold text-neutral-300">
              {(bookmark.domain ?? "?")[0].toUpperCase()}
            </span>
          </div>
        </a>
      )}

      {/* Content */}
      <div className="p-4">
        {editing ? (
          <div className="flex flex-col gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-md text-sm outline-none focus:border-neutral-400"
              placeholder="Title"
            />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2 py-1.5 border border-neutral-200 rounded-md text-sm outline-none focus:border-neutral-400 resize-none"
              placeholder="Note"
              rows={2}
            />
            <div className="flex gap-1.5 justify-end">
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-900 cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Title + actions */}
            <div className="flex items-start justify-between gap-2">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-neutral-900 hover:text-neutral-600 line-clamp-2 flex-1"
              >
                {bookmark.title || bookmark.url}
              </a>
              {!readOnly && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setShowCollectionPicker((v) => !v)}
                      className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
                      title="Add to collection"
                    >
                      <FolderPlus size={13} />
                    </button>
                    {showCollectionPicker && (
                      <CollectionPickerDropdown
                        bookmarkId={bookmark.id}
                        onClose={() => setShowCollectionPicker(false)}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setShowRelated((v) => !v)}
                    className={`p-1.5 rounded-md hover:bg-neutral-100 cursor-pointer ${
                      showRelated ? "text-neutral-900" : "text-neutral-400"
                    }`}
                    title="Related bookmarks"
                  >
                    <Link2 size={13} />
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  {confirmDelete ? (
                    <button
                      onClick={handleDelete}
                      className="p-1.5 rounded-md hover:bg-red-50 text-red-500 cursor-pointer"
                      title="Confirm delete"
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
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Domain + time */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {bookmark.favicon_url && (
                <img
                  src={bookmark.favicon_url}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <span className="text-xs text-neutral-400 truncate">
                {bookmark.domain}
              </span>
              <span className="text-xs text-neutral-300">·</span>
              <span className="text-xs text-neutral-400">{timeAgo}</span>
            </div>

            {/* Note */}
            {bookmark.note && (
              <p className="text-xs text-neutral-500 mt-2 line-clamp-2">
                {bookmark.note}
              </p>
            )}

            {/* Tags — 3-layer taxonomy */}
            {(bookmark.category || bookmark.domain_context || tags.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 mt-3">
                {bookmark.category && bookmark.category !== "Other" && (
                  <span className="px-2 py-0.5 bg-neutral-900 text-white text-[11px] rounded-full font-medium">
                    {bookmark.category}
                  </span>
                )}
                {bookmark.domain_context && (
                  <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 text-[11px] rounded-full font-medium">
                    {bookmark.domain_context}
                  </span>
                )}
                {(bookmark.category || bookmark.domain_context) && tags.length > 0 && (
                  <span className="text-neutral-300 text-[11px]">&middot;</span>
                )}
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[11px] rounded-full"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Related bookmarks panel */}
            {showRelated && (
              <div className="mt-3 pt-3 border-t border-neutral-100">
                <p className="text-[11px] font-medium text-neutral-500 mb-1.5">Related</p>
                <RelatedBookmarks
                  bookmarkId={bookmark.id}
                  domain={bookmark.domain}
                  category={bookmark.category}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
