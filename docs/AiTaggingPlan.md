# AI Tagging v2 — Product Strategy & Roadmap

## The Vision
Every bookmark is automatically enriched with structured intelligence: **what it is**, **what it's about**, and **why it matters** — with the system getting smarter with every save across the entire user base.

---

## Tag Taxonomy (Three Layers)

| Layer | What it captures | Examples |
|---|---|---|
| **Category** | Content type / format | Blog, Documentation, Tool, Research Paper, Video, News, Tutorial, Product, Forum Thread, API Reference |
| **Domain Context** | Source intelligence | "Medium blog", "GitHub repo", "ArXiv paper", "Hacker News discussion", "Substack newsletter" |
| **Topic Attributes** | Subject matter tags | n8n, automation, React, machine learning, startup fundraising, UX design |

Every save produces exactly **1 category**, **1 domain context**, and **1-5 topic attributes**. Users see them as a clean, grouped tag bar:

```
[Blog] [Medium] · n8n · automation · low-code
```

---

## Phase 1: Structured Taxonomy (Weeks 1-2)

### Goal
Upgrade from flat tags to the 3-layer taxonomy. Enrich content script to extract more signals. Update UI to display grouped tags.

### Changes
1. **Database migration**: Add `domain_context` to bookmarks, `source` + `confidence` to bookmark_tags
2. **Types**: Extend `PageMeta` (metaKeywords, articleTags, jsonLdType, headings), restructure `TagResult` (category, domainContext, topics, confidence), add `DomainInfo` interface
3. **Domain map**: Transform from flat `domain → category` to structured `domain → { category, type, label, defaultTopics }`, expand to ~200 domains, add URL path overrides
4. **Content script**: Extract `<meta name="keywords">`, `<meta property="article:tag">`, JSON-LD `@type`, h1/h2 headings
5. **Tagger**: Rewrite to use all signals — domain lookup, path override, JSON-LD override, topic extraction with priority (article:tag > metaKeywords > defaultTopics > title keywords > heading keywords)
6. **Service worker**: Store `domain_context`, tag `source` and `confidence`
7. **Extension UI**: Show `[Category] [Domain] · topic1 · topic2` grouped pills
8. **Web dashboard**: Update BookmarkCard to show grouped tag display

### Success Metrics
- Tags per save >= 3
- Category assigned on 100% of saves
- Domain context assigned on ~70% of saves (known domains)
- Save flow stays under 1 second

---

## Phase 2: Domain Intelligence (Weeks 3-4)

### Goal
Build a living knowledge graph about domains that grows from aggregate user data. Reduce dependence on the hardcoded domain map.

### Changes
1. **New table**: `domain_intelligence` — stores domain, domain_type, default_category, common_topics, path_patterns, save_count
2. **Seed data**: Pre-populate from the hardcoded domain map (~200 domains)
3. **Nightly aggregation**: Supabase cron job (pg_cron on free tier) that:
   - Counts saves per domain
   - Derives `common_topics` from most-frequent tags on that domain
   - Discovers `path_patterns` (e.g., medium.com/towards-data-science/* → "data-science")
4. **Tagger integration**: Before hitting hardcoded map, check `domain_intelligence` table (via cached Edge Function)
5. **Path pattern matching**: For known domains, use learned path patterns to enrich tags even for brand-new articles

### Key Insight
Path pattern matching is the most powerful signal. For `medium.com/towards-data-science/some-article`:
- Domain tells us: publishing platform / blog
- Path segment `towards-data-science` → "data science", "machine learning" from learned patterns
- This means even for brand-new articles, we get good tags without hitting the AI

### Success Metrics
- Domain intelligence coverage: 500+ domains within 4 weeks
- Auto-derived topic accuracy > 80%
- Reduced "Other" category rate from ~30% to <15%

---

## Phase 3: Collective Intelligence (Weeks 5-6)

### Goal
The system learns from aggregate user behavior. Tags that many users apply converge into "consensus tags" that auto-apply for new users.

### Changes

#### 3a. URL-level tag consensus
When 3+ users save the same URL:
- Compute tag frequency across all saves
- Tags on >60% of saves become "consensus tags"
- New users saving that URL get consensus tags auto-applied (marked as "community suggested")

#### 3b. Pattern-level tag propagation
More powerful — learns patterns across similar URLs:
- "Users who save `docs.stripe.com/*` tend to tag with `payments`, `api`, `fintech`"
- "Pages with `kubernetes` in the title across any domain get tagged `devops`, `infrastructure`"

#### 3c. Confidence scoring

| Source | Base Confidence |
|---|---|
| Tier 1 (domain map) | 0.9 |
| Tier 2 (Chrome AI) | 0.7 |
| Tier 3 (Gemini) | 0.85 |
| URL consensus (3+ users) | 0.6 |
| URL consensus (10+ users) | 0.85 |
| Pattern match (60%+ adoption) | 0.7 |
| Pattern match (80%+ adoption) | 0.9 |

Tags below 0.5 not shown. Tags 0.5-0.7 shown as "suggested" (dimmed). Tags >0.7 auto-applied.

#### 3d. Feedback loop
- User removes an auto-tag → negative signal (weighted 3x)
- User adds a custom tag → positive signal
- User accepts a suggestion → positive signal (1x)
- Feeds back into pattern engine nightly

### Anti-Spam Defenses
- Minimum user reputation: 10+ saves to contribute to collective intelligence
- Outlier detection: down-weight users with wildly different tags
- Tag normalization: "ML" = "machine-learning" = "Machine Learning"
- Rate limiting: max 20 unique tags per user per hour

### Success Metrics
- Tag suggestion accept rate > 50%
- Collective tag coverage: 40% of saves get community tags within 3 months
- User tag override rate < 20%

---

## Phase 4: Personal Learning + Polish (Weeks 7-8) — Core Complete

### Goal
Each user builds a personal tagging profile. The system adapts to their vocabulary and interests.

### Changes

#### 4a. Tag vocabulary learning — Implemented
- User removes auto-tag "ml" and adds "machine-learning" → system learns `{"ml": "machine-learning"}`
- Vocabulary stored as JSONB in `profiles.tag_vocabulary`
- Extension caches vocabulary in `chrome.storage.local` (1h TTL, hourly refresh via Chrome alarm)
- Applied after Tier 1 tagging: topics are mapped through user's vocabulary before saving
- Learning happens in service worker's `saveBookmark()` — detects removed/added tag pairs as renames
- Settings page on web dashboard provides manual CRUD editor for vocabulary rules

**Key files:**
- `extension/src/lib/user-preferences.ts` — cache, apply, learn vocabulary
- `web/src/components/tag-vocabulary-editor.tsx` — manual editor
- `web/src/app/settings/page.tsx` — Tag Preferences section

#### 4b. Interest-aware boosting — Implemented
- `profiles.interest_vector` stores top 50 tag frequency counts: `{"react": 15, "typescript": 12}`
- Computed daily by Edge Function (step 11 in `aggregate-domain-intelligence`) via `compute_interest_vectors()` SQL function
- During Tier 1 tagging: candidate topics scored with logarithmic interest boost, reordered before cap at 5
- Does NOT add new topics — only reorders existing candidates to prefer user's historical interests

**Key files:**
- `extension/src/lib/interest-vector.ts` — cache + boost scoring
- `supabase/migrations/008_user_preferences.sql` — schema + SQL function

#### 4c. Smart suggestions — Implemented
- **Tag cluster detection:** 3+ bookmarks saved in last 7 days share a tag → suggest "Create a [tag] collection?"
- **Large tag groups:** 15+ bookmarks with same tag, no matching collection → suggest creating one
- Max 3 suggestions shown, dismissible (stored in localStorage with weekly reset)
- Creating a collection from a suggestion auto-adds all matching bookmarks

**Key files:**
- `web/src/lib/suggestions.ts` — `computeSuggestions()` pure function
- `web/src/components/suggestion-banner.tsx` — dismissible banner with action button
- `web/src/app/page.tsx` — renders banners above bookmark grid

#### 4d. Dashboard enhancements — Not Yet Implemented
- [ ] "Tag health" view: coverage stats, most-used tags, tag trends over time
- [ ] Category breakdown pie chart
- [ ] Domain source analytics

### Success Metrics
- Vocabulary match rate > 90% (system uses user's preferred terms)
- Smart suggestion engagement > 30%
- Overall tagging satisfaction (measured by tag edit rate dropping below 10%)

---

## Zero-Budget Feasibility

| Component | Cost | How |
|---|---|---|
| Tier 1-2 tagging | $0 | Client-side JS + Chrome built-in AI |
| Tier 3 tagging | $0 | Gemini free (15 RPM, 1M tokens/day) |
| Domain intelligence | $0 | Supabase cron + materialized views on free tier |
| Collective patterns | $0 | SQL aggregation, no external service |
| Storage | Minimal | JSONB fields + one new table, well within 500MB |

The entire system runs on free tiers. The most powerful tagging comes from users, not models.

---

## Data Model Changes Summary

```sql
-- Phase 1
ALTER TABLE bookmarks ADD COLUMN domain_context TEXT;
ALTER TABLE bookmark_tags ADD COLUMN source TEXT DEFAULT 'ai_tier1';
ALTER TABLE bookmark_tags ADD COLUMN confidence FLOAT DEFAULT 1.0;

-- Phase 2
CREATE TABLE domain_intelligence (
  domain TEXT PRIMARY KEY,
  domain_type TEXT,
  default_category TEXT,
  common_topics TEXT[],
  path_patterns JSONB,
  save_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3
CREATE MATERIALIZED VIEW tag_patterns AS
SELECT domain, path_pattern, tag_name,
  COUNT(DISTINCT user_id) as user_count,
  COUNT(*) as apply_count
FROM bookmarks b
JOIN bookmark_tags bt ON b.id = bt.bookmark_id
JOIN tags t ON bt.tag_id = t.id
GROUP BY domain, path_pattern, tag_name
HAVING COUNT(DISTINCT user_id) >= 3;

-- Phase 4
ALTER TABLE profiles ADD COLUMN tag_vocabulary JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN interest_vector JSONB DEFAULT '{}';
```
