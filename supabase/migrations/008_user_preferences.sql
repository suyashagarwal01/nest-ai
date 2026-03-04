-- Migration 008: User preferences for tag vocabulary and interest vectors
-- Shared by Feature 11 (vocabulary) and Feature 12 (interest boosting)

-- Tag vocabulary: user-specific alias overrides like {"ml": "machine-learning"}
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tag_vocabulary JSONB DEFAULT '{}';

-- Interest vector: top 50 tag frequency counts like {"react": 15, "typescript": 12}
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interest_vector JSONB DEFAULT '{}';

-- Compute top 50 tags by usage count per user
-- Called by the daily aggregation Edge Function
CREATE OR REPLACE FUNCTION compute_interest_vectors()
RETURNS TABLE(uid UUID, vector JSONB)
LANGUAGE sql STABLE
AS $$
  WITH tag_counts AS (
    SELECT
      t.user_id,
      t.name,
      COUNT(DISTINCT bt.bookmark_id) AS cnt
    FROM tags t
    JOIN bookmark_tags bt ON bt.tag_id = t.id
    GROUP BY t.user_id, t.name
  ),
  ranked AS (
    SELECT
      user_id,
      name,
      cnt,
      ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY cnt DESC) AS rn
    FROM tag_counts
    WHERE cnt >= 2  -- only tags used 2+ times
  )
  SELECT
    user_id AS uid,
    jsonb_object_agg(name, cnt) AS vector
  FROM ranked
  WHERE rn <= 50
  GROUP BY user_id;
$$;
