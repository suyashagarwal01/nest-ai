"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { RelatedBookmark } from "@/lib/types";

interface RelatedBookmarksProps {
  bookmarkId: string;
  domain: string | null;
  category: string | null;
}

export function RelatedBookmarks({ bookmarkId, domain, category }: RelatedBookmarksProps) {
  const [related, setRelated] = useState<RelatedBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase.rpc("get_related_bookmarks", {
        p_bookmark_id: bookmarkId,
        p_domain: domain,
        p_category: category,
      });

      if (!error && data) {
        setRelated(data as RelatedBookmark[]);
      }
      setLoading(false);
    }
    fetch();
  }, [bookmarkId, domain, category, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-3">
        <div className="w-3.5 h-3.5 border-2 border-neutral-200 border-t-neutral-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (related.length === 0) {
    return (
      <p className="text-xs text-neutral-400 py-2 text-center">
        No related bookmarks found
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {related.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 transition-colors"
        >
          {item.favicon_url ? (
            <img
              src={item.favicon_url}
              alt=""
              className="w-3.5 h-3.5 rounded-sm shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="w-3.5 h-3.5 bg-neutral-200 rounded-sm shrink-0 flex items-center justify-center text-[8px] text-neutral-400">
              {(item.domain ?? "?")[0].toUpperCase()}
            </span>
          )}
          <span className="text-xs text-neutral-700 truncate flex-1">
            {item.title || item.url}
          </span>
          <span className="text-[10px] text-neutral-400 shrink-0">
            {item.domain}
          </span>
          <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded-full shrink-0">
            {item.shared_tag_count} shared
          </span>
        </a>
      ))}
    </div>
  );
}
