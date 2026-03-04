/**
 * Offline save queue — stores failed save payloads in chrome.storage.local
 * and retries them when connectivity returns.
 */

import type { SavePayload, QueuedBookmark } from "./types";

const QUEUE_KEY = "offline_save_queue";
const MAX_RETRIES = 10;

/** Get the current queue from storage. */
async function getQueueRaw(): Promise<QueuedBookmark[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY);
  return (result[QUEUE_KEY] as QueuedBookmark[]) ?? [];
}

/** Persist the queue to storage. */
async function setQueue(queue: QueuedBookmark[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

/** Add a save payload to the offline queue (deduplicates by URL). */
export async function enqueue(payload: SavePayload): Promise<void> {
  const queue = await getQueueRaw();

  // Deduplicate — replace existing entry for same URL
  const idx = queue.findIndex((q) => q.payload.url === payload.url);
  const entry: QueuedBookmark = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: Date.now(),
    retryCount: 0,
  };

  if (idx >= 0) {
    queue[idx] = entry;
  } else {
    queue.push(entry);
  }

  await setQueue(queue);
}

/** Remove an item from the queue after successful sync. */
export async function dequeue(id: string): Promise<void> {
  const queue = await getQueueRaw();
  await setQueue(queue.filter((q) => q.id !== id));
}

/** Increment retry count; discard if over max. */
export async function incrementRetry(id: string): Promise<void> {
  const queue = await getQueueRaw();
  const item = queue.find((q) => q.id === id);
  if (!item) return;

  item.retryCount++;
  if (item.retryCount >= MAX_RETRIES) {
    // Discard — too many failures
    await setQueue(queue.filter((q) => q.id !== id));
  } else {
    await setQueue(queue);
  }
}

/** Get a copy of the current queue. */
export async function getQueue(): Promise<QueuedBookmark[]> {
  return getQueueRaw();
}

/** Get the number of pending items. */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueueRaw();
  return queue.length;
}

/** Update the extension icon badge to show pending queue count. */
export async function updateBadge(): Promise<void> {
  const count = await getPendingCount();
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(count) });
    await chrome.action.setBadgeBackgroundColor({ color: "#F59E0B" });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}
