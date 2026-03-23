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
    <div className="suggestion-banner">
      <div className="suggestion-banner-text">
        <p>
          {suggestion.message}.{" "}
          <span className="suggestion-banner-hint">Create a collection?</span>
        </p>
      </div>
      <button
        onClick={() => onCreate(suggestion.tag)}
        className="suggestion-banner-create"
      >
        <FolderPlus size={12} />
        Create &ldquo;{suggestion.tag}&rdquo;
      </button>
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="suggestion-banner-dismiss"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
