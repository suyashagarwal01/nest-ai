import { Bookmark } from "lucide-react";

interface EmptyStateProps {
  hasSearch?: boolean;
}

export function EmptyState({ hasSearch }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Bookmark size={20} />
      </div>
      {hasSearch ? (
        <>
          <h3 className="empty-state-title">No results found</h3>
          <p className="empty-state-desc">
            Try a different search term or clear your filters.
          </p>
        </>
      ) : (
        <>
          <h3 className="empty-state-title">No bookmarks yet</h3>
          <p className="empty-state-desc">
            Install the Nest Chrome extension and start saving pages. They
            will appear here automatically.
          </p>
        </>
      )}
    </div>
  );
}
