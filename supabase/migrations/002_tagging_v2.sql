-- Migration: Tagging v2 — structured taxonomy
-- Adds domain_context to bookmarks, source/confidence to bookmark_tags

-- Add domain_context to bookmarks
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS domain_context TEXT;

-- Add source and confidence to bookmark_tags
ALTER TABLE bookmark_tags
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ai_tier1',
  ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 1.0;

ALTER TABLE bookmark_tags
  ADD CONSTRAINT bookmark_tags_source_check
  CHECK (source IN ('user', 'ai_tier1', 'ai_tier2', 'ai_tier3', 'collective'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_domain_context ON bookmarks(user_id, domain_context);
CREATE INDEX IF NOT EXISTS idx_bookmark_tags_source ON bookmark_tags(source);

-- Update FTS index to include domain_context
DROP INDEX IF EXISTS idx_bookmarks_fts;
CREATE INDEX idx_bookmarks_fts ON bookmarks
  USING GIN (to_tsvector('english',
    COALESCE(title,'') || ' ' || COALESCE(description,'') || ' ' ||
    COALESCE(note,'') || ' ' || COALESCE(domain,'') || ' ' || COALESCE(domain_context,'')
  ));
