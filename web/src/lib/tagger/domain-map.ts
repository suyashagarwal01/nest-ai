/**
 * Server-side domain map — adapted from extension/src/lib/domain-map.ts.
 * Removed Chrome API dependencies. Used by API routes for auto-tagging.
 */

interface DomainInfo {
  category: string;
  type: string;
  label: string;
  defaultTopics?: string[];
}

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
  "dev.to": { category: "Development", type: "blog", label: "DEV Community" },
  "hashnode.dev": { category: "Development", type: "blog", label: "Hashnode" },
  "codepen.io": { category: "Development", type: "playground", label: "CodePen" },
  "codesandbox.io": { category: "Development", type: "playground", label: "CodeSandbox" },
  "replit.com": { category: "Development", type: "playground", label: "Replit" },
  "stackblitz.com": { category: "Development", type: "playground", label: "StackBlitz" },
  "vercel.com": { category: "Development", type: "platform", label: "Vercel" },
  "netlify.com": { category: "Development", type: "platform", label: "Netlify" },
  "supabase.com": { category: "Development", type: "platform", label: "Supabase" },
  "firebase.google.com": { category: "Development", type: "platform", label: "Firebase" },
  "aws.amazon.com": { category: "Development", type: "platform", label: "AWS" },
  "cloud.google.com": { category: "Development", type: "platform", label: "Google Cloud" },
  "gist.github.com": { category: "Development", type: "snippet", label: "GitHub Gist" },

  // Documentation
  "developer.mozilla.org": { category: "Documentation", type: "reference", label: "MDN" },
  "react.dev": { category: "Documentation", type: "docs", label: "React" },
  "vuejs.org": { category: "Documentation", type: "docs", label: "Vue.js" },
  "angular.dev": { category: "Documentation", type: "docs", label: "Angular" },
  "svelte.dev": { category: "Documentation", type: "docs", label: "Svelte" },
  "nextjs.org": { category: "Documentation", type: "docs", label: "Next.js" },
  "typescriptlang.org": { category: "Documentation", type: "docs", label: "TypeScript" },
  "nodejs.org": { category: "Documentation", type: "docs", label: "Node.js" },
  "tailwindcss.com": { category: "Documentation", type: "docs", label: "Tailwind CSS" },
  "vitejs.dev": { category: "Documentation", type: "docs", label: "Vite" },
  "graphql.org": { category: "Documentation", type: "docs", label: "GraphQL" },
  "prisma.io": { category: "Documentation", type: "docs", label: "Prisma" },

  // Design
  "dribbble.com": { category: "Design", type: "showcase", label: "Dribbble" },
  "behance.net": { category: "Design", type: "showcase", label: "Behance" },
  "figma.com": { category: "Design", type: "tool", label: "Figma" },

  // Research & Education
  "arxiv.org": { category: "Research", type: "paper", label: "arXiv" },
  "scholar.google.com": { category: "Research", type: "search", label: "Google Scholar" },
  "wikipedia.org": { category: "Reference", type: "encyclopedia", label: "Wikipedia" },
  "coursera.org": { category: "Education", type: "course", label: "Coursera" },
  "udemy.com": { category: "Education", type: "course", label: "Udemy" },

  // AI & ML
  "huggingface.co": { category: "AI", type: "platform", label: "Hugging Face", defaultTopics: ["machine-learning"] },
  "openai.com": { category: "AI", type: "platform", label: "OpenAI", defaultTopics: ["llm"] },
  "anthropic.com": { category: "AI", type: "platform", label: "Anthropic", defaultTopics: ["llm"] },
  "kaggle.com": { category: "AI", type: "platform", label: "Kaggle", defaultTopics: ["data-science"] },

  // News
  "techcrunch.com": { category: "News", type: "tech", label: "TechCrunch" },
  "theverge.com": { category: "News", type: "tech", label: "The Verge" },
  "arstechnica.com": { category: "News", type: "tech", label: "Ars Technica" },
  "news.ycombinator.com": { category: "News", type: "tech", label: "Hacker News" },

  // Articles
  "medium.com": { category: "Articles", type: "blog", label: "Medium" },
  "substack.com": { category: "Articles", type: "newsletter", label: "Substack" },

  // Social
  "twitter.com": { category: "Social", type: "microblog", label: "Twitter" },
  "x.com": { category: "Social", type: "microblog", label: "X" },
  "reddit.com": { category: "Social", type: "forum", label: "Reddit" },
  "linkedin.com": { category: "Social", type: "professional", label: "LinkedIn" },

  // Video
  "youtube.com": { category: "Video", type: "video", label: "YouTube" },
  "vimeo.com": { category: "Video", type: "video", label: "Vimeo" },

  // Productivity
  "notion.so": { category: "Productivity", type: "tool", label: "Notion" },
};

export function getDomainInfo(domain: string): DomainInfo | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");
  if (DOMAIN_MAP[normalized]) return DOMAIN_MAP[normalized];

  const parts = normalized.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(1).join(".");
    if (DOMAIN_MAP[parent]) return DOMAIN_MAP[parent];
  }
  return null;
}

const PATH_CATEGORY_OVERRIDES: { pattern: RegExp; category: string }[] = [
  { pattern: /\/blog(\/|$)/i, category: "Articles" },
  { pattern: /\/docs?(\/|$)/i, category: "Documentation" },
  { pattern: /\/api(\/|$)/i, category: "Documentation" },
  { pattern: /\/pricing(\/|$)/i, category: "Product" },
  { pattern: /\/wiki(\/|$)/i, category: "Reference" },
  { pattern: /\/tutorials?(\/|$)/i, category: "Education" },
  { pattern: /\/learn(\/|$)/i, category: "Education" },
];

export function inferCategoryFromPath(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    for (const { pattern, category } of PATH_CATEGORY_OVERRIDES) {
      if (pattern.test(pathname)) return category;
    }
  } catch {}
  return fallback;
}

const CATEGORY_NOUNS: Record<string, string> = {
  Development: "repository", Documentation: "docs", Design: "design",
  Research: "paper", Reference: "reference", Education: "course",
  AI: "platform", News: "article", Articles: "blog", Social: "post",
  Video: "video", Productivity: "tool", Other: "page",
};

export function buildDomainContext(label: string, category: string): string {
  return `${label} ${CATEGORY_NOUNS[category] ?? "page"}`;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "this", "that",
  "these", "those", "i", "you", "he", "she", "it", "we", "they",
  "not", "no", "as", "if", "how", "what", "which", "who", "when",
  "where", "why", "all", "also", "am", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "into", "over", "own",
  "so", "up", "out", "only", "new", "now", "get", "one", "two",
  "first", "using", "use", "via", "like", "make", "way",
  "discover", "explore", "learn", "find", "browse", "search",
  "read", "watch", "check", "start", "join", "free", "best", "top",
  "help", "support", "blog", "news", "update",
]);

export function extractKeywords(text: string, max = 5, minLength = 3): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= minLength && !STOP_WORDS.has(w));
  return [...new Set(words)].slice(0, max);
}
