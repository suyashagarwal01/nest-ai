-- Migration 009: Related bookmarks RPC function
-- Finds bookmarks sharing 2+ tags with the given bookmark

CREATE OR REPLACE FUNCTION get_related_bookmarks(
  p_bookmark_id UUID,
  p_domain TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  url TEXT,
  title TEXT,
  domain TEXT,
  favicon_url TEXT,
  shared_tag_count BIGINT,
  score DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH bookmark_tags_list AS (
    -- Get tag IDs for the source bookmark
    SELECT tag_id
    FROM bookmark_tags
    WHERE bookmark_id = p_bookmark_id
  ),
  candidates AS (
    -- Find other bookmarks sharing tags, count shared tags
    SELECT
      bt.bookmark_id,
      COUNT(DISTINCT bt.tag_id) AS shared_count
    FROM bookmark_tags bt
    JOIN bookmark_tags_list btl ON btl.tag_id = bt.tag_id
    JOIN bookmarks b ON b.id = bt.bookmark_id
    WHERE bt.bookmark_id != p_bookmark_id
      AND b.user_id = auth.uid()
    GROUP BY bt.bookmark_id
    HAVING COUNT(DISTINCT bt.tag_id) >= 2
  )
  SELECT
    b.id,
    b.url,
    b.title,
    b.domain,
    b.favicon_url,
    c.shared_count AS shared_tag_count,
    (
      c.shared_count::DOUBLE PRECISION
      + CASE WHEN b.domain = p_domain THEN 1.0 ELSE 0.0 END
      + CASE WHEN b.category = p_category THEN 0.5 ELSE 0.0 END
    ) AS score
  FROM candidates c
  JOIN bookmarks b ON b.id = c.bookmark_id
  ORDER BY score DESC, b.created_at DESC
  LIMIT 5;
$$;
