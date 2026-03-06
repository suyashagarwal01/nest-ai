import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Metadata } from "next";
import type { Bookmark, Tag } from "@/lib/types";
import { Globe } from "lucide-react";

type BookmarkRow = Bookmark & { bookmark_tags: { tags: Tag }[] };

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServer();
  const { data: collection } = await supabase
    .from("collections")
    .select("name, description")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!collection) return { title: "Collection not found" };

  return {
    title: `${collection.name} — Nest Collection`,
    description: collection.description || `A public bookmark collection on Nest.`,
    openGraph: {
      title: `${collection.name} — Nest`,
      description: collection.description || `A public bookmark collection on Nest.`,
    },
  };
}

export default async function PublicCollectionPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!collection) notFound();

  // Fetch bookmarks in this collection
  const { data: links } = await supabase
    .from("collection_bookmarks")
    .select("bookmark_id")
    .eq("collection_id", collection.id)
    .order("added_at", { ascending: false });

  let bookmarks: BookmarkRow[] = [];
  if (links && links.length > 0) {
    const ids = links.map((l) => l.bookmark_id);
    const { data } = await supabase
      .from("bookmarks")
      .select("*, bookmark_tags(tags(*))")
      .in("id", ids);

    const byId = new Map((data ?? []).map((b) => [b.id, b]));
    bookmarks = ids
      .map((bid) => byId.get(bid))
      .filter(Boolean) as BookmarkRow[];
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Globe size={16} className="text-green-600" />
          <h1 className="text-lg font-bold tracking-tight">
            {collection.name}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {collection.description && (
          <p className="text-sm text-neutral-500 mb-4">
            {collection.description}
          </p>
        )}

        <p className="text-xs text-neutral-400 mb-4">
          {bookmarks.length}{" "}
          {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
        </p>

        {bookmarks.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-20">
            This collection is empty.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bookmarks.map((bookmark) => (
            <ReadOnlyBookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ReadOnlyBookmarkCard({
  bookmark,
}: {
  bookmark: BookmarkRow;
}) {
  const tags = bookmark.bookmark_tags?.map((bt) => bt.tags) ?? [];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
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
      <div className="p-4">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-neutral-900 hover:text-neutral-600 line-clamp-2"
        >
          {bookmark.title || bookmark.url}
        </a>
        <div className="flex items-center gap-1.5 mt-1.5">
          {bookmark.favicon_url && (
            <img
              src={bookmark.favicon_url}
              alt=""
              className="w-3.5 h-3.5 rounded-sm"
            />
          )}
          <span className="text-xs text-neutral-400 truncate">
            {bookmark.domain}
          </span>
        </div>
        {(bookmark.category || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-1 mt-3">
            {bookmark.category && bookmark.category !== "Other" && (
              <span className="px-2 py-0.5 bg-neutral-900 text-white text-[11px] rounded-full font-medium">
                {bookmark.category}
              </span>
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
      </div>
    </div>
  );
}
