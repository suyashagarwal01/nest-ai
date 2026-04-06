# Nest

Smart bookmarking with AI-powered tagging. Save any webpage with one click from the Chrome extension, get an automatic screenshot and intelligent tags, and browse your collection from the web dashboard.

## Features

- **One-click save** — Chrome extension captures the page, takes a screenshot, and extracts metadata
- **AI tagging** — 3-tier system: local domain rules, Chrome built-in AI, and Groq LLM fallback
- **Screenshot cards** — Visual bookmark grid with masonry layout
- **Full-text search** — Postgres-powered search across titles, descriptions, and notes
- **Collections** — Organize bookmarks into public or private collections
- **Detail side sheet** — Click any bookmark to view/edit title, tags, notes, and see the full screenshot
- **Cross-device sync** — Everything stored in Supabase, accessible from any browser

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chrome Extension | Manifest V3 (TypeScript) |
| Web Dashboard | Next.js 15 (App Router) |
| Backend / DB | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Auth | Supabase Auth (Google sign-in + email/password) |
| AI Tagging | Groq (llama-3.1-8b-instant) |
| Hosting | Vercel |

## Project Structure

```
nest-ai/
├── extension/           # Chrome extension (Manifest V3)
│   ├── src/
│   │   ├── popup/       # Extension popup UI
│   │   ├── background/  # Service worker (screenshot, sync, tagging)
│   │   ├── content/     # Content script (meta extraction)
│   │   └── lib/         # Shared utils (Supabase client, domain map, tagging)
│   └── manifest.json
├── web/                 # Next.js dashboard
│   ├── src/
│   │   ├── app/         # App Router pages
│   │   ├── components/  # React components
│   │   │   └── ui/      # Shared primitives (Button, SideSheet, Logo, etc.)
│   │   └── lib/         # Supabase client, hooks, utils
│   └── public/
├── supabase/            # Supabase config
│   ├── migrations/      # SQL migrations (schema, RLS, indexes)
│   └── functions/       # Edge Functions (AI tagging)
└── docs/                # Product docs & planning
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) project (free tier works)

### Web Dashboard

```bash
cd web
cp .env.local.example .env.local   # Add your Supabase URL and anon key
npm install
npm run dev
```

### Chrome Extension

```bash
cd extension
npm install
npm run build
```

Then load `extension/dist` as an unpacked extension in `chrome://extensions`.

### Supabase

```bash
npx supabase db push           # Apply migrations
npx supabase functions deploy gemini-tagger --no-verify-jwt
```

## Design System

The web dashboard uses a token-based design system defined in `web/src/app/globals.css`. All colors, typography, spacing, radii, and shadows are CSS custom properties — no hardcoded values.

Key UI components: `Button` (primary, secondary, ghost, google, brand), `SideSheet`, `ConfirmDialog`, `Logo`, `Toast`, `SearchBar`, `CategoryTabs`.

## Constraints

Built on a $0 budget using free tiers: Supabase (500 MB DB, 1 GB storage), Vercel (100 GB bandwidth), Groq (14,400 requests/day).

## License

Private project.
