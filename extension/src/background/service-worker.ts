import { getSupabase } from "../lib/supabase";
import { generateTags } from "../lib/tagger";
import { initCache, setupCacheRefresh } from "../lib/domain-intelligence";
import type { ExtensionMessage, SavePayload } from "../lib/types";

/**
 * Background service worker.
 * Handles: screenshot capture, bookmark saving, tag generation, Supabase sync.
 */

// Initialize domain intelligence cache on service worker startup
initCache().catch((err) =>
  console.warn("Domain intelligence init failed:", err)
);
setupCacheRefresh();

// ---------- Screenshot capture ----------

async function captureScreenshot(): Promise<string | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "jpeg",
      quality: 70,
    });
    return dataUrl;
  } catch (err) {
    console.warn("Screenshot capture failed:", err);
    return null;
  }
}

/**
 * Convert a data URL to a Blob for upload.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

// ---------- Upload screenshot to Supabase Storage ----------

async function uploadScreenshot(
  userId: string,
  bookmarkId: string,
  dataUrl: string
): Promise<{ screenshotUrl: string; thumbnailUrl: string } | null> {
  const supabase = getSupabase();
  const blob = dataUrlToBlob(dataUrl);
  const path = `${userId}/${bookmarkId}.jpg`;

  const { error } = await supabase.storage
    .from("screenshots")
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("Screenshot upload failed:", error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("screenshots")
    .getPublicUrl(path);

  return {
    screenshotUrl: urlData.publicUrl,
    thumbnailUrl: urlData.publicUrl, // TODO: generate actual thumbnail in Phase 2
  };
}

// ---------- Save bookmark ----------

async function saveBookmark(payload: SavePayload): Promise<void> {
  const supabase = getSupabase();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated. Please sign in first.");
  }

  // Generate tags (Tier 1: rule-based), filter out user-removed topics
  const tagResult = generateTags(payload.meta);
  if (payload.removedTopics?.length) {
    const removed = new Set(payload.removedTopics);
    tagResult.topics = tagResult.topics.filter((t) => !removed.has(t));
  }

  // Capture screenshot if requested
  let screenshotDataUrl: string | null = null;
  if (payload.captureScreenshot) {
    screenshotDataUrl = await captureScreenshot();
  }

  // Insert bookmark
  const { data: bookmark, error: bookmarkError } = await supabase
    .from("bookmarks")
    .upsert(
      {
        user_id: user.id,
        url: payload.url,
        title: payload.title,
        description: payload.meta.description || null,
        favicon_url: payload.meta.favicon || null,
        category: tagResult.category,
        domain_context: tagResult.domainContext || null,
        has_screenshot: !!screenshotDataUrl,
      },
      { onConflict: "user_id,url" }
    )
    .select()
    .single();

  if (bookmarkError || !bookmark) {
    throw new Error(bookmarkError?.message ?? "Failed to save bookmark");
  }

  // Upload screenshot (async, don't block)
  if (screenshotDataUrl) {
    const urls = await uploadScreenshot(
      user.id,
      bookmark.id,
      screenshotDataUrl
    );
    if (urls) {
      await supabase
        .from("bookmarks")
        .update({
          screenshot_url: urls.screenshotUrl,
          thumbnail_url: urls.thumbnailUrl,
        })
        .eq("id", bookmark.id);
    }
  }

  // Create/link AI tags (topics from 3-layer taxonomy)
  for (const tagName of tagResult.topics) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert(
        { user_id: user.id, name: tagName },
        { onConflict: "user_id,name" }
      )
      .select()
      .single();

    if (tag) {
      await supabase
        .from("bookmark_tags")
        .upsert(
          {
            bookmark_id: bookmark.id,
            tag_id: tag.id,
            source: "ai_tier1",
            confidence: tagResult.confidence,
          },
          { onConflict: "bookmark_id,tag_id" }
        )
        .select();
    }
  }

  // Create/link user-added tags
  for (const tagName of payload.userTags) {
    const { data: tag } = await supabase
      .from("tags")
      .upsert(
        { user_id: user.id, name: tagName },
        { onConflict: "user_id,name" }
      )
      .select()
      .single();

    if (tag) {
      await supabase
        .from("bookmark_tags")
        .upsert(
          {
            bookmark_id: bookmark.id,
            tag_id: tag.id,
            source: "user",
            confidence: 1.0,
          },
          { onConflict: "bookmark_id,tag_id" }
        )
        .select();
    }
  }
}

// ---------- Message listener ----------

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "SAVE_BOOKMARK") {
      saveBookmark(message.data)
        .then(() => sendResponse({ type: "SAVE_RESULT", success: true }))
        .catch((err) =>
          sendResponse({
            type: "SAVE_RESULT",
            success: false,
            error: err.message,
          })
        );
      return true; // keep channel open for async response
    }
  }
);

// ---------- Keyboard shortcut ----------

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "save-page") {
    // Open the popup programmatically (not directly possible in MV3),
    // so instead we'll capture and save with defaults
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    // Get meta from content script
    const meta = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_PAGE_META",
    });

    if (meta?.data) {
      try {
        await saveBookmark({
          url: meta.data.url,
          title: meta.data.title,
          userTags: [],
          captureScreenshot: true,
          meta: meta.data,
        });
        // Flash badge to confirm
        chrome.action.setBadgeText({ text: "✓", tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "", tabId: tab.id });
        }, 2000);
      } catch (err) {
        chrome.action.setBadgeText({ text: "!", tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "", tabId: tab.id });
        }, 2000);
      }
    }
  }
});
