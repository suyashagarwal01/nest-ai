"use client";

import { useState } from "react";
import { Trash2, Check, Globe, Lock } from "lucide-react";
import type { Collection } from "@/lib/types";
import Link from "next/link";

interface CollectionCardProps {
  collection: Collection;
  onDelete: (id: string) => void;
}

export function CollectionCard({ collection, onDelete }: CollectionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-300 hover:shadow-sm transition-all">
      {/* Cover / placeholder */}
      <Link href={`/collections/${collection.id}`} className="block">
        <div className="aspect-[16/8] bg-neutral-100 flex items-center justify-center">
          <span className="text-3xl font-bold text-neutral-300">
            {collection.name[0]?.toUpperCase() ?? "C"}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/collections/${collection.id}`}
            className="text-sm font-medium text-neutral-900 hover:text-neutral-600 line-clamp-1 flex-1"
          >
            {collection.name}
          </Link>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {confirmDelete ? (
              <button
                onClick={() => onDelete(collection.id)}
                className="p-1.5 rounded-md hover:bg-red-50 text-red-500 cursor-pointer"
                title="Confirm delete"
              >
                <Check size={13} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }}
                className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {collection.description && (
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
            {collection.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-neutral-400">
            {collection.bookmark_count}{" "}
            {collection.bookmark_count === 1 ? "bookmark" : "bookmarks"}
          </span>
          {collection.is_public ? (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] rounded-full">
              <Globe size={10} /> Public
            </span>
          ) : (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded-full">
              <Lock size={10} /> Private
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
