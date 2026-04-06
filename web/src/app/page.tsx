"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Masonry from "react-masonry-css";
import { Upload } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Bookmark, Tag } from "@/lib/types";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { CategoryTabs } from "@/components/category-tabs";
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkListItem } from "@/components/bookmark-list-item";
import { BookmarkDetailSheet } from "@/components/bookmark-detail-sheet";
import { ViewSwitcher } from "@/components/view-switcher";
import { ToastProvider, showToast } from "@/components/toast";
import { EmptyState } from "@/components/empty-state";

type BookmarkRow = Bookmark & { bookmark_tags: { tags: Tag }[] };

const masonryBreakpoints = {
  default: 4,
  1100: 3,
  768: 2,
  480: 1,
};

export default function DashboardPage() {
  const supabase = createSupabaseBrowser();

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>();

  // Filters
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BookmarkRow[] | null>(null);
  const [userId, setUserId] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedBookmark, setSelectedBookmark] = useState<BookmarkRow | null>(null);

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
      setUserId(user?.id);
    };
    init();
  }, [fetchBookmarks, supabase.auth]);

  // Debounced server-side FTS search
  useEffect(() => {
    const query = search.trim();
    if (!query || !userId) {
      const timer = setTimeout(() => {
        setSearchResults(null);
        setSearching(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      async function runSearch() {
        setSearching(true);
        const { data } = await supabase.rpc("search_bookmarks", {
          search_query: query,
          user_id_param: userId,
        });
        if (cancelled) return;

        if (data && data.length > 0) {
          const ids = data.map((b: Bookmark) => b.id);
          const { data: tagsData } = await supabase
            .from("bookmark_tags")
            .select("bookmark_id, tags(*)")
            .in("bookmark_id", ids);

          if (cancelled) return;

          const tagsByBookmark = new Map<string, { tags: Tag }[]>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tagsData?.forEach((bt: any) => {
            const existing = tagsByBookmark.get(bt.bookmark_id as string) || [];
            existing.push({ tags: bt.tags as Tag });
            tagsByBookmark.set(bt.bookmark_id as string, existing);
          });

          setSearchResults(
            data.map((b: Bookmark) => ({
              ...b,
              bookmark_tags: tagsByBookmark.get(b.id) || [],
            }))
          );
        } else {
          setSearchResults(data ? [] : null);
        }
        setSearching(false);
      }
      runSearch();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, userId, supabase]);

  // Derived data
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats).sort();
  }, [bookmarks]);

  // Filtered bookmarks
  const filtered = useMemo(() => {
    let result = searchResults !== null ? searchResults : bookmarks;

    if (selectedCategory) {
      result = result.filter((b) => b.category === selectedCategory);
    }

    return result;
  }, [bookmarks, searchResults, selectedCategory]);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeleteRef = useRef<{ bookmark: BookmarkRow; index: number } | null>(null);

  function handleDelete(id: string) {
    // Cancel any previous pending delete
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      // Execute the previous pending delete immediately
      if (pendingDeleteRef.current) {
        const prevId = pendingDeleteRef.current.bookmark.id;
        supabase.from("bookmarks").delete().eq("id", prevId);
      }
    }

    // Store bookmark for potential undo
    const idx = bookmarks.findIndex((b) => b.id === id);
    const deleted = bookmarks[idx];
    if (!deleted) return;
    pendingDeleteRef.current = { bookmark: deleted, index: idx };

    // Optimistic UI removal
    setBookmarks((prev) => prev.filter((b) => b.id !== id));

    // Show toast with undo
    showToast("Link deleted successfully!", {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
          const pending = pendingDeleteRef.current;
          if (pending) {
            setBookmarks((prev) => {
              const copy = [...prev];
              copy.splice(pending.index, 0, pending.bookmark);
              return copy;
            });
            pendingDeleteRef.current = null;
          }
        },
      },
    });

    // Actually delete from DB after 5s
    deleteTimerRef.current = setTimeout(() => {
      supabase.from("bookmarks").delete().eq("id", id);
      pendingDeleteRef.current = null;
      deleteTimerRef.current = null;
    }, 5000);
  }

  function handleUpdate(updated: Bookmark) {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
    );
  }

  const hasFilters = !!search || !!selectedCategory;

  return (
    <div className="dashboard-page">
      <Header userEmail={userEmail} />

      <div className="dashboard-content">
        {/* Search + actions */}
        <div className="dashboard-filters">
          <div className="dashboard-filter-search">
            <SearchBar value={search} onChange={setSearch} loading={searching} />
          </div>
          <div className="dashboard-actions">
            <Link href="/import" className="import-btn">
              <Upload size={16} />
              Import
            </Link>
            <div className="dashboard-separator" />
            <ViewSwitcher view={view} onChange={setView} />
          </div>
        </div>

        {/* Category chips */}
        {allCategories.length > 0 && (
          <div className="dashboard-category-wrap">
            <CategoryTabs
              categories={allCategories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>
        )}

        {/* Results count */}
        {!loading && bookmarks.length > 0 && (
          <p className="dashboard-caption">
            {filtered.length}{" "}
            {filtered.length === 1 ? "saved link" : "saved links"}
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

        {/* Grid view — masonry */}
        {!loading && filtered.length > 0 && view === "grid" && (
          <Masonry
            breakpointCols={masonryBreakpoints}
            className="masonry-grid"
            columnClassName="masonry-grid-column"
          >
            {filtered.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onClick={() => setSelectedBookmark(bookmark)}
              />
            ))}
          </Masonry>
        )}

        {/* List view */}
        {!loading && filtered.length > 0 && view === "list" && (
          <div className="dashboard-list-wrap">
            {filtered.map((bookmark) => (
              <BookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onClick={() => setSelectedBookmark(bookmark)}
              />
            ))}
          </div>
        )}
      </div>

      <BookmarkDetailSheet
        bookmark={selectedBookmark}
        onClose={() => setSelectedBookmark(null)}
        onDelete={(id) => {
          setSelectedBookmark(null);
          handleDelete(id);
        }}
        onUpdate={(updated) => {
          handleUpdate(updated);
          // Refetch to get fresh tags
          fetchBookmarks();
        }}
      />

      <ToastProvider />
    </div>
  );
}
