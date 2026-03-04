"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Collection } from "@/lib/types";
import { CollectionCard } from "@/components/collection-card";
import { CreateCollectionModal } from "@/components/create-collection-modal";

export default function CollectionsPage() {
  const supabase = createSupabaseBrowser();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    async function fetch() {
      // Owned collections
      const { data: owned } = await supabase
        .from("collections")
        .select("*")
        .order("created_at", { ascending: false });

      // Shared collections (via membership)
      const { data: memberships } = await supabase
        .from("collection_members")
        .select("collection_id");

      let shared: Collection[] = [];
      if (memberships && memberships.length > 0) {
        const ids = memberships.map((m) => m.collection_id);
        const { data } = await supabase
          .from("collections")
          .select("*")
          .in("id", ids)
          .order("created_at", { ascending: false });
        shared = (data as Collection[]) ?? [];
      }

      // Merge, deduplicate
      const all = [...(owned ?? [])];
      const ownedIds = new Set(all.map((c) => c.id));
      shared.forEach((c) => {
        if (!ownedIds.has(c.id)) all.push(c);
      });

      setCollections(all as Collection[]);
      setLoading(false);
    }
    fetch();
  }, [supabase]);

  async function handleCreate(name: string, description: string) {
    const { data, error } = await supabase
      .from("collections")
      .insert({ name, description: description || null })
      .select()
      .single();

    if (!error && data) {
      setCollections((prev) => [data as Collection, ...prev]);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (!error) {
      setCollections((prev) => prev.filter((c) => c.id !== id));
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="text-lg font-bold tracking-tight">Collections</h1>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        )}

        {!loading && collections.length === 0 && (
          <div className="text-center py-20">
            <p className="text-neutral-400 text-sm">No collections yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-neutral-900 font-medium hover:underline cursor-pointer"
            >
              Create your first collection
            </button>
          </div>
        )}

        {!loading && collections.length > 0 && (
          <>
            <p className="text-xs text-neutral-400 mb-4">
              {collections.length}{" "}
              {collections.length === 1 ? "collection" : "collections"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {collections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <CreateCollectionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
