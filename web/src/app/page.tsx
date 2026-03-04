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
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BookmarkRow[] | null>(null);
  const [userId, setUserId] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list" | "grouped">("grid");

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
      // Clear results after debounce to avoid synchronous setState in effect body
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

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => {
      b.bookmark_tags?.forEach((bt) => {
        if (bt.tags?.name) tagSet.add(bt.tags.name);
      });
    });
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  // Filtered bookmarks — use server search results when searching, else full list
  const filtered = useMemo(() => {
    let result = searchResults !== null ? searchResults : bookmarks;

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

    return result;
  }, [bookmarks, searchResults, selectedCategory, selectedTags]);

  // Group filtered bookmarks by category
  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, BookmarkRow[]>();
    filtered.forEach((b) => {
      const cat = b.category || "Other";
      const list = groups.get(cat) || [];
      list.push(b);
      groups.set(cat, list);
    });
    // Sort alphabetically, "Other" last
    return new Map(
      [...groups.entries()].sort(([a], [b]) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return a.localeCompare(b);
      })
    );
  }, [filtered]);

  function handleExport(format: "json" | "csv") {
    const data = bookmarks.map((b) => ({
      url: b.url,
      title: b.title ?? "",
      category: b.category ?? "",
      domain: b.domain ?? "",
      domain_context: b.domain_context ?? "",
      tags: b.bookmark_tags?.map((bt) => bt.tags?.name).filter(Boolean).join(", ") ?? "",
      note: b.note ?? "",
      created_at: b.created_at,
    }));

    let blob: Blob;
    let filename: string;

    if (format === "json") {
      blob = new Blob(
        [JSON.stringify({ bookmarks: data }, null, 2)],
        { type: "application/json" }
      );
      filename = "inspace-bookmarks.json";
    } else {
      const columns = ["URL", "Title", "Category", "Domain", "Domain Context", "Tags", "Note", "Created At"];
      const escape = (v: string) => {
        if (v.includes(",") || v.includes('"') || v.includes("\n")) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      };
      const rows = data.map((d) =>
        [d.url, d.title, d.category, d.domain, d.domain_context, d.tags, d.note, d.created_at]
          .map(escape)
          .join(",")
      );
      blob = new Blob(
        [columns.join(",") + "\n" + rows.join("\n")],
        { type: "text/csv" }
      );
      filename = "inspace-bookmarks.csv";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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
      <Header view={view} onViewChange={setView} onExport={handleExport} userEmail={userEmail} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search + filters */}
        <div className="flex flex-col gap-4 mb-6">
          <SearchBar value={search} onChange={setSearch} loading={searching} />
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

        {/* Grouped view */}
        {!loading && filtered.length > 0 && view === "grouped" && (
          <div className="space-y-8">
            {[...groupedByCategory.entries()].map(([category, items]) => (
              <section key={category}>
                <h2 className="text-sm font-semibold text-neutral-700 mb-3">
                  {category}{" "}
                  <span className="text-neutral-400 font-normal">
                    ({items.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((bookmark) => (
                    <BookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
