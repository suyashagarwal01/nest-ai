"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Bookmark, Tag } from "@/lib/types";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { CategoryTabs } from "@/components/category-tabs";
import { TagFilter } from "@/components/tag-filter";
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkListItem } from "@/components/bookmark-list-item";
import { EmptyState } from "@/components/empty-state";

type BookmarkRow = Bookmark & { bookmark_tags: { tags: Tag }[] };

export default function DashboardPage() {
  const supabase = createSupabaseBrowser();

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>();

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");

  // Fetch bookmarks with tags
  const fetchBookmarks = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*, bookmark_tags(tags(*))")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBookmarks(data as BookmarkRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      await fetchBookmarks();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? undefined);
    };
    init();
  }, [fetchBookmarks, supabase.auth]);

  // Derived data
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats).sort();
  }, [bookmarks]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => {
      b.bookmark_tags?.forEach((bt) => {
        if (bt.tags?.name) tagSet.add(bt.tags.name);
      });
    });
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  // Filtered bookmarks
  const filtered = useMemo(() => {
    let result = bookmarks;

    // Category filter
    if (selectedCategory) {
      result = result.filter((b) => b.category === selectedCategory);
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter((b) => {
        const bookmarkTags =
          b.bookmark_tags?.map((bt) => bt.tags?.name).filter(Boolean) ?? [];
        return selectedTags.some((t) => bookmarkTags.includes(t));
      });
    }

    // Search filter (client-side for instant feel)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.domain?.toLowerCase().includes(q) ||
          b.note?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.bookmark_tags?.some((bt) =>
            bt.tags?.name?.toLowerCase().includes(q)
          )
      );
    }

    return result;
  }, [bookmarks, selectedCategory, selectedTags, search]);

  function handleDelete(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  function handleUpdate(updated: Bookmark) {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const hasFilters = !!search || !!selectedCategory || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header view={view} onViewChange={setView} userEmail={userEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search + filters */}
        <div className="flex flex-col gap-4 mb-6">
          <SearchBar value={search} onChange={setSearch} />
          <CategoryTabs
            categories={allCategories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <TagFilter
            tags={allTags}
            selected={selectedTags}
            onToggle={toggleTag}
            onClear={() => setSelectedTags([])}
          />
        </div>

        {/* Results count */}
        {!loading && bookmarks.length > 0 && (
          <p className="text-xs text-neutral-400 mb-4">
            {filtered.length}{" "}
            {filtered.length === 1 ? "bookmark" : "bookmarks"}
            {hasFilters ? " found" : ""}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <EmptyState hasSearch={hasFilters} />
        )}

        {/* Grid view */}
        {!loading && filtered.length > 0 && view === "grid" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

        {/* List view */}
        {!loading && filtered.length > 0 && view === "list" && (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            {filtered.map((bookmark) => (
              <BookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
