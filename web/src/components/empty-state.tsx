import { Bookmark } from "lucide-react";

interface EmptyStateProps {
  hasSearch?: boolean;
}

export function EmptyState({ hasSearch }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <Bookmark size={20} className="text-neutral-400" />
      </div>
      {hasSearch ? (
        <>
          <h3 className="text-sm font-medium text-neutral-900 mb-1">
            No results found
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            Try a different search term or clear your filters.
          </p>
        </>
      ) : (
        <>
          <h3 className="text-sm font-medium text-neutral-900 mb-1">
            No bookmarks yet
          </h3>
          <p className="text-xs text-neutral-400 max-w-xs">
            Install the inSpace Chrome extension and start saving pages. They
            will appear here automatically.
          </p>
        </>
      )}
    </div>
  );
}
