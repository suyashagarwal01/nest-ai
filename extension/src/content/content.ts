import type { ExtensionMessage, PageMeta } from "../lib/types";

/**
 * Content script: extracts page metadata from the active tab.
 * Runs at document_idle on all URLs.
 */

function getPageMeta(): PageMeta {
  const getMeta = (name: string): string => {
    const el =
      document.querySelector(`meta[property="${name}"]`) ??
      document.querySelector(`meta[name="${name}"]`);
    return el?.getAttribute("content") ?? "";
  };

  // Favicon: prefer link[rel="icon"], fallback to /favicon.ico
  const faviconEl = document.querySelector(
    'link[rel="icon"], link[rel="shortcut icon"]'
  ) as HTMLLinkElement | null;
  const favicon = faviconEl?.href ?? `${location.origin}/favicon.ico`;

  // Meta keywords
  let metaKeywords: string[] = [];
  try {
    const raw = getMeta("keywords");
    if (raw) {
      metaKeywords = raw
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);
    }
  } catch {
    // ignore malformed
  }

  // Article tags (Open Graph article:tag)
  const articleTags: string[] = [];
  try {
    const tagEls = document.querySelectorAll('meta[property="article:tag"]');
    tagEls.forEach((el) => {
      const val = el.getAttribute("content")?.trim().toLowerCase();
      if (val) articleTags.push(val);
    });
  } catch {
    // ignore
  }

  // JSON-LD @type
  let jsonLdType: string | null = null;
  try {
    // Content-specific types that should take priority over generic ones (e.g. WebSite)
    const CONTENT_TYPES = new Set([
      "Article", "BlogPosting", "NewsArticle", "ScholarlyArticle",
      "TechArticle", "HowTo", "Course", "Recipe", "Product",
      "SoftwareApplication", "VideoObject",
    ]);
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    let fallbackType: string | null = null;
    for (const script of scripts) {
      const text = script.textContent;
      if (!text) continue;
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];
      for (const obj of items) {
        const t = Array.isArray(obj?.["@type"]) ? obj["@type"][0] : obj?.["@type"];
        if (!t) continue;
        if (CONTENT_TYPES.has(t)) { jsonLdType = t; break; }
        if (!fallbackType) fallbackType = t;
      }
      if (jsonLdType) break;
    }
    if (!jsonLdType) jsonLdType = fallbackType;
  } catch {
    // ignore malformed JSON-LD
  }

  // First 5 h1 + h2 headings
  const headings: string[] = [];
  try {
    const els = document.querySelectorAll("h1, h2");
    for (let i = 0; i < Math.min(els.length, 5); i++) {
      const text = els[i]?.textContent?.trim();
      if (text) headings.push(text);
    }
  } catch {
    // ignore
  }

  return {
    url: location.href,
    title: document.title,
    description:
      getMeta("og:description") ||
      getMeta("description") ||
      getMeta("twitter:description"),
    favicon,
    ogImage: getMeta("og:image") || getMeta("twitter:image"),
    ogType: getMeta("og:type") || null,
    metaKeywords,
    articleTags,
    jsonLdType,
    headings,
  };
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "GET_PAGE_META") {
      sendResponse({ type: "PAGE_META", data: getPageMeta() });
    }
    // Return true for async sendResponse (not needed here, but safe)
    return true;
  }
);
