import { getSupabase } from "../lib/supabase";
import { generateTags } from "../lib/tagger";
import { initCache, setupCacheRefresh } from "../lib/domain-intelligence";
import {
  initCollectiveCache,
  setupCollectiveRefresh,
  normalizeTag,
  recordFeedback,
} from "../lib/collective-intelligence";
import {
  initVocabCache,
  setupVocabRefresh,
  applyVocabulary,
  learnVocabulary,
  handleVocabAlarm,
} from "../lib/user-preferences";
import {
  initInterestVector,
  setupInterestRefresh,
  boostWithInterests,
  handleInterestAlarm,
} from "../lib/interest-vector";
import {
  enqueue,
  dequeue,
  incrementRetry,
  getQueue,
  getPendingCount,
  updateBadge,
} from "../lib/offline-queue";
import type { ExtensionMessage, SavePayload, DuplicateResult } from "../lib/types";

/**
 * Background service worker.
 * Handles: screenshot capture, bookmark saving, tag generation, Supabase sync.
 */

// Initialize domain intelligence cache on service worker startup
initCache().catch((err) =>
  console.warn("Domain intelligence init failed:", err)
);
setupCacheRefresh();

// Initialize collective intelligence cache
initCollectiveCache().catch((err) =>
  console.warn("Collective intelligence init failed:", err)
);
setupCollectiveRefresh();

// Initialize user preferences (vocabulary + interest vector)
initVocabCache().catch((err) =>
  console.warn("Vocab cache init failed:", err)
);
setupVocabRefresh();

initInterestVector().catch((err) =>
  console.warn("Interest vector init failed:", err)
);
setupInterestRefresh();

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
  const [header, base64] = dataUrl.split(",") as [string, string];
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

// ---------- Duplicate check ----------

async function checkDuplicate(url: string): Promise<DuplicateResult> {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { exists: false };

  const { data: bookmark } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .eq("url", url)
    .maybeSingle();

  if (!bookmark) return { exists: false };

  // Fetch associated tag names
  const { data: tagRows } = await supabase
    .from("bookmark_tags")
    .select("tags(name)")
    .eq("bookmark_id", bookmark.id);

  const tags =
    tagRows
      ?.map((r: Record<string, unknown>) => {
        const t = r.tags as { name: string } | null;
        return t?.name;
      })
      .filter(Boolean) as string[] ?? [];

  return { exists: true, bookmark, tags };
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

  // Generate tags (Tier 1: rule-based), normalize via aliases, filter removed
  const tagResult = generateTags(payload.meta);
  tagResult.topics = tagResult.topics.map(normalizeTag);

  // Apply user's vocabulary overrides (e.g. "ml" → "machine-learning")
  tagResult.topics = applyVocabulary(tagResult.topics);

  // Apply interest-aware boosting (reorder topics by user's historical interests)
  tagResult.topics = boostWithInterests(tagResult.topics);

  if (payload.removedTopics?.length) {
    const removed = new Set(payload.removedTopics.map(normalizeTag));
    tagResult.topics = tagResult.topics.filter((t) => !removed.has(t));
  }

  // Learn vocabulary from user edits (detect tag renames)
  if (payload.removedTopics?.length && payload.userTags.length) {
    learnVocabulary(
      payload.removedTopics.map(normalizeTag),
      payload.userTags.map(normalizeTag)
    ).catch(() => {}); // fire-and-forget
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
            source: payload.aiSource ?? "ai_tier1",
            confidence: tagResult.confidence,
          },
          { onConflict: "bookmark_id,tag_id" }
        )
        .select();
    }
  }

  // Create/link user-added tags (normalized)
  for (const rawTagName of payload.userTags) {
    const tagName = normalizeTag(rawTagName);
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

  // Create/link accepted collective tags
  if (payload.acceptedCollectiveTags?.length) {
    for (const tagName of payload.acceptedCollectiveTags) {
      const normalized = normalizeTag(tagName);
      const { data: tag } = await supabase
        .from("tags")
        .upsert(
          { user_id: user.id, name: normalized },
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
              source: "collective",
              confidence: 0.8,
            },
            { onConflict: "bookmark_id,tag_id" }
          )
          .select();
      }
    }
  }

  // Record feedback (fire-and-forget — doesn't block save)
  // Removed tier 1 topics
  if (payload.removedTopics?.length) {
    for (const topic of payload.removedTopics) {
      recordFeedback(user.id, payload.url, normalizeTag(topic), "remove", "tier1");
    }
  }
  // Removed collective tags
  if (payload.removedCollectiveTags?.length) {
    for (const tag of payload.removedCollectiveTags) {
      recordFeedback(user.id, payload.url, normalizeTag(tag), "remove", "collective");
    }
  }
  // Accepted collective tags
  if (payload.acceptedCollectiveTags?.length) {
    for (const tag of payload.acceptedCollectiveTags) {
      recordFeedback(user.id, payload.url, normalizeTag(tag), "accept", "collective");
    }
  }
  // User-added tags
  for (const tag of payload.userTags) {
    recordFeedback(user.id, payload.url, normalizeTag(tag), "add", "user");
  }
}

// ---------- Offline queue helpers ----------

const NETWORK_ERROR_PATTERNS = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "net::err_",
  "the internet connection appears to be offline",
  "load failed",
];

function isNetworkError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((p) => msg.includes(p));
}

async function processQueue(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  for (const item of queue) {
    try {
      await saveBookmark(item.payload);
      await dequeue(item.id);
    } catch (err) {
      if (isNetworkError(err)) {
        // Still offline — stop processing
        break;
      }
      // Other error (auth, server) — increment retry, continue
      await incrementRetry(item.id);
    }
  }
  await updateBadge();
}

// ---------- Message listener ----------

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === "SAVE_BOOKMARK") {
      saveBookmark(message.data)
        .then(() => sendResponse({ type: "SAVE_RESULT", success: true }))
        .catch(async (err) => {
          if (isNetworkError(err)) {
            await enqueue(message.data);
            await updateBadge();
            sendResponse({
              type: "SAVE_RESULT",
              success: false,
              error: "__OFFLINE__",
            });
          } else {
            sendResponse({
              type: "SAVE_RESULT",
              success: false,
              error: err.message,
            });
          }
        });
      return true;
    }

    if (message.type === "CHECK_DUPLICATE") {
      checkDuplicate(message.url)
        .then((data) =>
          sendResponse({ type: "DUPLICATE_RESULT", data })
        )
        .catch(() =>
          sendResponse({ type: "DUPLICATE_RESULT", data: { exists: false } })
        );
      return true;
    }

    if (message.type === "GET_QUEUE_STATUS") {
      getPendingCount()
        .then((count) =>
          sendResponse({ type: "QUEUE_STATUS", count })
        )
        .catch(() =>
          sendResponse({ type: "QUEUE_STATUS", count: 0 })
        );
      return true;
    }
  }
);

// ---------- Offline queue: process on startup, install, and alarm ----------

chrome.runtime.onStartup.addListener(() => {
  processQueue().catch(() => {});
});

chrome.runtime.onInstalled.addListener(() => {
  // Create recurring alarm for queue retry (every 5 minutes)
  chrome.alarms.create("offline-queue-retry", { periodInMinutes: 5 });
  processQueue().catch(() => {});
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "offline-queue-retry") {
    processQueue().catch(() => {});
  }
  // User preferences cache refresh
  handleVocabAlarm(alarm.name).catch(() => {});
  handleInterestAlarm(alarm.name).catch(() => {});
});

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
      } catch (_err) {
        chrome.action.setBadgeText({ text: "!", tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "", tabId: tab.id });
        }, 2000);
      }
    }
  }
});
