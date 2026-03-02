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

  return {
    url: location.href,
    title: document.title,
    description:
      getMeta("og:description") ||
      getMeta("description") ||
      getMeta("twitter:description"),
    favicon,
    ogImage: getMeta("og:image") || getMeta("twitter:image"),
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
