# PRD: inSpace — Smart Bookmarking Chrome Extension

**Version:** 1.0
**Author:** Product Lead
**Date:** March 2, 2026
**Status:** Draft

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

**Tagging strategy (zero-cost approach):**
- **Tier 1 — Rule-based (instant, free):** A curated domain→category map (top 500 domains) + keyword extraction from title/meta. Runs client-side, covers ~80% of saves.
- **Tier 2 — On-device AI (free):** Use Chrome's built-in AI APIs (`chrome.ai` / Prompt API) if available, or a lightweight classifier model via TensorFlow.js / ONNX Runtime Web. Runs entirely in the browser.
- **Tier 3 — Free-tier LLM API (fallback):** For items that Tier 1 & 2 can't confidently tag, batch them and process via a free-tier API (Google Gemini free tier: 15 RPM / 1M tokens per day — more than sufficient for tagging).

**Tag output example:**
```
URL: https://github.com/anthropics/claude-code
Tags: [Development, AI, CLI, Tools, Open Source]
Category: Development
```

Users can edit, remove, or add tags manually.

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
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  Popup   │  │ Content  │  │   Background Worker    │ │
│  │  (UI)    │  │ Script   │  │  - Screenshot capture  │ │
│  │          │  │ (meta    │  │  - AI tagging (Tier 1) │ │
│  │          │  │ extract) │  │  - Supabase sync       │ │
│  └─────────┘  └──────────┘  └────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase (Backend)                       │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │   Auth   │  │   Postgres   │  │     Storage       │ │
│  │          │  │   Database   │  │  (Screenshots)    │ │
│  │ Google/  │  │              │  │                   │ │
│  │ Email    │  │  bookmarks   │  │  JPEG images      │ │
│  │          │  │  tags        │  │  Thumbnails       │ │
│  │          │  │  categories  │  │                   │ │
│  └──────────┘  └──────────────┘  └───────────────────┘ │
│  ┌──────────────────────────────────────────────────┐   │
│  │          Edge Functions (Optional)                │   │
│  │  - AI tagging fallback (Gemini API call)         │   │
│  │  - OG image fallback fetch                       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Web Dashboard (Vercel)                       │
│  Next.js / React static site                             │
│  - Grid/List/Group views                                 │
│  - Search & filter                                       │
│  - Edit/Delete                                           │
│  - Responsive (mobile-friendly)                          │
└─────────────────────────────────────────────────────────┘
```

### Database Schema (Postgres via Supabase)

```sql
-- Users (managed by Supabase Auth, extended with profile)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  avatar_url TEXT,
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
  PRIMARY KEY (bookmark_id, tag_id)
);

-- Indexes for search performance
CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_domain ON bookmarks(domain);
CREATE INDEX idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX idx_bookmarks_search ON bookmarks
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(note,'')));
```

### Row Level Security (RLS)
```sql
-- Users can only access their own data
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own bookmarks"
  ON bookmarks FOR ALL
  USING (auth.uid() = user_id);
```

---

## 8. AI Tagging — Deep Dive

### Tier 1: Rule-Based (Client-Side, Instant)

A domain→category map covering the top 500 domains:

```javascript
const DOMAIN_CATEGORIES = {
  "github.com": "Development",
  "stackoverflow.com": "Development",
  "npmjs.com": "Development",
  "medium.com": "Articles",
  "dev.to": "Development",
  "arxiv.org": "Research",
  "dribbble.com": "Design",
  "figma.com": "Design",
  "youtube.com": "Video",
  "twitter.com": "Social",
  "docs.google.com": "Documents",
  // ... 490 more
};
```

Plus keyword extraction from the page title for generating tags:
- Split title into words, remove stop words, take top 3-5 meaningful terms.
- Match against a curated keyword→tag dictionary.

**Expected coverage:** ~80% of saves get reasonable tags from Tier 1 alone.

### Tier 2: Chrome Built-in AI (Client-Side, Free)

Chrome's Prompt API (origin trial / shipping progressively):
```javascript
const session = await chrome.ai.languageModel.create();
const result = await session.prompt(
  `Classify this webpage and generate 3-5 tags.
   Title: "${title}"
   Description: "${description}"
   Domain: "${domain}"
   Return JSON: { "category": "...", "tags": ["...", "..."] }`
);
```

Fallback: A small ONNX text classification model (~5 MB) loaded via Transformers.js, classifying into predefined categories.

### Tier 3: Gemini Free Tier (Server-Side, Batched)

For saves where Tier 1+2 produce low-confidence results:
- Queue untagged items.
- Process in batches via Supabase Edge Function calling Gemini API.
- Free tier: 15 requests/min, 1M tokens/day — handles hundreds of tag requests daily.

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
- [ ] Chrome extension: save with screenshot, title, URL, note
- [ ] Rule-based auto-tagging (domain map + keyword extraction)
- [ ] Supabase backend: auth, database, screenshot storage
- [ ] Web dashboard: grid view, search, edit, delete
- [ ] Google sign-in
- [ ] Keyboard shortcut to save

### Phase 2 — Intelligence (Weeks 5-8)
- [ ] Chrome AI / Gemini-powered tagging
- [ ] Full-text search with Postgres `tsvector`
- [ ] List view and grouped view
- [ ] Bulk operations (delete, tag, re-categorize)
- [ ] Duplicate detection and merge
- [ ] Data export (JSON, CSV)
- [ ] Offline save queue with background sync

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
   Recommendation: Per-user. Avoids tag pollution. Can surface "popular tags" later from aggregate data.

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
