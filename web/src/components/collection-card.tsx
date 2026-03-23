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
    <div className="collection-card">
      <Link href={`/collections/${collection.id}`}>
        <div className="collection-card-cover">
          <span className="collection-card-cover-letter">
            {collection.name[0]?.toUpperCase() ?? "C"}
          </span>
        </div>
      </Link>

      <div className="collection-card-body">
        <div className="collection-card-header">
          <Link
            href={`/collections/${collection.id}`}
            className="collection-card-name"
          >
            {collection.name}
          </Link>
          <div className="collection-card-actions">
            {confirmDelete ? (
              <button
                onClick={() => onDelete(collection.id)}
                className="collection-card-action-btn collection-card-action-btn--danger"
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
                className="collection-card-action-btn"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {collection.description && (
          <p className="collection-card-desc">{collection.description}</p>
        )}

        <div className="collection-card-footer">
          <span className="collection-card-count">
            {collection.bookmark_count}{" "}
            {collection.bookmark_count === 1 ? "bookmark" : "bookmarks"}
          </span>
          {collection.is_public ? (
            <span className="collection-card-badge collection-card-badge--public">
              <Globe size={10} /> Public
            </span>
          ) : (
            <span className="collection-card-badge collection-card-badge--private">
              <Lock size={10} /> Private
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
