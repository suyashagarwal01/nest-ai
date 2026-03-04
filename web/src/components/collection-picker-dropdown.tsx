"use client";

import { useState, useEffect, useRef } from "react";
import { Check, Plus } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Collection } from "@/lib/types";

interface CollectionPickerDropdownProps {
  bookmarkId: string;
  onClose: () => void;
}

export function CollectionPickerDropdown({
  bookmarkId,
  onClose,
}: CollectionPickerDropdownProps) {
  const supabase = createSupabaseBrowser();
  const ref = useRef<HTMLDivElement>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memberOf, setMemberOf] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    async function fetch() {
      const { data: colls } = await supabase
        .from("collections")
        .select("*")
        .order("name");

      const { data: links } = await supabase
        .from("collection_bookmarks")
        .select("collection_id")
        .eq("bookmark_id", bookmarkId);

      setCollections((colls as Collection[]) ?? []);
      setMemberOf(new Set((links ?? []).map((l) => l.collection_id)));
      setLoading(false);
    }
    fetch();
  }, [supabase, bookmarkId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function toggle(collectionId: string) {
    if (memberOf.has(collectionId)) {
      await supabase
        .from("collection_bookmarks")
        .delete()
        .eq("collection_id", collectionId)
        .eq("bookmark_id", bookmarkId);
      setMemberOf((prev) => {
        const next = new Set(prev);
        next.delete(collectionId);
        return next;
      });
    } else {
      await supabase
        .from("collection_bookmarks")
        .insert({ collection_id: collectionId, bookmark_id: bookmarkId });
      setMemberOf((prev) => new Set(prev).add(collectionId));
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    const { data } = await supabase
      .from("collections")
      .insert({ name: newName.trim() })
      .select()
      .single();
    if (data) {
      const coll = data as Collection;
      setCollections((prev) => [...prev, coll]);
      // Also add bookmark to the new collection
      await supabase
        .from("collection_bookmarks")
        .insert({ collection_id: coll.id, bookmark_id: bookmarkId });
      setMemberOf((prev) => new Set(prev).add(coll.id));
    }
    setNewName("");
    setCreating(false);
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50 min-w-[200px] max-h-[280px] overflow-y-auto"
    >
      {loading && (
        <div className="px-3 py-2 text-xs text-neutral-400">Loading...</div>
      )}
      {!loading && collections.length === 0 && !creating && (
        <div className="px-3 py-2 text-xs text-neutral-400">
          No collections yet.
        </div>
      )}
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => toggle(c.id)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-50 cursor-pointer text-left"
        >
          <div className="w-4 h-4 rounded border border-neutral-300 flex items-center justify-center shrink-0">
            {memberOf.has(c.id) && <Check size={10} className="text-neutral-900" />}
          </div>
          <span className="truncate">{c.name}</span>
        </button>
      ))}
      <div className="border-t border-neutral-100 mt-1 pt-1">
        {creating ? (
          <div className="px-3 py-1.5 flex items-center gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              className="flex-1 px-2 py-1 border border-neutral-200 rounded text-xs outline-none focus:border-neutral-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setCreating(false);
              }}
            />
            <button
              onClick={handleCreate}
              className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
            >
              <Check size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer"
          >
            <Plus size={14} />
            New Collection
          </button>
        )}
      </div>
    </div>
  );
}
