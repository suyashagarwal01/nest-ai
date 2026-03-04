"use client";

import { X, FolderPlus } from "lucide-react";
import type { Suggestion } from "@/lib/suggestions";

interface SuggestionBannerProps {
  suggestion: Suggestion;
  onDismiss: (id: string) => void;
  onCreate: (tag: string) => void;
}

export function SuggestionBanner({
  suggestion,
  onDismiss,
  onCreate,
}: SuggestionBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-neutral-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-700">
          {suggestion.message}.{" "}
          <span className="text-neutral-400">Create a collection?</span>
        </p>
      </div>
      <button
        onClick={() => onCreate(suggestion.tag)}
        className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-neutral-900 text-white rounded-md hover:bg-neutral-800 shrink-0 cursor-pointer"
      >
        <FolderPlus size={12} />
        Create &ldquo;{suggestion.tag}&rdquo;
      </button>
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="p-1 rounded-md hover:bg-neutral-100 text-neutral-400 shrink-0 cursor-pointer"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
