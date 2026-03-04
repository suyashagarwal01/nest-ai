# PRD: inSpace — Smart Bookmarking Chrome Extension

**Version:** 1.4
**Author:** Product Lead
**Date:** March 4, 2026
**Status:** Active — Phase 2 Complete

---

## 1. Problem Statement

People save dozens of links daily — articles, tools, references, inspiration — across bookmarks, notes apps, Slack messages, and browser tabs. The result is digital chaos:

- Browser bookmarks are flat, unsearchable, and device-bound (sync is unreliable and unstructured).
- There's no visual context — you forget *why* you saved something.
- Manual tagging/organizing is friction nobody maintains.
- No single place to search across everything you've saved.

**inSpace** solves this by turning every save into a rich, AI-tagged, searchable card — with a screenshot for visual recall — accessible from any device.

---

## 2. Product Vision

> A personal web archive that captures, tags, and organizes everything you save — effortlessly.

**One-liner:** Save any webpage with one click, get AI-powered tags and a screenshot, and access your collection from anywhere.

---

## 3. Target Users

### Phase 1 (Launch)
- **Researchers & students** who save dozens of references weekly.
- **Developers** who bookmark tools, docs, and Stack Overflow answers.
- **Designers** collecting inspiration across the web.
- **Content creators** curating sources and references.

### Phase 2+ (Growth)
- Teams sharing curated collections.
- Knowledge workers building personal knowledge bases.

### User Persona — "Suyash, 26, Software Developer"
Saves 5-15 links per day across work and personal browsing. Uses browser bookmarks, a notes app, and Slack "save for later." Can never find anything when needed. Wants something that just *works* without manual organization.

---

## 4. Goals & Success Metrics

| Goal | Metric | Target (90 days) |
|------|--------|-------------------|
| Adoption | Chrome Web Store installs | 500 |
| Activation | Users who save ≥3 items in first week | 60% of installs |
| Retention | WAU / MAU ratio | ≥ 40% |
| Engagement | Avg saves per active user per week | ≥ 5 |
| Search utility | % of sessions that include a search | ≥ 30% |

---

## 5. Core Features — Phase 1 (MVP)

### 5.1 One-Click Save (Chrome Extension Popup)

**What:** User clicks the extension icon (or uses keyboard shortcut) → popup appears with:
- Page title (editable)
- URL (auto-filled)
- Screenshot toggle (on by default)
- Optional note field
- Save button

**Behavior:**
- Screenshot captures the current visible viewport using Chrome's `chrome.tabs.captureVisibleTab` API.
- Save is instant — data ships to backend asynchronously.
- Badge on extension icon confirms save with a brief checkmark animation.
- Duplicate URL detection: if URL is already saved, show "Already saved — update?" prompt.

**Keyboard shortcut:** `Ctrl+Shift+S` (configurable).

### 5.2 AI Auto-Tagging

**What:** Every saved item is automatically tagged based on:
1. **Domain-based categorization** — e.g., `github.com` → `Development`, `dribbble.com` → `Design`, `arxiv.org` → `Research`.
2. **Page metadata extraction** — `<meta>` tags, Open Graph data, `<title>`, and `<h1>` content.
3. **AI-generated tags** — An LLM analyzes the title + description + domain to produce 2-5 semantic tags.

**Tagging strategy (zero-cost, 3-layer taxonomy):**

Every bookmark is tagged with a **Category** (e.g. "Development") + **Domain Context** (e.g. "GitHub — Code Hosting") + **Topics** (e.g. ["react", "hooks", "performance"]).

- **Tier 1 — Rule-based (instant, free):** A curated domain→category map (~160 domains) + path-based overrides + JSON-LD detection + keyword extraction from title/meta/headings. Runs client-side, covers ~80% of saves.
- **Tier 2 — On-device AI (free):** Use Chrome's built-in AI APIs (`chrome.ai` / Prompt API) if available, or a lightweight classifier model via TensorFlow.js / ONNX Runtime Web. Runs entirely in the browser.
- **Tier 3 — Free-tier LLM API (fallback):** For items that Tier 1 & 2 can't confidently tag, batch them and process via a free-tier API (Google Gemini free tier: 15 RPM / 1M tokens per day — more than sufficient for tagging).

**Intelligence layers (learned from aggregate behavior):**
- **Domain Intelligence:** Learns default categories, common topics, and path patterns from aggregate saves per domain. Refreshed daily via Edge Function.
- **Collective Intelligence:** Cross-user consensus tags auto-surface when 3+ eligible users tag the same URL similarly. Title keyword patterns propagate tags across domains. A feedback loop (remove/accept signals) adjusts tag quality over time. Tag aliases normalize variant spellings (e.g. "ML" → "machine-learning").

**Tag output example:**
```
URL: https://github.com/anthropics/claude-code
Category: Development
Domain Context: GitHub — Code Hosting
Topics: [ai, cli, tools, open-source]              ← Tier 1 (local)
Community: [developer-tools, anthropic]              ← Collective consensus (blue)
```

Users can edit, remove, or add tags manually. Removed community tags feed into the feedback loop to improve future suggestions.

### 5.3 Web Dashboard (Cross-Device Access)

**What:** A responsive web app where users can browse, search, edit, and delete their entire collection.

**Views:**
- **Grid view (default):** Card layout showing screenshot thumbnail, title, tags, domain favicon, and save date.
- **List view:** Compact table — title, URL, tags, date.
- **Grouped view:** Items grouped by AI-assigned category.

**Features:**
- **Search:** Full-text search across title, URL, tags, and notes. Instant filtering.
- **Filter by tag/category:** Click any tag to filter. Multi-tag filtering with AND/OR toggle.
- **Sort:** By date saved (default), title (A-Z), domain.
- **Edit:** Inline edit title, tags, notes. Click to expand card for full edit.
- **Delete:** Single delete with undo toast (5s). Bulk delete via multi-select.
- **Pagination / infinite scroll:** Load 20 items at a time.

**URL:** Hosted as a static site (e.g., `inspace.vercel.app`).

### 5.4 Authentication & Sync

**What:** User accounts so saves sync across devices.

**Approach (zero-cost):**
- **Auth:** Firebase Authentication (free tier: unlimited users for email/password + Google sign-in). Or Supabase Auth (free tier: 50,000 MAU).
- **Login flow:** User signs up / logs in via the web dashboard. Extension detects auth state via shared token (stored in `chrome.storage.sync`).
- **Sync:** All saves write to a cloud database. Extension and web dashboard read from the same source of truth.

### 5.5 Data Storage

**Architecture (zero-cost):**

| Layer | Solution | Free Tier |
|-------|----------|-----------|
| Database | Supabase (Postgres) | 500 MB database, 1 GB file storage, 50K MAU |
| Screenshot storage | Supabase Storage (or Cloudflare R2) | Supabase: 1 GB / R2: 10 GB |
| Hosting (web dashboard) | Vercel | 100 GB bandwidth, serverless functions |
| Auth | Supabase Auth | 50,000 MAU |

**Screenshot optimization:**
- Capture as JPEG at 70% quality (not PNG) — reduces size by ~5x.
- Resize to max 1280px width before upload.
- Generate a 200px-wide thumbnail for grid view; load full image on click.
- Average screenshot: ~80-150 KB after optimization.
- At 1 GB storage: ~7,000-12,000 screenshots before hitting the free tier limit.

---

## 6. User Flows

### 6.1 First-Time User
```
Install extension → Extension popup prompts "Sign in to sync across devices"
→ Opens web dashboard login page → Sign up with Google (one click)
→ Token stored in extension → Popup says "Ready! Save your first page."
→ User clicks Save → Card appears in dashboard instantly.
```

### 6.2 Saving a Page
```
User is on any webpage → Clicks extension icon (or Ctrl+Shift+S)
→ Popup shows: title, URL, screenshot preview, tags (auto-generated)
→ User optionally edits title/tags, adds a note
→ Clicks "Save" → Popup closes with confirmation
→ Background: screenshot uploads, tags finalize, item appears in dashboard.
```

### 6.3 Finding a Saved Item
```
User opens web dashboard (or extension's "My Saves" link)
→ Sees grid of saved cards with screenshots
→ Types in search bar: "react hooks article"
→ Results filter instantly → Clicks card → Expands with full details + link to original page.
```

### 6.4 Managing Saves
```
User opens dashboard → Selects multiple items via checkbox
→ Bulk actions: delete, add tag, change category
→ Or: clicks single card → Edits title, tags, notes inline → Auto-saves.
```

---

## 7. Technical Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Chrome Extension                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────────────────┐│
│  │  Popup   │  │ Content  │  │     Background Worker        ││
│  │  (UI)    │  │ Script   │  │  - Screenshot capture        ││
│  │          │  │ (meta    │  │  - AI tagging (Tier 1-3)     ││
│  │ Tag      │  │ extract) │  │  - Collective intelligence   ││
│  │ preview  │  │          │  │  - Feedback recording        ││
│  │ + merge  │  │          │  │  - Tag alias normalization   ││
│  └─────────┘  └──────────┘  │  - Supabase sync             ││
│       │                      │  - Cache refresh (hourly)     ││
│       │ consensus fetch      └──────────────────────────────┘│
│       └──── async ─────────────────────┐                     │
└──────────────────────┬─────────────────┼─────────────────────┘
                       │ HTTPS           │
                       ▼                 ▼
┌──────────────────────────────────────────────────────────────┐
│                     Supabase (Backend)                         │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │   Auth   │  │     Postgres     │  │     Storage       │  │
│  │          │  │                  │  │  (Screenshots)    │  │
│  │ Google/  │  │  bookmarks       │  │                   │  │
│  │ Email    │  │  tags            │  │  JPEG images      │  │
│  │          │  │  bookmark_tags   │  │  Thumbnails       │  │
│  │          │  │  profiles        │  │                   │  │
│  │          │  │  domain_intel    │  │                   │  │
│  │          │  │  url_consensus   │  │                   │  │
│  │          │  │  keyword_patt    │  │                   │  │
│  │          │  │  tag_feedback    │  │                   │  │
│  │          │  │  tag_aliases     │  │                   │  │
│  └──────────┘  └──────────────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │             Edge Functions                            │    │
│  │  - Domain intelligence aggregation (daily cron)      │    │
│  │  - Collective intelligence aggregation (daily cron)  │    │
│  │  - Feedback-based confidence adjustments             │    │
│  │  - gemini-tagger (Gemini 2.5 Flash Lite, 14 RPM)     │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                       │
       ┌───────────────┤
       ▼               ▼
┌──────────────┐  ┌──────────────────────────────┐
│ GitHub       │  │ Web Dashboard (Vercel)         │
│ Actions      │  │ Next.js / React                │
│              │  │ - Grid/List/Group views         │
│ Daily cron   │  │ - Search & filter               │
│ → triggers   │  │ - Edit/Delete                   │
│ Edge Fn      │  │ - Responsive (mobile-friendly)  │
└──────────────┘  └──────────────────────────────┘
```

### Database Schema (Postgres via Supabase)

```sql
-- Users (managed by Supabase Auth, extended with profile)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
  save_count INTEGER DEFAULT 0,      -- refreshed daily; 10+ saves = eligible for consensus
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookmarks
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  note TEXT,
  screenshot_url TEXT,
  thumbnail_url TEXT,
  favicon_url TEXT,
  domain TEXT GENERATED ALWAYS AS (
    substring(url from 'https?://([^/]+)')
  ) STORED,
  domain_context TEXT,               -- e.g. "GitHub — Code Hosting"
  category TEXT,
  has_screenshot BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, url)
);

-- Tags (many-to-many)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE bookmark_tags (
  bookmark_id UUID REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'user',        -- user | ai_tier1 | ai_tier2 | ai_tier3 | collective
  confidence REAL DEFAULT 1.0,
  PRIMARY KEY (bookmark_id, tag_id)
);

-- Domain Intelligence (learned patterns per domain)
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

-- Collective Intelligence: consensus tags per URL
CREATE TABLE url_tag_consensus (
  url TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  user_count INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  frequency REAL DEFAULT 0,          -- ratio of users who applied this tag
  confidence REAL DEFAULT 0,         -- 0.6 (3 users) → 0.85 (10+ users)
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (url, tag_name)
);

-- Collective Intelligence: title keyword → tag correlations
CREATE TABLE keyword_tag_patterns (
  keyword TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  user_count INTEGER DEFAULT 0,
  adoption_rate REAL DEFAULT 0,
  confidence REAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (keyword, tag_name)
);

-- Tag Feedback: user signals on tag quality
CREATE TABLE tag_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  action TEXT CHECK (action IN ('remove', 'add', 'accept')),
  source TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tag Aliases: variant spellings → canonical form
CREATE TABLE tag_aliases (
  alias TEXT PRIMARY KEY,            -- e.g. "ml", "k8s", "js"
  canonical TEXT NOT NULL,           -- e.g. "machine-learning", "kubernetes", "javascript"
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Row Level Security (RLS)
```sql
-- Users can only access their own data
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own bookmarks"
  ON bookmarks FOR ALL
  USING (auth.uid() = user_id);

-- Collective intelligence tables: public read for authenticated users
-- (written by Edge Function via service role)
ALTER TABLE url_tag_consensus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON url_tag_consensus FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE keyword_tag_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON keyword_tag_patterns FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE tag_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read" ON tag_aliases FOR SELECT
  USING (auth.role() = 'authenticated');

-- Feedback: users insert/read own
ALTER TABLE tag_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert/read own" ON tag_feedback FOR ALL
  USING (auth.uid() = user_id);
```

---

## 8. AI Tagging — Deep Dive

### 8.1 Tier 1: Rule-Based (Client-Side, Instant) — Implemented

A domain→category map covering ~160 domains with structured metadata:

```javascript
const DOMAIN_MAP = {
  "github.com": { category: "Development", type: "code_hosting", label: "GitHub", defaultTopics: ["open-source"] },
  "stackoverflow.com": { category: "Development", type: "qa_forum", label: "Stack Overflow" },
  "arxiv.org": { category: "Research", type: "preprints", label: "arXiv" },
  "dribbble.com": { category: "Design", type: "portfolio", label: "Dribbble" },
  // ... ~160 domains
};
```

3-layer taxonomy output: **Category** + **Domain Context** + **Topics** (up to 5).

Tag sources (priority order): path patterns (learned) → article tags → meta keywords → intelligence common topics → domain defaults → title keywords → heading keywords.

**Expected coverage:** ~80% of saves get reasonable tags from Tier 1 alone.

### 8.2 Tier 2: Chrome Built-in AI (Client-Side, Free) — Implemented

Chrome's Prompt API (`self.ai.languageModel`) used when available:
```javascript
const session = await self.ai.languageModel.create({ systemPrompt: "..." });
const result = await session.prompt(`URL: ... Title: ... Description: ...`);
// Parses JSON response → { category, topics }
```

**Escalation threshold:** Tier 2 is invoked only when Tier 1 produces `category === "Other"`, `topics.length < 3`, or `confidence < 0.7`. Feature-detected at runtime — gracefully skipped on Chrome Stable or browsers without the Prompt API.

### 8.3 Tier 3: Gemini Free Tier (Server-Side, Real-Time) — Implemented

For saves where Tier 1+2 produce low-confidence results, the extension calls a Supabase Edge Function (`gemini-tagger`) which proxies to the Gemini API:

- **Model:** `gemini-2.5-flash-lite` (free tier, lowest latency)
- **Rate limit:** In-memory 14 RPM cap (under 15 RPM free limit), returns 429 if exceeded
- **Flow:** Extension → Edge Function → Gemini API → validated JSON → merged with Tier 1 tags
- **Async upgrade:** Tier 1 tags render immediately; upgraded tags replace them when Tier 2/3 returns (1-2s)

**AI Tagger Orchestrator** (`ai-tagger-orchestrator.ts`) coordinates all three tiers with a callback-based API:
1. Tier 1 runs synchronously → `onTier1()` callback renders tags instantly
2. If escalation needed → tries Tier 2 (Chrome AI) → `onUpgrade()` re-renders
3. If Tier 2 unavailable/failed → tries Tier 3 (Gemini) → `onUpgrade()` re-renders

**Merge strategy:** AI category replaces "Other" (keeps Tier 1 category otherwise). AI topics prepended, Tier 1 topics appended, deduplicated, capped at 5. Confidence boosted to ≥0.8.

### 8.4 Domain Intelligence (Learned Patterns) — Implemented

Aggregate behavior across all users teaches the system per-domain patterns:

- **Domain stats:** Most common category and top topics per domain (from 2+ saves).
- **Path patterns:** First URL path segment → topic correlations (e.g. `github.com/topics/` → relevant topic tags).
- Stored in `domain_intelligence` table, refreshed daily via Edge Function + GitHub Actions cron.
- Extension caches top 500 domains in `chrome.storage.local` (hourly refresh).

### 8.5 Collective Intelligence (Cross-User Consensus) — Implemented

The system learns from collective user behavior:

**URL Consensus Tags:**
- When 3+ eligible users (each with 10+ saves) bookmark the same URL, overlapping tags become "consensus tags."
- Consensus tags auto-surface for new users saving that URL (shown as blue dashed-border pills in the popup).
- Confidence scales from 0.6 (3 users) to 0.85 (10+ users), boosted for high frequency (≥80%).

**Keyword-Tag Patterns:**
- Title words (≥4 chars) are correlated with tags across users.
- When a keyword+tag pair appears in 3+ users with ≥50% adoption rate, it becomes a pattern.
- Patterns propagate tags across domains (e.g. "kubernetes" in title → "devops" tag, regardless of domain).

**Feedback Loop:**
- **Remove** a tag = -3 weight (strong negative signal).
- **Accept** a collective tag (save without removing) = +1 weight.
- **Add** a tag manually = +1 weight.
- Net feedback > +5 → boost consensus confidence. Net < -5 → reduce. Below 0.4 → delete.
- Feedback pruned after 90 days.

**Tag Aliases:**
- ~33 seed aliases normalize variant spellings: "ML" → "machine-learning", "k8s" → "kubernetes", "js" → "javascript".
- Applied at save time in both the extension and Edge Function.

**Anti-spam:**
- Only users with 10+ saves contribute to consensus (prevents new accounts from polluting).
- `profiles.save_count` refreshed daily by Edge Function.

**Data flow:**
```
Daily cron (GitHub Actions)
  → Edge Function
    → update_profile_save_counts()     — refresh reputation
    → aggregate_url_consensus()        — compute URL consensus
    → aggregate_keyword_patterns()     — compute keyword patterns
    → compute_feedback_adjustments()   — apply feedback signals
    → prune old feedback (>90 days)
```

---

## 9. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Save latency (popup to confirmation) | < 1 second (screenshot uploads async) |
| Dashboard load time | < 2 seconds (first contentful paint) |
| Search latency | < 200ms for up to 10K bookmarks |
| Extension size | < 2 MB (excluding optional ONNX model) |
| Offline support | Saves queue locally, sync when online |
| Data export | JSON and CSV export from dashboard |

---

## 10. Phased Roadmap

### Phase 1 — MVP (Weeks 1-4)
- [x] Chrome extension: save with screenshot, title, URL, note
- [x] Rule-based auto-tagging (domain map + keyword extraction)
- [x] 3-layer taxonomy: Category + Domain Context + Topics
- [x] Supabase backend: auth, database, screenshot storage
- [x] Web dashboard: grid view, search, edit, delete
- [x] Google sign-in
- [x] Keyboard shortcut to save

### AI Tagging Phase 1 — Structured Taxonomy (Complete)
- [x] Domain map (~160 domains) with structured metadata
- [x] Path-based category overrides
- [x] JSON-LD type detection
- [x] Multi-source keyword extraction (title, meta, headings, article tags)
- [x] Removable topic tags in popup UI

### AI Tagging Phase 2 — Domain Intelligence (Complete)
- [x] `domain_intelligence` table with learned domain/path patterns
- [x] SQL aggregation functions (`aggregate_domain_stats`, `aggregate_path_patterns`)
- [x] Edge Function for daily aggregation (GitHub Actions cron, 2am UTC)
- [x] Extension-side caching with hourly refresh
- [x] Path pattern matching for topic inference
- [x] Seed data for 155+ domains

### AI Tagging Phase 3 — Collective Intelligence (Complete)
- [x] URL consensus tags (cross-user agreement on same URL)
- [x] Keyword-tag patterns (title words → tags across domains)
- [x] Tag feedback loop (remove=-3, accept=+1, add=+1)
- [x] Tag alias normalization (~33 seed aliases)
- [x] Anti-spam: 10+ saves required to contribute to consensus
- [x] Blue dashed-border community tags in popup UI
- [x] Suggested tags (dimmed) for lower confidence
- [x] Feedback-based confidence adjustments in Edge Function
- [x] 90-day feedback pruning

### Phase 2 — Dashboard & Polish (Complete)
- [x] Full-text search with Postgres `tsvector`
- [x] List view and grouped view
- [x] Data export (JSON, CSV)
- [x] Duplicate detection with "Already saved — update?" prompt
- [x] Offline save queue with background sync (5-min alarm retry, badge count)
- [x] Chrome AI / Gemini-powered tagging (Tier 2 + 3)
- [ ] Bulk operations (delete, tag, re-categorize) — deferred to Phase 3

### Phase 3 — Scale & Sharing (Weeks 9-16)
- [ ] Public collections: share a curated set of bookmarks via link
- [ ] Collection folders / boards for manual organization
- [ ] Import from browser bookmarks, Pocket, Raindrop.io
- [ ] Firefox extension
- [ ] Safari extension (WebExtension API)
- [ ] Mobile-responsive PWA for the dashboard
- [ ] Collaborative collections (invite others to add/view)

### Phase 4 — Intelligence V2 (Future)
- [ ] Semantic search: "find that article about React performance I saved last month"
- [ ] Auto-summarization of saved pages (one-line summary on each card)
- [ ] Related/similar saves suggestions
- [ ] Daily/weekly digest email of your saves
- [ ] Browser history integration (retroactive save suggestions)
- [ ] API for third-party integrations

---

## 11. Zero-Budget Stack Summary

| Component | Tool | Cost |
|-----------|------|------|
| Extension | Chrome Extension (Manifest V3) | Free |
| Frontend (dashboard) | Next.js on Vercel | Free (hobby) |
| Auth | Supabase Auth | Free (50K MAU) |
| Database | Supabase Postgres | Free (500 MB) |
| File storage | Supabase Storage | Free (1 GB) |
| AI tagging (primary) | Client-side rules + Chrome AI | Free |
| AI tagging (fallback) | Google Gemini API | Free (1M tokens/day) |
| Serverless functions | Supabase Edge Functions / Vercel | Free |
| Domain | Vercel subdomain (inspace.vercel.app) | Free |
| Analytics | Vercel Analytics / Plausible (self-host) | Free |
| CI/CD | GitHub Actions | Free (2,000 min/month) |

**Total cost: $0/month** until hitting free tier limits (~10K users or ~12K screenshots).

### When to start paying (scaling triggers)
| Trigger | Threshold | Action |
|---------|-----------|--------|
| Storage > 1 GB | ~10K screenshots | Upgrade Supabase ($25/mo) or move to Cloudflare R2 (10 GB free) |
| Database > 500 MB | ~50K bookmarks | Upgrade Supabase |
| Users > 50K MAU | Significant traction | Evaluate monetization |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chrome AI API not available on user's browser | AI tagging degrades | Graceful fallback chain: Tier 1 → Tier 2 → Tier 3. Tier 1 alone covers 80%. |
| Screenshot storage fills up quickly | Saves fail or degrade | Aggressive JPEG compression + thumbnails. Offer "save without screenshot" toggle. Purge screenshots older than 6 months (keep metadata). |
| Supabase free tier limits hit | Service degrades | Monitor usage. Migrate to self-hosted Supabase or PlanetScale + Cloudflare R2 if needed. |
| Users don't return after installing | Low retention | Onboarding flow that makes first 3 saves effortless. Weekly email digest of saves. |
| Gemini free tier rate limits | Tagging delays | Batch processing + queue. Tier 1 handles most cases without Gemini. |
| Chrome extension policy changes | Extension removed | Follow Manifest V3 best practices strictly. Minimal permissions. |

---

## 13. Competitive Landscape

| Product | Strength | inSpace Differentiator |
|---------|----------|------------------------|
| Browser bookmarks | Built-in, zero friction | AI tagging, screenshots, cross-device dashboard |
| Pocket | Read-later, clean UI | Visual screenshots, AI tags (Pocket has no auto-tagging) |
| Raindrop.io | Collections, tags | Free tier is more generous; AI-first tagging |
| Are.na | Visual, creative community | More practical/utility focused; faster save flow |
| Notion Web Clipper | Rich capture | Lighter weight, purpose-built, faster |

**Our wedge:** The *simplest* save flow (one click) + *automatic* intelligence (AI tags) + *visual* recall (screenshots) — completely free.

---

## 14. Open Questions

1. **Should we capture full-page screenshots or just viewport?**
   Recommendation: Viewport only for MVP (simpler, smaller, faster). Full-page as Phase 2 option.

2. **Should tags be global or per-user?**
   Decision: Per-user. Avoids tag pollution. Collective intelligence (Phase 3) now surfaces "consensus tags" from aggregate cross-user data without sharing individual tags.

3. **How to handle sites that block screenshots (e.g., banking)?**
   Recommendation: Gracefully skip screenshot, save metadata only. Show a placeholder card.

4. **Should we support saving selected text / highlights?**
   Recommendation: Phase 2 feature. MVP focuses on page-level saves.

5. **Monetization strategy when costs appear?**
   Options: (a) Freemium — free up to 500 saves, then $3/mo. (b) Pro tier — unlimited saves + semantic search + collections for $5/mo. (c) Keep free, add team features as paid.

---

## 15. Success Definition

**inSpace Phase 1 is successful if:**
- 500+ installs in 90 days.
- Active users save ≥5 items/week on average.
- ≥ 70% of auto-generated tags are accepted without editing.
- Dashboard is used at least once per week by 40% of active users.
- Zero-cost infrastructure sustains the user base without degradation.

---

*This is a living document. Update as decisions are made and user feedback comes in.*
