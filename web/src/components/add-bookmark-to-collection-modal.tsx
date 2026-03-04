"use client";

import { useState, useEffect } from "react";
import { X, Search, Check } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Bookmark } from "@/lib/types";

interface AddBookmarkToCollectionModalProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
  existingBookmarkIds: Set<string>;
  onAdded: () => void;
}

export function AddBookmarkToCollectionModal({
  open,
  onClose,
  collectionId,
  existingBookmarkIds,
  onAdded,
}: AddBookmarkToCollectionModalProps) {
  const supabase = createSupabaseBrowser();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function fetchBookmarks() {
      setLoading(true);
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });
      setBookmarks((data as Bookmark[]) ?? []);
      setSelected(new Set());
      setSearch("");
      setLoading(false);
    }
    fetchBookmarks();
  }, [open, supabase]);

  if (!open) return null;

  const filtered = bookmarks.filter((b) => {
    if (existingBookmarkIds.has(b.id)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title?.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      b.domain?.toLowerCase().includes(q)
    );
  });

  function toggleBookmark(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSaving(true);
    const rows = Array.from(selected).map((bookmark_id) => ({
      collection_id: collectionId,
      bookmark_id,
    }));
    await supabase.from("collection_bookmarks").insert(rows);
    setSaving(false);
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 className="text-lg font-semibold">Add Bookmarks</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bookmarks..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-8">
              No bookmarks to add.
            </p>
          )}
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => toggleBookmark(b.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                selected.has(b.id)
                  ? "bg-neutral-900 text-white"
                  : "hover:bg-neutral-50"
              }`}
            >
              <div className="w-5 h-5 rounded border flex items-center justify-center shrink-0"
                style={{
                  borderColor: selected.has(b.id) ? "white" : "#d4d4d4",
                }}
              >
                {selected.has(b.id) && <Check size={12} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {b.title || b.url}
                </p>
                <p className={`text-xs truncate ${selected.has(b.id) ? "text-neutral-300" : "text-neutral-400"}`}>
                  {b.domain}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="w-full py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving
              ? "Adding..."
              : `Add ${selected.size} bookmark${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
