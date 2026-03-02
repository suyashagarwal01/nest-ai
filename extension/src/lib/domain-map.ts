/**
 * Tier 1 AI tagging: rule-based domain → category mapping.
 * Covers the most common domains. Runs client-side, instant, free.
 */

const DOMAIN_CATEGORIES: Record<string, string> = {
  // Development
  "github.com": "Development",
  "gitlab.com": "Development",
  "bitbucket.org": "Development",
  "stackoverflow.com": "Development",
  "stackexchange.com": "Development",
  "npmjs.com": "Development",
  "pypi.org": "Development",
  "crates.io": "Development",
  "dev.to": "Development",
  "hashnode.dev": "Development",
  "codepen.io": "Development",
  "codesandbox.io": "Development",
  "replit.com": "Development",
  "vercel.com": "Development",
  "netlify.com": "Development",
  "heroku.com": "Development",
  "docker.com": "Development",
  "kubernetes.io": "Development",

  // Documentation
  "developer.mozilla.org": "Documentation",
  "docs.github.com": "Documentation",
  "reactjs.org": "Documentation",
  "vuejs.org": "Documentation",
  "angular.io": "Documentation",
  "nextjs.org": "Documentation",
  "typescriptlang.org": "Documentation",
  "nodejs.org": "Documentation",
  "docs.python.org": "Documentation",
  "docs.rs": "Documentation",
  "tailwindcss.com": "Documentation",

  // Design
  "dribbble.com": "Design",
  "behance.net": "Design",
  "figma.com": "Design",
  "canva.com": "Design",
  "awwwards.com": "Design",
  "designspiration.com": "Design",
  "pinterest.com": "Design",
  "unsplash.com": "Design",
  "pexels.com": "Design",
  "coolors.co": "Design",
  "fontpair.co": "Design",
  "fonts.google.com": "Design",

  // Research & Education
  "arxiv.org": "Research",
  "scholar.google.com": "Research",
  "researchgate.net": "Research",
  "semanticscholar.org": "Research",
  "wikipedia.org": "Reference",
  "britannica.com": "Reference",
  "coursera.org": "Education",
  "udemy.com": "Education",
  "edx.org": "Education",
  "khanacademy.org": "Education",
  "freecodecamp.org": "Education",

  // AI & ML
  "huggingface.co": "AI",
  "openai.com": "AI",
  "anthropic.com": "AI",
  "kaggle.com": "AI",
  "paperswithcode.com": "AI",

  // News & Media
  "techcrunch.com": "News",
  "theverge.com": "News",
  "arstechnica.com": "News",
  "wired.com": "News",
  "hackernews.com": "News",
  "news.ycombinator.com": "News",
  "bbc.com": "News",
  "reuters.com": "News",
  "nytimes.com": "News",
  "theguardian.com": "News",

  // Articles & Blogs
  "medium.com": "Articles",
  "substack.com": "Articles",
  "wordpress.com": "Articles",
  "blogger.com": "Articles",
  "ghost.org": "Articles",

  // Social
  "twitter.com": "Social",
  "x.com": "Social",
  "reddit.com": "Social",
  "linkedin.com": "Social",
  "facebook.com": "Social",
  "instagram.com": "Social",
  "mastodon.social": "Social",
  "threads.net": "Social",
  "discord.com": "Social",

  // Video
  "youtube.com": "Video",
  "vimeo.com": "Video",
  "twitch.tv": "Video",
  "loom.com": "Video",

  // Productivity & Tools
  "notion.so": "Productivity",
  "trello.com": "Productivity",
  "asana.com": "Productivity",
  "linear.app": "Productivity",
  "airtable.com": "Productivity",
  "miro.com": "Productivity",
  "docs.google.com": "Documents",
  "sheets.google.com": "Documents",
  "slides.google.com": "Documents",
  "drive.google.com": "Documents",

  // Shopping
  "amazon.com": "Shopping",
  "ebay.com": "Shopping",
  "etsy.com": "Shopping",

  // Finance
  "bloomberg.com": "Finance",
  "finance.yahoo.com": "Finance",
  "investopedia.com": "Finance",
};

/**
 * Look up the category for a given URL's domain.
 * Tries exact match first, then strips subdomains progressively.
 */
export function getCategoryForDomain(domain: string): string | null {
  const normalized = domain.toLowerCase().replace(/^www\./, "");

  // Exact match
  if (DOMAIN_CATEGORIES[normalized]) {
    return DOMAIN_CATEGORIES[normalized];
  }

  // Try stripping one subdomain level (e.g., docs.github.com → github.com)
  const parts = normalized.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(1).join(".");
    if (DOMAIN_CATEGORIES[parent]) {
      return DOMAIN_CATEGORIES[parent];
    }
  }

  return null;
}

/** Stop words to exclude from keyword extraction */
const STOP_WORDS = new Set([
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
  "one", "two", "first",
]);

/**
 * Extract meaningful keywords from a title string.
 * Returns 3-5 lowercased keyword tags.
 */
export function extractKeywords(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Deduplicate and take top 5
  return [...new Set(words)].slice(0, 5);
}
