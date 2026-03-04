"use client";

import { useState } from "react";
import { X, Globe, Lock, Copy, Check } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { Collection } from "@/lib/types";

interface ShareCollectionModalProps {
  open: boolean;
  onClose: () => void;
  collection: Collection;
  onUpdate: (collection: Collection) => void;
}

export function ShareCollectionModal({
  open,
  onClose,
  collection,
  onUpdate,
}: ShareCollectionModalProps) {
  const supabase = createSupabaseBrowser();
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const publicUrl = collection.slug
    ? `${window.location.origin}/c/${collection.slug}`
    : null;

  async function handleTogglePublic() {
    setToggling(true);
    const newPublic = !collection.is_public;

    let slug = collection.slug;
    if (newPublic && !slug) {
      // Generate slug via RPC
      const { data } = await supabase.rpc("generate_collection_slug", {
        collection_name: collection.name,
        owner_id: collection.user_id,
      });
      slug = data as string;
    }

    const { data } = await supabase
      .from("collections")
      .update({
        is_public: newPublic,
        slug: newPublic ? slug : collection.slug,
      })
      .eq("id", collection.id)
      .select()
      .single();

    if (data) onUpdate(data as Collection);
    setToggling(false);
  }

  async function handleCopy() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share Collection</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            {collection.is_public ? (
              <Globe size={16} className="text-green-600" />
            ) : (
              <Lock size={16} className="text-neutral-400" />
            )}
            <div>
              <p className="text-sm font-medium">
                {collection.is_public ? "Public" : "Private"}
              </p>
              <p className="text-xs text-neutral-400">
                {collection.is_public
                  ? "Anyone with the link can view"
                  : "Only you and members can view"}
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
              collection.is_public ? "bg-green-500" : "bg-neutral-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                collection.is_public ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Public URL */}
        {collection.is_public && publicUrl && (
          <div className="mt-4">
            <p className="text-xs text-neutral-500 mb-2">Share link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600 outline-none"
              />
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer"
                title="Copy link"
              >
                {copied ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Copy size={16} className="text-neutral-400" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Members info */}
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <p className="text-xs text-neutral-400">
            Share the collection URL with others to give them access.
            Members with the link who have an account can view the collection.
          </p>
        </div>
      </div>
    </div>
  );
}
