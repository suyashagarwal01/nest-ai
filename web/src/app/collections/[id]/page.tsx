"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Share2, Pencil, Check, X } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Bookmark, Collection, Tag } from "@/lib/types";
import { BookmarkCard } from "@/components/bookmark-card";
import { AddBookmarkToCollectionModal } from "@/components/add-bookmark-to-collection-modal";
import { ShareCollectionModal } from "@/components/share-collection-modal";

type BookmarkRow = Bookmark & { bookmark_tags: { tags: Tag }[] };

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createSupabaseBrowser();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBookmarks, setShowAddBookmarks] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const fetchCollection = useCallback(async () => {
    const { data: coll, error } = await supabase
      .from("collections")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !coll) {
      router.push("/collections");
      return;
    }
    setCollection(coll as Collection);
    setEditName(coll.name);
    setEditDesc(coll.description ?? "");
  }, [id, supabase, router]);

  const fetchBookmarks = useCallback(async () => {
    const { data: links } = await supabase
      .from("collection_bookmarks")
      .select("bookmark_id")
      .eq("collection_id", id)
      .order("added_at", { ascending: false });

    if (!links || links.length === 0) {
      setBookmarks([]);
      return;
    }

    const ids = links.map((l) => l.bookmark_id);
    const { data } = await supabase
      .from("bookmarks")
      .select("*, bookmark_tags(tags(*))")
      .in("id", ids);

    // Preserve collection order
    const byId = new Map((data ?? []).map((b) => [b.id, b]));
    const ordered = ids
      .map((bid) => byId.get(bid))
      .filter(Boolean) as BookmarkRow[];
    setBookmarks(ordered);
  }, [id, supabase]);

  useEffect(() => {
    async function init() {
      await fetchCollection();
      await fetchBookmarks();
      setLoading(false);
    }
    init();
  }, [fetchCollection, fetchBookmarks]);

  async function handleSaveEdit() {
    const { data } = await supabase
      .from("collections")
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq("id", id)
      .select()
      .single();
    if (data) setCollection(data as Collection);
    setEditing(false);
  }

  function handleUpdateBookmark(updated: Bookmark) {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
    );
  }

  async function handleRemoveFromCollection(bookmarkId: string) {
    await supabase
      .from("collection_bookmarks")
      .delete()
      .eq("collection_id", id)
      .eq("bookmark_id", bookmarkId);
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    if (collection) {
      setCollection({ ...collection, bookmark_count: collection.bookmark_count - 1 });
    }
  }

  const existingIds = new Set(bookmarks.map((b) => b.id));

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/collections"
              className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400"
            >
              <ArrowLeft size={16} />
            </Link>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-2 py-1 border border-neutral-200 rounded-md text-sm font-bold outline-none focus:border-neutral-400"
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
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
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">
                  {collection?.name ?? "..."}
                </h1>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1 rounded hover:bg-neutral-100 text-neutral-400 cursor-pointer"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShare(true)}
              className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
              title="Share"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setShowAddBookmarks(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 cursor-pointer"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Description */}
        {collection?.description && !editing && (
          <p className="text-sm text-neutral-500 mb-4">
            {collection.description}
          </p>
        )}
        {editing && (
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-400 resize-none mb-4"
            rows={2}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && bookmarks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-neutral-400 text-sm">
              No bookmarks in this collection yet.
            </p>
            <button
              onClick={() => setShowAddBookmarks(true)}
              className="mt-3 text-sm text-neutral-900 font-medium hover:underline cursor-pointer"
            >
              Add bookmarks
            </button>
          </div>
        )}

        {!loading && bookmarks.length > 0 && (
          <>
            <p className="text-xs text-neutral-400 mb-4">
              {bookmarks.length}{" "}
              {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="relative group/remove">
                  <BookmarkCard
                    bookmark={bookmark}
                    onDelete={() => handleRemoveFromCollection(bookmark.id)}
                    onUpdate={handleUpdateBookmark}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <AddBookmarkToCollectionModal
        open={showAddBookmarks}
        onClose={() => setShowAddBookmarks(false)}
        collectionId={id}
        existingBookmarkIds={existingIds}
        onAdded={() => {
          fetchBookmarks();
          fetchCollection();
        }}
      />

      {collection && (
        <ShareCollectionModal
          open={showShare}
          onClose={() => setShowShare(false)}
          collection={collection}
          onUpdate={(updated) => setCollection(updated)}
        />
      )}
    </div>
  );
}
