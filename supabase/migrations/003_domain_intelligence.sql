-- ============================================================
-- Migration: Domain Intelligence — learned domain/path patterns
-- ============================================================

-- 1. Domain intelligence table
-- ============================================================
CREATE TABLE domain_intelligence (
  domain TEXT PRIMARY KEY,
  domain_type TEXT,
  default_category TEXT,
  common_topics TEXT[] DEFAULT '{}',
  path_patterns JSONB DEFAULT '{"segments":{}}'::jsonb,
  save_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reuse existing update_updated_at() trigger function from 001
CREATE TRIGGER domain_intelligence_updated_at
  BEFORE UPDATE ON domain_intelligence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: read-only for authenticated users (Edge Function writes via service role)
ALTER TABLE domain_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read domain intelligence"
  ON domain_intelligence FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_di_save_count ON domain_intelligence(save_count DESC);
CREATE INDEX idx_di_category ON domain_intelligence(default_category);
CREATE INDEX idx_di_path_patterns ON domain_intelligence USING GIN (path_patterns);


-- 2. Helper: extract first meaningful path segment from URL
-- ============================================================
CREATE OR REPLACE FUNCTION extract_path_segment(url TEXT)
RETURNS TEXT AS $$
DECLARE
  path_part TEXT;
  parts TEXT[];
BEGIN
  path_part := substring(url FROM 'https?://[^/]+/([^?#]*)');
  IF path_part IS NULL OR path_part = '' THEN RETURN NULL; END IF;
  parts := string_to_array(path_part, '/');
  IF array_length(parts, 1) > 0 AND length(parts[1]) > 1 THEN
    RETURN lower(parts[1]);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 3. Aggregation function: domain-level stats
-- ============================================================
CREATE OR REPLACE FUNCTION aggregate_domain_stats()
RETURNS TABLE(domain TEXT, save_count BIGINT, default_category TEXT, common_topics TEXT[])
AS $$
BEGIN
  RETURN QUERY
  WITH domain_saves AS (
    SELECT b.domain, COUNT(*) as saves,
      MODE() WITHIN GROUP (ORDER BY b.category) as category
    FROM bookmarks b
    WHERE b.domain IS NOT NULL
    GROUP BY b.domain
    HAVING COUNT(*) >= 2
  ),
  domain_topics AS (
    SELECT b.domain, t.name, COUNT(*) as cnt
    FROM bookmarks b
    JOIN bookmark_tags bt ON b.id = bt.bookmark_id
    JOIN tags t ON bt.tag_id = t.id
    WHERE b.domain IS NOT NULL
    GROUP BY b.domain, t.name
  ),
  ranked AS (
    SELECT dt.domain, ARRAY_AGG(dt.name ORDER BY dt.cnt DESC) as topics
    FROM domain_topics dt
    GROUP BY dt.domain
  )
  SELECT ds.domain, ds.saves::BIGINT, ds.category,
    COALESCE(r.topics[1:10], ARRAY[]::TEXT[])
  FROM domain_saves ds
  LEFT JOIN ranked r ON ds.domain = r.domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Aggregation function: path patterns (segment → topics)
-- ============================================================
CREATE OR REPLACE FUNCTION aggregate_path_patterns()
RETURNS TABLE(domain TEXT, path_segment TEXT, topics TEXT[], sample_count BIGINT)
AS $$
BEGIN
  RETURN QUERY
  WITH extracts AS (
    SELECT b.domain, extract_path_segment(b.url) as seg, t.name as topic
    FROM bookmarks b
    JOIN bookmark_tags bt ON b.id = bt.bookmark_id
    JOIN tags t ON bt.tag_id = t.id
    WHERE b.domain IS NOT NULL
      AND extract_path_segment(b.url) IS NOT NULL
  ),
  seg_topics AS (
    SELECT e.domain, e.seg, e.topic, COUNT(*) as occ
    FROM extracts e
    GROUP BY e.domain, e.seg, e.topic
    HAVING COUNT(*) >= 2
  )
  SELECT st.domain, st.seg,
    ARRAY_AGG(st.topic ORDER BY st.occ DESC)[1:5] as topics,
    SUM(st.occ)::BIGINT as sample_count
  FROM seg_topics st
  GROUP BY st.domain, st.seg
  HAVING SUM(st.occ) >= 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
