-- ============================================================
-- Nest: Collections, Sharing & Collaboration
-- ============================================================

-- 1. Create all tables first
-- ============================================================

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  cover_url TEXT,
  bookmark_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_user_collection_name UNIQUE (user_id, name)
);

CREATE TABLE collection_bookmarks (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  sort_order INTEGER DEFAULT 0,

  PRIMARY KEY (collection_id, bookmark_id)
);

CREATE TABLE collection_members (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  invited_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (collection_id, user_id)
);

-- 2. Enable RLS
-- ============================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;

-- 3. Collections policies
-- ============================================================

CREATE POLICY "Users can read own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Members can read shared collections"
  ON collections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_members.collection_id = collections.id
        AND collection_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read public collections"
  ON collections FOR SELECT
  USING (is_public = true);

-- 4. Collection-Bookmarks policies
-- ============================================================

CREATE POLICY "Owner can read collection_bookmarks"
  ON collection_bookmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_bookmarks.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert collection_bookmarks"
  ON collection_bookmarks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_bookmarks.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete collection_bookmarks"
  ON collection_bookmarks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_bookmarks.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can read collection_bookmarks"
  ON collection_bookmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_members.collection_id = collection_bookmarks.collection_id
        AND collection_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can insert collection_bookmarks"
  ON collection_bookmarks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_members.collection_id = collection_bookmarks.collection_id
        AND collection_members.user_id = auth.uid()
        AND collection_members.role = 'editor'
    )
  );

CREATE POLICY "Editors can delete collection_bookmarks"
  ON collection_bookmarks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collection_members
      WHERE collection_members.collection_id = collection_bookmarks.collection_id
        AND collection_members.user_id = auth.uid()
        AND collection_members.role = 'editor'
    )
  );

CREATE POLICY "Anyone can read public collection_bookmarks"
  ON collection_bookmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_bookmarks.collection_id
        AND collections.is_public = true
    )
  );

-- 5. Collection-Members policies
-- ============================================================

CREATE POLICY "Owner can read collection_members"
  ON collection_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_members.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert collection_members"
  ON collection_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_members.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update collection_members"
  ON collection_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_members.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete collection_members"
  ON collection_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_members.collection_id
        AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can read own membership"
  ON collection_members FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Indexes
-- ============================================================

CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_slug ON collections(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_collection_bookmarks_bookmark ON collection_bookmarks(bookmark_id);
CREATE INDEX idx_collection_members_user ON collection_members(user_id);

-- 7. Triggers
-- ============================================================

CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_collection_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET bookmark_count = bookmark_count + 1
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET bookmark_count = bookmark_count - 1
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collection_bookmarks_count
  AFTER INSERT OR DELETE ON collection_bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_collection_bookmark_count();

-- 8. Helper function: generate slug
-- ============================================================

CREATE OR REPLACE FUNCTION generate_collection_slug(
  collection_name TEXT,
  owner_id UUID
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(trim(collection_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');

  IF length(base_slug) > 60 THEN
    base_slug := left(base_slug, 60);
    base_slug := regexp_replace(base_slug, '-+$', '', 'g');
  END IF;

  IF base_slug = '' THEN
    base_slug := 'collection';
  END IF;

  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM collections WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
