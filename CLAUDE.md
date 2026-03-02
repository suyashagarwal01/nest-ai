# inSpace — Project Context

## What is this?
A Chrome extension + web dashboard for smart bookmarking. Users save any webpage with one click, get an AI-tagged screenshot card, and access their collection from any device.

## Product docs
- PRD: `docs/PRD.md` — full product requirements, user flows, roadmap, and architecture diagrams.

## Tech Stack (Zero-Budget)
- **Chrome Extension:** Manifest V3 (popup + content script + service worker)
- **Web Dashboard:** Next.js (App Router) on Vercel
- **Backend/DB:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Auth:** Supabase Auth (Google sign-in + email/password)
- **Screenshot Storage:** Supabase Storage (JPEG, 70% quality, max 1280px width, 200px thumbnails)
- **AI Tagging:** 3-tier — (1) client-side domain map + keyword extraction, (2) Chrome built-in AI, (3) Gemini free tier fallback
- **CI/CD:** GitHub Actions

## Project Structure (Planned)
```
inSpace v2/
├── CLAUDE.md
├── docs/
│   └── PRD.md
├── extension/           # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── popup/           # Extension popup UI
│   ├── background/      # Service worker (screenshot, sync, tagging)
│   ├── content/         # Content script (meta extraction)
│   └── lib/             # Shared utils (Supabase client, domain map, tagging)
├── web/                 # Next.js dashboard
│   ├── app/             # App Router pages
│   ├── components/      # React components
│   ├── lib/             # Supabase client, hooks, utils
│   └── public/
└── supabase/            # Supabase config
    ├── migrations/      # SQL migrations (schema, RLS, indexes)
    └── functions/       # Edge Functions (Gemini tagging fallback)
```

## Key Architecture Decisions
- Supabase Row Level Security (RLS) enforces per-user data isolation — no custom auth middleware needed.
- Screenshots upload async after save confirmation — keeps the save flow under 1s.
- Tags are per-user, not global. Many-to-many via `bookmark_tags` junction table.
- Duplicate detection is on `(user_id, url)` unique constraint.
- Full-text search uses Postgres `tsvector` with GIN index on title + description + note.

## Database Tables
- `profiles` — extends Supabase auth.users
- `bookmarks` — url, title, description, note, screenshot_url, thumbnail_url, favicon_url, domain (generated), category
- `tags` — per-user tag names
- `bookmark_tags` — many-to-many junction

## Coding Conventions
- TypeScript everywhere (extension + web dashboard).
- Use `@supabase/supabase-js` client library for all backend interactions.
- Extension uses Chrome's `chrome.tabs.captureVisibleTab` for screenshots.
- Keep extension bundle under 2 MB.
- Prefer server components in Next.js; use client components only when interactivity is needed.
- All Supabase queries go through typed client — generate types with `supabase gen types typescript`.

## Current Phase
Phase 1 — MVP. See `docs/PRD.md` section 10 for the full roadmap.

## Constraints
- $0 budget. Everything must run on free tiers.
- Supabase free: 500 MB DB, 1 GB storage, 50K MAU.
- Vercel free: 100 GB bandwidth.
- Gemini free: 15 RPM, 1M tokens/day.
