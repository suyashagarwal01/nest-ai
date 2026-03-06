"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { SearchBar } from "@/components/search-bar";
import { CategoryTabs } from "@/components/category-tabs";
import { TagFilter } from "@/components/tag-filter";
import { BookmarkCard } from "@/components/bookmark-card";
import { BookmarkListItem } from "@/components/bookmark-list-item";
import { EmptyState } from "@/components/empty-state";
import type { Bookmark, Tag } from "@/lib/types";

// ── Mock Data ──────────────────────────────────────────────

function mockTag(name: string): Tag {
  return { id: name, user_id: "demo", name, created_at: new Date().toISOString() };
}

const MOCK_BOOKMARKS: (Bookmark & { bookmark_tags: { tags: Tag }[] })[] = [
  {
    id: "1",
    user_id: "demo",
    url: "https://github.com/vercel/next.js",
    title: "Next.js by Vercel - The React Framework",
    description: "The React Framework for Production. Used by some of the world's largest companies.",
    note: "Check the App Router docs for server components",
    screenshot_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop",
    favicon_url: "https://github.com/favicon.ico",
    domain: "github.com",
    domain_context: "GitHub repository",
    category: "Development",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("react") },
      { tags: mockTag("framework") },
      { tags: mockTag("development") },
    ],
  },
  {
    id: "2",
    user_id: "demo",
    url: "https://tailwindcss.com/docs/installation",
    title: "Installation - Tailwind CSS",
    description: "The fastest way to get up and running with Tailwind CSS.",
    note: null,
    screenshot_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop",
    favicon_url: "https://tailwindcss.com/favicons/favicon.ico",
    domain: "tailwindcss.com",
    domain_context: "Tailwind CSS docs",
    category: "Documentation",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("css") },
      { tags: mockTag("documentation") },
      { tags: mockTag("styling") },
    ],
  },
  {
    id: "3",
    user_id: "demo",
    url: "https://dribbble.com/shots/popular",
    title: "Popular Designs on Dribbble",
    description: "Discover the world's top designers & creatives.",
    note: "Inspiration for the dashboard cards",
    screenshot_url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop",
    favicon_url: "https://dribbble.com/favicon.ico",
    domain: "dribbble.com",
    domain_context: "Dribbble design",
    category: "Design",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("design") },
      { tags: mockTag("inspiration") },
      { tags: mockTag("ui") },
    ],
  },
  {
    id: "4",
    user_id: "demo",
    url: "https://arxiv.org/abs/2301.00001",
    title: "Attention Is All You Need - Transformer Architecture",
    description: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.",
    note: "Foundational paper for LLMs",
    screenshot_url: null,
    thumbnail_url: null,
    favicon_url: "https://arxiv.org/favicon.ico",
    domain: "arxiv.org",
    domain_context: "arXiv paper",
    category: "Research",
    has_screenshot: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("ai") },
      { tags: mockTag("research") },
      { tags: mockTag("machine-learning") },
    ],
  },
  {
    id: "5",
    user_id: "demo",
    url: "https://news.ycombinator.com",
    title: "Hacker News",
    description: "Links for the intellectually curious, ranked by readers.",
    note: null,
    screenshot_url: "https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1504711434969-e33886168d5c?w=400&h=250&fit=crop",
    favicon_url: "https://news.ycombinator.com/favicon.ico",
    domain: "news.ycombinator.com",
    domain_context: "Hacker News article",
    category: "News",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("news") },
      { tags: mockTag("tech") },
    ],
  },
  {
    id: "6",
    user_id: "demo",
    url: "https://supabase.com/docs",
    title: "Supabase Docs - Open Source Firebase Alternative",
    description: "An open source Firebase alternative. Start your project with a Postgres database.",
    note: "Using for Nest backend",
    screenshot_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop",
    favicon_url: "https://supabase.com/favicon.ico",
    domain: "supabase.com",
    domain_context: "Supabase docs",
    category: "Development",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("database") },
      { tags: mockTag("backend") },
      { tags: mockTag("development") },
    ],
  },
  {
    id: "7",
    user_id: "demo",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    title: "Building a Chrome Extension with TypeScript",
    description: "Learn how to build a modern Chrome extension using Manifest V3 and TypeScript.",
    note: null,
    screenshot_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=250&fit=crop",
    favicon_url: "https://www.youtube.com/favicon.ico",
    domain: "youtube.com",
    domain_context: "YouTube video",
    category: "Video",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("video") },
      { tags: mockTag("tutorial") },
      { tags: mockTag("chrome-extension") },
    ],
  },
  {
    id: "8",
    user_id: "demo",
    url: "https://medium.com/@someone/react-performance-tips",
    title: "10 React Performance Tips You Should Know in 2026",
    description: "Practical advice for optimizing your React applications for speed.",
    note: "Great tips on memo and lazy loading",
    screenshot_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=375&fit=crop",
    thumbnail_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=250&fit=crop",
    favicon_url: "https://medium.com/favicon.ico",
    domain: "medium.com",
    domain_context: "Medium blog",
    category: "Articles",
    has_screenshot: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updated_at: new Date().toISOString(),
    bookmark_tags: [
      { tags: mockTag("react") },
      { tags: mockTag("performance") },
      { tags: mockTag("articles") },
    ],
  },
];

// ── Demo Page ──────────────────────────────────────────────

export default function DemoPage() {
  const [bookmarks, setBookmarks] = useState(MOCK_BOOKMARKS);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list" | "grouped">("grid");

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    bookmarks.forEach((b) => { if (b.category) cats.add(b.category); });
    return Array.from(cats).sort();
  }, [bookmarks]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => {
      b.bookmark_tags?.forEach((bt) => { if (bt.tags?.name) tagSet.add(bt.tags.name); });
    });
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  const filtered = useMemo(() => {
    let result = bookmarks;
    if (selectedCategory) {
      result = result.filter((b) => b.category === selectedCategory);
    }
    if (selectedTags.length > 0) {
      result = result.filter((b) => {
        const bt = b.bookmark_tags?.map((t) => t.tags?.name).filter(Boolean) ?? [];
        return selectedTags.some((t) => bt.includes(t));
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.domain?.toLowerCase().includes(q) ||
          b.note?.toLowerCase().includes(q) ||
          b.bookmark_tags?.some((bt) => bt.tags?.name?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [bookmarks, selectedCategory, selectedTags, search]);

  function handleDelete(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  function handleUpdate(updated: Bookmark) {
    setBookmarks((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const hasFilters = !!search || !!selectedCategory || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header view={view} onViewChange={setView} onExport={() => {}} userEmail="demo@inspace.app" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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

        <p className="text-xs text-neutral-400 mb-4">
          {filtered.length} {filtered.length === 1 ? "bookmark" : "bookmarks"}
          {hasFilters ? " found" : ""}
        </p>

        {filtered.length === 0 && <EmptyState hasSearch={hasFilters} />}

        {filtered.length > 0 && view === "grid" && (
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

        {filtered.length > 0 && view === "list" && (
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
