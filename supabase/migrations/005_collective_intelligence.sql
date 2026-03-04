-- ============================================================
-- Migration: Collective Intelligence — cross-user tag consensus
-- ============================================================

-- 0. Add save_count to profiles for anti-spam eligibility
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;


-- 1. URL Tag Consensus — precomputed per-URL consensus tags
-- ============================================================
CREATE TABLE url_tag_consensus (
  url TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  user_count INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  frequency REAL NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (url, tag_name)
);

ALTER TABLE url_tag_consensus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read consensus"
  ON url_tag_consensus FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_consensus_url ON url_tag_consensus(url);
CREATE INDEX idx_consensus_confidence ON url_tag_consensus(confidence DESC);


-- 2. Keyword Tag Patterns — domain-agnostic keyword → tag correlations
-- ============================================================
CREATE TABLE keyword_tag_patterns (
  keyword TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  user_count INTEGER NOT NULL DEFAULT 0,
  adoption_rate REAL NOT NULL DEFAULT 0,
  confidence REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (keyword, tag_name)
);

ALTER TABLE keyword_tag_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read keyword patterns"
  ON keyword_tag_patterns FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE INDEX idx_keyword_patterns_confidence ON keyword_tag_patterns(confidence DESC);


-- 3. Tag Feedback — user signals on tag quality
-- ============================================================
CREATE TABLE tag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('remove', 'add', 'accept')),
  source TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tag_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON tag_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback"
  ON tag_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_feedback_url_tag ON tag_feedback(url, tag_name);
CREATE INDEX idx_feedback_created ON tag_feedback(created_at DESC);


-- 4. Tag Aliases — variant spellings → canonical form
-- ============================================================
CREATE TABLE tag_aliases (
  alias TEXT PRIMARY KEY,
  canonical TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tag_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read aliases"
  ON tag_aliases FOR SELECT
  USING (auth.role() = 'authenticated');

-- Seed ~30 common aliases
INSERT INTO tag_aliases (alias, canonical) VALUES
  ('ml', 'machine-learning'),
  ('ai', 'artificial-intelligence'),
  ('dl', 'deep-learning'),
  ('nlp', 'natural-language-processing'),
  ('cv', 'computer-vision'),
  ('k8s', 'kubernetes'),
  ('k8', 'kubernetes'),
  ('js', 'javascript'),
  ('ts', 'typescript'),
  ('py', 'python'),
  ('rb', 'ruby'),
  ('go', 'golang'),
  ('rs', 'rust'),
  ('cpp', 'c++'),
  ('csharp', 'c#'),
  ('dotnet', '.net'),
  ('tf', 'terraform'),
  ('gha', 'github-actions'),
  ('ci/cd', 'ci-cd'),
  ('devops', 'dev-ops'),
  ('ux', 'user-experience'),
  ('ui', 'user-interface'),
  ('dx', 'developer-experience'),
  ('api', 'apis'),
  ('db', 'database'),
  ('sql', 'databases'),
  ('nosql', 'databases'),
  ('react.js', 'react'),
  ('reactjs', 'react'),
  ('vue.js', 'vue'),
  ('vuejs', 'vue'),
  ('next.js', 'nextjs'),
  ('node.js', 'nodejs')
ON CONFLICT (alias) DO NOTHING;


-- 5. SQL Functions (SECURITY DEFINER — called by Edge Function)
-- ============================================================

-- 5a. Refresh profile save counts from bookmark counts
CREATE OR REPLACE FUNCTION update_profile_save_counts()
RETURNS TABLE(profiles_updated BIGINT)
AS $$
BEGIN
  RETURN QUERY
  WITH counts AS (
    SELECT b.user_id, COUNT(*)::INTEGER as cnt
    FROM bookmarks b
    GROUP BY b.user_id
  )
  UPDATE profiles p
  SET save_count = c.cnt
  FROM counts c
  WHERE p.id = c.user_id
    AND p.save_count IS DISTINCT FROM c.cnt
  RETURNING 1::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5b. Aggregate URL consensus: distinct eligible users per URL per tag
CREATE OR REPLACE FUNCTION aggregate_url_consensus()
RETURNS TABLE(
  url TEXT,
  tag_name TEXT,
  user_count BIGINT,
  total_saves BIGINT,
  frequency REAL
)
AS $$
BEGIN
  RETURN QUERY
  WITH eligible_users AS (
    SELECT p.id as user_id
    FROM profiles p
    WHERE p.save_count >= 10
  ),
  url_savers AS (
    SELECT b.url, COUNT(DISTINCT b.user_id) as distinct_savers
    FROM bookmarks b
    WHERE b.user_id IN (SELECT user_id FROM eligible_users)
    GROUP BY b.url
    HAVING COUNT(DISTINCT b.user_id) >= 3
  ),
  url_tag_counts AS (
    SELECT
      b.url,
      t.name as tag_name,
      COUNT(DISTINCT b.user_id) as user_count,
      COUNT(*) as total_saves
    FROM bookmarks b
    JOIN bookmark_tags bt ON b.id = bt.bookmark_id
    JOIN tags t ON bt.tag_id = t.id
    WHERE b.user_id IN (SELECT user_id FROM eligible_users)
      AND b.url IN (SELECT us.url FROM url_savers us)
    GROUP BY b.url, t.name
  )
  SELECT
    utc.url,
    utc.tag_name,
    utc.user_count,
    utc.total_saves,
    (utc.user_count::REAL / us.distinct_savers::REAL) as frequency
  FROM url_tag_counts utc
  JOIN url_savers us ON utc.url = us.url
  WHERE (utc.user_count::REAL / us.distinct_savers::REAL) >= 0.6;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5c. Aggregate keyword-tag patterns across users
CREATE OR REPLACE FUNCTION aggregate_keyword_patterns()
RETURNS TABLE(
  keyword TEXT,
  tag_name TEXT,
  user_count BIGINT,
  adoption_rate REAL
)
AS $$
BEGIN
  RETURN QUERY
  WITH eligible_users AS (
    SELECT p.id as user_id
    FROM profiles p
    WHERE p.save_count >= 10
  ),
  title_words AS (
    SELECT
      b.user_id,
      b.id as bookmark_id,
      lower(unnest(string_to_array(
        regexp_replace(b.title, '[^a-zA-Z0-9\s-]', ' ', 'g'),
        ' '
      ))) as word
    FROM bookmarks b
    WHERE b.user_id IN (SELECT user_id FROM eligible_users)
      AND b.title IS NOT NULL
  ),
  word_tag_pairs AS (
    SELECT
      tw.word as keyword,
      t.name as tag_name,
      tw.user_id
    FROM title_words tw
    JOIN bookmark_tags bt ON tw.bookmark_id = bt.bookmark_id
    JOIN tags t ON bt.tag_id = t.id
    WHERE length(tw.word) >= 4
      AND tw.word != t.name
  ),
  keyword_user_counts AS (
    SELECT wtp.keyword, COUNT(DISTINCT wtp.user_id) as total_users
    FROM word_tag_pairs wtp
    GROUP BY wtp.keyword
    HAVING COUNT(DISTINCT wtp.user_id) >= 3
  ),
  keyword_tag_user_counts AS (
    SELECT
      wtp.keyword,
      wtp.tag_name,
      COUNT(DISTINCT wtp.user_id) as tag_users
    FROM word_tag_pairs wtp
    WHERE wtp.keyword IN (SELECT kuc.keyword FROM keyword_user_counts kuc)
    GROUP BY wtp.keyword, wtp.tag_name
  )
  SELECT
    ktuc.keyword,
    ktuc.tag_name,
    ktuc.tag_users,
    (ktuc.tag_users::REAL / kuc.total_users::REAL) as adoption_rate
  FROM keyword_tag_user_counts ktuc
  JOIN keyword_user_counts kuc ON ktuc.keyword = kuc.keyword
  WHERE (ktuc.tag_users::REAL / kuc.total_users::REAL) >= 0.5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5d. Compute feedback adjustments (net scores per URL+tag)
CREATE OR REPLACE FUNCTION compute_feedback_adjustments()
RETURNS TABLE(
  url TEXT,
  tag_name TEXT,
  net_score REAL
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tf.url,
    tf.tag_name,
    SUM(
      CASE tf.action
        WHEN 'remove' THEN -3.0
        WHEN 'add' THEN 1.0
        WHEN 'accept' THEN 1.0
        ELSE 0.0
      END
    )::REAL as net_score
  FROM tag_feedback tf
  WHERE tf.created_at >= now() - interval '30 days'
  GROUP BY tf.url, tf.tag_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
