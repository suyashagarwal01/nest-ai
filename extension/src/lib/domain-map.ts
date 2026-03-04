/**
 * Tier 1 AI tagging: structured domain → category mapping.
 * Returns DomainInfo with category, type, label, and optional default topics.
 */

import type { DomainInfo } from "./types";

const DOMAIN_MAP: Record<string, DomainInfo> = {
  // Development
  "github.com": { category: "Development", type: "platform", label: "GitHub", defaultTopics: ["open-source"] },
  "gitlab.com": { category: "Development", type: "platform", label: "GitLab", defaultTopics: ["open-source"] },
  "bitbucket.org": { category: "Development", type: "platform", label: "Bitbucket" },
  "stackoverflow.com": { category: "Development", type: "qa", label: "Stack Overflow" },
  "stackexchange.com": { category: "Development", type: "qa", label: "Stack Exchange" },
  "npmjs.com": { category: "Development", type: "registry", label: "npm" },
  "pypi.org": { category: "Development", type: "registry", label: "PyPI" },
  "crates.io": { category: "Development", type: "registry", label: "crates.io" },
  "rubygems.org": { category: "Development", type: "registry", label: "RubyGems" },
  "packagist.org": { category: "Development", type: "registry", label: "Packagist" },
  "dev.to": { category: "Development", type: "blog", label: "DEV Community" },
  "hashnode.dev": { category: "Development", type: "blog", label: "Hashnode" },
  "codepen.io": { category: "Development", type: "playground", label: "CodePen" },
  "codesandbox.io": { category: "Development", type: "playground", label: "CodeSandbox" },
  "replit.com": { category: "Development", type: "playground", label: "Replit" },
  "stackblitz.com": { category: "Development", type: "playground", label: "StackBlitz" },
  "vercel.com": { category: "Development", type: "platform", label: "Vercel" },
  "netlify.com": { category: "Development", type: "platform", label: "Netlify" },
  "heroku.com": { category: "Development", type: "platform", label: "Heroku" },
  "docker.com": { category: "Development", type: "platform", label: "Docker" },
  "kubernetes.io": { category: "Development", type: "platform", label: "Kubernetes" },
  "supabase.com": { category: "Development", type: "platform", label: "Supabase" },
  "firebase.google.com": { category: "Development", type: "platform", label: "Firebase" },
  "aws.amazon.com": { category: "Development", type: "platform", label: "AWS" },
  "cloud.google.com": { category: "Development", type: "platform", label: "Google Cloud" },
  "azure.microsoft.com": { category: "Development", type: "platform", label: "Azure" },
  "render.com": { category: "Development", type: "platform", label: "Render" },
  "railway.app": { category: "Development", type: "platform", label: "Railway" },
  "fly.io": { category: "Development", type: "platform", label: "Fly.io" },
  "gist.github.com": { category: "Development", type: "snippet", label: "GitHub Gist" },

  // Documentation
  "developer.mozilla.org": { category: "Documentation", type: "reference", label: "MDN" },
  "docs.github.com": { category: "Documentation", type: "docs", label: "GitHub Docs" },
  "reactjs.org": { category: "Documentation", type: "docs", label: "React" },
  "react.dev": { category: "Documentation", type: "docs", label: "React" },
  "vuejs.org": { category: "Documentation", type: "docs", label: "Vue.js" },
  "angular.io": { category: "Documentation", type: "docs", label: "Angular" },
  "angular.dev": { category: "Documentation", type: "docs", label: "Angular" },
  "svelte.dev": { category: "Documentation", type: "docs", label: "Svelte" },
  "nextjs.org": { category: "Documentation", type: "docs", label: "Next.js" },
  "nuxt.com": { category: "Documentation", type: "docs", label: "Nuxt" },
  "astro.build": { category: "Documentation", type: "docs", label: "Astro" },
  "typescriptlang.org": { category: "Documentation", type: "docs", label: "TypeScript" },
  "nodejs.org": { category: "Documentation", type: "docs", label: "Node.js" },
  "docs.python.org": { category: "Documentation", type: "docs", label: "Python Docs" },
  "docs.rs": { category: "Documentation", type: "docs", label: "Rust Docs" },
  "go.dev": { category: "Documentation", type: "docs", label: "Go" },
  "tailwindcss.com": { category: "Documentation", type: "docs", label: "Tailwind CSS" },
  "sass-lang.com": { category: "Documentation", type: "docs", label: "Sass" },
  "webpack.js.org": { category: "Documentation", type: "docs", label: "Webpack" },
  "vitejs.dev": { category: "Documentation", type: "docs", label: "Vite" },
  "eslint.org": { category: "Documentation", type: "docs", label: "ESLint" },
  "jestjs.io": { category: "Documentation", type: "docs", label: "Jest" },
  "playwright.dev": { category: "Documentation", type: "docs", label: "Playwright" },
  "graphql.org": { category: "Documentation", type: "docs", label: "GraphQL" },
  "prisma.io": { category: "Documentation", type: "docs", label: "Prisma" },
  "trpc.io": { category: "Documentation", type: "docs", label: "tRPC" },

  // Design
  "dribbble.com": { category: "Design", type: "showcase", label: "Dribbble" },
  "behance.net": { category: "Design", type: "showcase", label: "Behance" },
  "figma.com": { category: "Design", type: "tool", label: "Figma" },
  "canva.com": { category: "Design", type: "tool", label: "Canva" },
  "awwwards.com": { category: "Design", type: "showcase", label: "Awwwards" },
  "designspiration.com": { category: "Design", type: "showcase", label: "Designspiration" },
  "pinterest.com": { category: "Design", type: "showcase", label: "Pinterest" },
  "unsplash.com": { category: "Design", type: "asset", label: "Unsplash" },
  "pexels.com": { category: "Design", type: "asset", label: "Pexels" },
  "coolors.co": { category: "Design", type: "tool", label: "Coolors" },
  "fontpair.co": { category: "Design", type: "tool", label: "Fontpair" },
  "fonts.google.com": { category: "Design", type: "asset", label: "Google Fonts" },
  "iconify.design": { category: "Design", type: "asset", label: "Iconify" },
  "heroicons.com": { category: "Design", type: "asset", label: "Heroicons" },
  "lucide.dev": { category: "Design", type: "asset", label: "Lucide" },

  // Research & Education
  "arxiv.org": { category: "Research", type: "paper", label: "arXiv" },
  "scholar.google.com": { category: "Research", type: "search", label: "Google Scholar" },
  "researchgate.net": { category: "Research", type: "platform", label: "ResearchGate" },
  "semanticscholar.org": { category: "Research", type: "search", label: "Semantic Scholar" },
  "pubmed.ncbi.nlm.nih.gov": { category: "Research", type: "paper", label: "PubMed" },
  "nature.com": { category: "Research", type: "journal", label: "Nature" },
  "science.org": { category: "Research", type: "journal", label: "Science" },
  "ieee.org": { category: "Research", type: "journal", label: "IEEE" },
  "acm.org": { category: "Research", type: "journal", label: "ACM" },
  "wikipedia.org": { category: "Reference", type: "encyclopedia", label: "Wikipedia" },
  "britannica.com": { category: "Reference", type: "encyclopedia", label: "Britannica" },
  "coursera.org": { category: "Education", type: "course", label: "Coursera" },
  "udemy.com": { category: "Education", type: "course", label: "Udemy" },
  "edx.org": { category: "Education", type: "course", label: "edX" },
  "khanacademy.org": { category: "Education", type: "course", label: "Khan Academy" },
  "freecodecamp.org": { category: "Education", type: "course", label: "freeCodeCamp" },
  "codecademy.com": { category: "Education", type: "course", label: "Codecademy" },
  "leetcode.com": { category: "Education", type: "practice", label: "LeetCode" },
  "hackerrank.com": { category: "Education", type: "practice", label: "HackerRank" },
  "exercism.org": { category: "Education", type: "practice", label: "Exercism" },
  "brilliant.org": { category: "Education", type: "course", label: "Brilliant" },
  "skillshare.com": { category: "Education", type: "course", label: "Skillshare" },

  // AI & ML
  "huggingface.co": { category: "AI", type: "platform", label: "Hugging Face", defaultTopics: ["machine-learning"] },
  "openai.com": { category: "AI", type: "platform", label: "OpenAI", defaultTopics: ["llm"] },
  "anthropic.com": { category: "AI", type: "platform", label: "Anthropic", defaultTopics: ["llm"] },
  "kaggle.com": { category: "AI", type: "platform", label: "Kaggle", defaultTopics: ["data-science"] },
  "paperswithcode.com": { category: "AI", type: "platform", label: "Papers With Code", defaultTopics: ["machine-learning"] },
  "replicate.com": { category: "AI", type: "platform", label: "Replicate" },
  "together.ai": { category: "AI", type: "platform", label: "Together AI" },
  "civitai.com": { category: "AI", type: "platform", label: "CivitAI", defaultTopics: ["generative-ai"] },
  "ollama.com": { category: "AI", type: "tool", label: "Ollama", defaultTopics: ["llm"] },

  // News & Media
  "techcrunch.com": { category: "News", type: "tech", label: "TechCrunch" },
  "theverge.com": { category: "News", type: "tech", label: "The Verge" },
  "arstechnica.com": { category: "News", type: "tech", label: "Ars Technica" },
  "wired.com": { category: "News", type: "tech", label: "WIRED" },
  "news.ycombinator.com": { category: "News", type: "tech", label: "Hacker News" },
  "bbc.com": { category: "News", type: "general", label: "BBC" },
  "reuters.com": { category: "News", type: "general", label: "Reuters" },
  "nytimes.com": { category: "News", type: "general", label: "NYT" },
  "theguardian.com": { category: "News", type: "general", label: "The Guardian" },
  "washingtonpost.com": { category: "News", type: "general", label: "Washington Post" },
  "bloomberg.com": { category: "News", type: "business", label: "Bloomberg" },
  "cnbc.com": { category: "News", type: "business", label: "CNBC" },
  "thenewstack.io": { category: "News", type: "tech", label: "The New Stack" },
  "infoq.com": { category: "News", type: "tech", label: "InfoQ" },
  "zdnet.com": { category: "News", type: "tech", label: "ZDNet" },

  // Articles & Blogs
  "medium.com": { category: "Articles", type: "blog", label: "Medium" },
  "substack.com": { category: "Articles", type: "newsletter", label: "Substack" },
  "wordpress.com": { category: "Articles", type: "blog", label: "WordPress" },
  "blogger.com": { category: "Articles", type: "blog", label: "Blogger" },
  "ghost.org": { category: "Articles", type: "blog", label: "Ghost" },
  "mirror.xyz": { category: "Articles", type: "blog", label: "Mirror" },
  "beehiiv.com": { category: "Articles", type: "newsletter", label: "beehiiv" },

  // Social
  "twitter.com": { category: "Social", type: "microblog", label: "Twitter" },
  "x.com": { category: "Social", type: "microblog", label: "X" },
  "reddit.com": { category: "Social", type: "forum", label: "Reddit" },
  "linkedin.com": { category: "Social", type: "professional", label: "LinkedIn" },
  "facebook.com": { category: "Social", type: "social", label: "Facebook" },
  "instagram.com": { category: "Social", type: "social", label: "Instagram" },
  "mastodon.social": { category: "Social", type: "microblog", label: "Mastodon" },
  "threads.net": { category: "Social", type: "microblog", label: "Threads" },
  "discord.com": { category: "Social", type: "chat", label: "Discord" },
  "slack.com": { category: "Social", type: "chat", label: "Slack" },
  "bsky.app": { category: "Social", type: "microblog", label: "Bluesky" },

  // Video
  "youtube.com": { category: "Video", type: "video", label: "YouTube" },
  "vimeo.com": { category: "Video", type: "video", label: "Vimeo" },
  "twitch.tv": { category: "Video", type: "stream", label: "Twitch" },
  "loom.com": { category: "Video", type: "recording", label: "Loom" },
  "dailymotion.com": { category: "Video", type: "video", label: "Dailymotion" },

  // Productivity & Tools
  "notion.so": { category: "Productivity", type: "tool", label: "Notion" },
  "trello.com": { category: "Productivity", type: "tool", label: "Trello" },
  "asana.com": { category: "Productivity", type: "tool", label: "Asana" },
  "linear.app": { category: "Productivity", type: "tool", label: "Linear" },
  "airtable.com": { category: "Productivity", type: "tool", label: "Airtable" },
  "miro.com": { category: "Productivity", type: "tool", label: "Miro" },
  "clickup.com": { category: "Productivity", type: "tool", label: "ClickUp" },
  "todoist.com": { category: "Productivity", type: "tool", label: "Todoist" },
  "obsidian.md": { category: "Productivity", type: "tool", label: "Obsidian" },
  "excalidraw.com": { category: "Productivity", type: "tool", label: "Excalidraw" },

  // Documents
  "docs.google.com": { category: "Documents", type: "document", label: "Google Docs" },
  "sheets.google.com": { category: "Documents", type: "spreadsheet", label: "Google Sheets" },
  "slides.google.com": { category: "Documents", type: "presentation", label: "Google Slides" },
  "drive.google.com": { category: "Documents", type: "storage", label: "Google Drive" },
  "dropbox.com": { category: "Documents", type: "storage", label: "Dropbox" },

  // Shopping
  "amazon.com": { category: "Shopping", type: "marketplace", label: "Amazon" },
  "ebay.com": { category: "Shopping", type: "marketplace", label: "eBay" },
  "etsy.com": { category: "Shopping", type: "marketplace", label: "Etsy" },
  "shopify.com": { category: "Shopping", type: "platform", label: "Shopify" },

  // Finance
  "finance.yahoo.com": { category: "Finance", type: "portal", label: "Yahoo Finance" },
  "investopedia.com": { category: "Finance", type: "reference", label: "Investopedia" },
  "coinmarketcap.com": { category: "Finance", type: "crypto", label: "CoinMarketCap" },
  "coingecko.com": { category: "Finance", type: "crypto", label: "CoinGecko" },

  // Podcasts & Audio
  "spotify.com": { category: "Audio", type: "streaming", label: "Spotify" },
  "podcasts.apple.com": { category: "Audio", type: "podcast", label: "Apple Podcasts" },
  "soundcloud.com": { category: "Audio", type: "streaming", label: "SoundCloud" },
};

/**
 * Look up structured domain info for a given hostname.
 * Tries exact match first, then strips subdomains progressively.
 */
export function getDomainInfo(domain: string): DomainInfo | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  if (DOMAIN_MAP[normalized]) {
    return DOMAIN_MAP[normalized];
  }

  // Try stripping one subdomain level (e.g., docs.github.com → github.com)
  const parts = normalized.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(1).join(".");
    if (DOMAIN_MAP[parent]) {
      return DOMAIN_MAP[parent];
    }
  }

  return null;
}

/** Backward-compatible wrapper — returns just the category string */
export function getCategoryForDomain(domain: string): string | null {
  return getDomainInfo(domain)?.category ?? null;
}

// ─── Path-based category overrides ────────────────────────

const PATH_CATEGORY_OVERRIDES: { pattern: RegExp; category: string }[] = [
  { pattern: /\/blog(\/|$)/i, category: "Articles" },
  { pattern: /\/docs?(\/|$)/i, category: "Documentation" },
  { pattern: /\/documentation(\/|$)/i, category: "Documentation" },
  { pattern: /\/api(\/|$)/i, category: "Documentation" },
  { pattern: /\/pricing(\/|$)/i, category: "Product" },
  { pattern: /\/changelog(\/|$)/i, category: "Product" },
  { pattern: /\/releases?(\/|$)/i, category: "Product" },
  { pattern: /\/wiki(\/|$)/i, category: "Reference" },
  { pattern: /\/tutorials?(\/|$)/i, category: "Education" },
  { pattern: /\/learn(\/|$)/i, category: "Education" },
  { pattern: /\/guides?(\/|$)/i, category: "Education" },
  { pattern: /\/careers?(\/|$)/i, category: "Jobs" },
  { pattern: /\/jobs?(\/|$)/i, category: "Jobs" },
];

/**
 * Check if URL path suggests a different category than the domain default.
 * Returns the override category, or the fallback if no path pattern matched.
 */
export function inferCategoryFromPath(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    for (const { pattern, category } of PATH_CATEGORY_OVERRIDES) {
      if (pattern.test(pathname)) {
        return category;
      }
    }
  } catch {
    // invalid URL
  }
  return fallback;
}

// ─── Category noun mapping (for domain context) ──────────

const CATEGORY_NOUNS: Record<string, string> = {
  Development: "repository",
  Documentation: "docs",
  Design: "design",
  Research: "paper",
  Reference: "reference",
  Education: "course",
  AI: "platform",
  News: "article",
  Articles: "blog",
  Social: "post",
  Video: "video",
  Audio: "audio",
  Productivity: "tool",
  Documents: "document",
  Shopping: "store",
  Finance: "portal",
  Product: "page",
  Jobs: "listing",
  Other: "page",
};

/**
 * Build a human-readable domain context string.
 * e.g. "Medium blog", "GitHub repository", "arXiv paper"
 */
export function buildDomainContext(label: string, category: string): string {
  const noun = CATEGORY_NOUNS[category] ?? "page";
  return `${label} ${noun}`;
}

// ─── Keyword extraction ──────────────────────────────────

/** Stop words to exclude from keyword extraction */
const STOP_WORDS = new Set([
  // Grammatical
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "dare",
  "ought", "used", "this", "that", "these", "those", "i", "you", "he",
  "she", "it", "we", "they", "me", "him", "her", "us", "them", "my",
  "your", "his", "its", "our", "their", "what", "which", "who", "whom",
  "how", "when", "where", "why", "not", "no", "nor", "as", "if", "then",
  "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "am", "any", "because", "before", "between", "both",
  "each", "few", "more", "most", "other", "some", "such", "into", "over",
  "own", "same", "so", "up", "out", "only", "new", "now", "get", "got",
  "one", "two", "first", "using", "use", "via", "like", "make", "made",
  "way", "well", "back", "even", "still", "many", "much", "must", "here",
  "there", "through", "during", "while",
  // Web/marketing filler — common heading & CTA words that aren't meaningful topics
  "discover", "explore", "learn", "find", "browse", "search", "view",
  "read", "watch", "listen", "check", "start", "join", "sign", "login",
  "log", "try", "free", "best", "top", "popular", "trending", "featured",
  "latest", "world", "global", "today", "home", "welcome", "official",
  "click", "download", "subscribe", "share", "follow", "connect",
  "create", "build", "grow", "scale", "ship", "launch", "deploy",
  "help", "support", "contact", "faq", "blog", "news", "update",
  "meet", "see", "show", "look", "great", "amazing", "awesome",
  "powerful", "simple", "easy", "fast", "better", "leading", "next",
  "every", "everything", "anything", "something",
  // Vague content words that platforms use but aren't useful as tags
  "human", "stories", "story", "ideas", "idea", "things", "thing",
  "post", "posts", "article", "articles", "page", "pages", "site",
  "write", "writing", "reading", "think", "thinking", "know",
  "work", "working", "works", "live", "life", "open", "good",
  "real", "part", "based", "long", "high", "full", "small", "large",
  "right", "left", "old", "deep", "deepen", "understanding",
  "place", "true", "level", "different", "important", "possible",
  // People-related generic words
  "people", "users", "team", "community", "members", "creators",
  "designers", "developers", "creatives", "professionals", "experts",
  "makers", "builders", "writers", "artists", "engineers",
]);

/**
 * Extract meaningful keywords from a text string.
 * Returns up to `max` lowercased keyword tags.
 * minLength filters out short generic words (default 3 chars).
 */
export function extractKeywords(text: string, max = 5, minLength = 3): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= minLength && !STOP_WORDS.has(w));

  return [...new Set(words)].slice(0, max);
}
