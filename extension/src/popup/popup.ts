import { getSupabase } from "../lib/supabase";
import { generateTags, mergeWithCollective } from "../lib/tagger";
import { generateTagsWithAI } from "../lib/ai-tagger-orchestrator";
import { fetchConsensusTags } from "../lib/collective-intelligence";
import type { PageMeta, ExtensionMessage, DisplayTag, DuplicateResult, TagResult } from "../lib/types";

// ─── DOM Elements ────────────────────────────────────────────

const authView = document.getElementById("auth-view") as HTMLDivElement;
const saveView = document.getElementById("save-view") as HTMLDivElement;
const successView = document.getElementById("success-view") as HTMLDivElement;

// Auth
const btnGoogleSignin = document.getElementById("btn-google-signin") as HTMLButtonElement;
const authError = document.getElementById("auth-error") as HTMLParagraphElement;

// Save — account bar
const userAvatar = document.getElementById("user-avatar") as HTMLImageElement;
const userName = document.getElementById("user-name") as HTMLSpanElement;
const btnSignout = document.getElementById("btn-signout") as HTMLButtonElement;

// Save — duplicate banner
const duplicateBanner = document.getElementById("duplicate-banner") as HTMLDivElement;
const duplicateDate = document.getElementById("duplicate-date") as HTMLSpanElement;

// Save — form
const inputTitle = document.getElementById("input-title") as HTMLInputElement;
const displayUrl = document.getElementById("display-url") as HTMLSpanElement;
const favicon = document.getElementById("favicon") as HTMLImageElement;
const tagsPreview = document.getElementById("tags-preview") as HTMLDivElement;
const inputUserTags = document.getElementById("input-user-tags") as HTMLInputElement;
const toggleScreenshot = document.getElementById("toggle-screenshot") as HTMLInputElement;
const screenshotPreview = document.getElementById("screenshot-preview") as HTMLDivElement;
const screenshotImg = document.getElementById("screenshot-img") as HTMLImageElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const saveStatus = document.getElementById("save-status") as HTMLDivElement;
const btnDashboardFooter = document.getElementById("btn-dashboard-footer") as HTMLButtonElement;

// Success
const successLoading = document.getElementById("success-loading") as HTMLDivElement;
const successSaved = document.getElementById("success-saved") as HTMLDivElement;
const btnOpenDashboard = document.getElementById("btn-open-dashboard") as HTMLButtonElement;
const timerProgress = document.getElementById("timer-progress") as HTMLDivElement;
const successScreenshot = document.getElementById("success-screenshot") as HTMLDivElement;
const successScreenshotImg = document.getElementById("success-screenshot-img") as HTMLImageElement;
const successTitle = document.getElementById("success-title") as HTMLParagraphElement;
const successFavicon = document.getElementById("success-favicon") as HTMLImageElement;
const successDomain = document.getElementById("success-domain") as HTMLSpanElement;
const successTags = document.getElementById("success-tags") as HTMLDivElement;

// ─── State ───────────────────────────────────────────────────

let currentMeta: PageMeta | null = null;
let currentScreenshotUrl: string | null = null;
let removedTopics: Set<string> = new Set();
let removedCollectiveTags: Set<string> = new Set();
let acceptedCollectiveTags: Set<string> = new Set();
let currentDisplayTags: DisplayTag[] = [];
let isDuplicate = false;
let currentAISource: "ai_tier1" | "ai_tier2" | "ai_tier3" = "ai_tier1";

// ─── View Management ─────────────────────────────────────────

function showView(view: "auth" | "save" | "success") {
  authView.style.display = view === "auth" ? "flex" : "none";
  saveView.style.display = view === "save" ? "flex" : "none";
  successView.style.display = view === "success" ? "flex" : "none";
}

// ─── User Profile ────────────────────────────────────────────

async function populateAccountBar(): Promise<void> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata ?? {};
  const name = meta.full_name || meta.name || user.email || "User";
  const avatarUrl = meta.avatar_url || meta.picture || "";

  userName.textContent = name;
  if (avatarUrl) {
    userAvatar.src = avatarUrl;
    userAvatar.style.display = "block";
  } else {
    userAvatar.style.display = "none";
  }
}

// ─── Auth ────────────────────────────────────────────────────

async function checkAuth(): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

btnGoogleSignin.addEventListener("click", async () => {
  btnGoogleSignin.disabled = true;
  authError.textContent = "";

  try {
    const supabase = getSupabase();
    const redirectUrl = chrome.identity.getRedirectURL();

    // Step 1: Get the OAuth URL from Supabase (skip browser redirect)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        skipBrowserRedirect: true,
        redirectTo: redirectUrl,
      },
    });

    if (error || !data.url) {
      authError.textContent = error?.message ?? "Failed to start sign-in.";
      btnGoogleSignin.disabled = false;
      return;
    }

    // Step 2: Open Chrome's auth flow (handles the OAuth popup properly)
    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true,
    });

    if (!responseUrl) {
      authError.textContent = "Sign-in was cancelled.";
      btnGoogleSignin.disabled = false;
      return;
    }

    // Step 3: Parse tokens from the response URL hash fragment
    const url = new URL(responseUrl);
    // Supabase returns tokens in the hash fragment
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      authError.textContent = "Failed to complete sign-in. Missing tokens.";
      btnGoogleSignin.disabled = false;
      return;
    }

    // Step 4: Set the session in Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      authError.textContent = sessionError.message;
      btnGoogleSignin.disabled = false;
      return;
    }

    // Success — show save view
    await initSaveView();
  } catch (err) {
    authError.textContent = err instanceof Error ? err.message : "Sign-in failed.";
    btnGoogleSignin.disabled = false;
  }
});

btnSignout.addEventListener("click", async () => {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  showView("auth");
  btnGoogleSignin.disabled = false;
  authError.textContent = "";
});

// ─── Page Meta & Screenshot ──────────────────────────────────

async function getPageMeta(): Promise<PageMeta | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "GET_PAGE_META",
    } as ExtensionMessage);

    return response?.data ?? null;
  } catch {
    // Content script may not be injected (e.g., chrome:// pages)
    return null;
  }
}

async function captureScreenshotPreview(): Promise<string | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "jpeg",
      quality: 70,
    });
    return dataUrl;
  } catch {
    return null;
  }
}

// ─── Tag Rendering ───────────────────────────────────────

let currentTagResult: ReturnType<typeof generateTags> | null = null;

function renderTagsPreview(tagResult: ReturnType<typeof generateTags>) {
  currentTagResult = tagResult;
  let html = "";
  html += `<span class="tag tag-category">${tagResult.category}</span>`;
  if (tagResult.domainContext) {
    html += `<span class="tag tag-domain">${tagResult.domainContext}</span>`;
  }
  html += tagResult.topics
    .filter((t) => !removedTopics.has(t))
    .map(
      (t) =>
        `<span class="tag tag-topic">${t}<button class="tag-remove" data-topic="${t}" aria-label="Remove ${t}">&times;</button></span>`
    )
    .join("");
  tagsPreview.innerHTML = html;

  // Attach remove handlers
  tagsPreview.querySelectorAll(".tag-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const topic = (btn as HTMLButtonElement).dataset.topic;
      if (topic) {
        removedTopics.add(topic);
        renderTagsPreview(tagResult);
      }
    });
  });
}

/**
 * Render unified display tags (Tier 1 + collective consensus + keyword patterns).
 * Replaces the basic topic rendering with source-aware styling.
 */
function renderDisplayTags(
  tagResult: ReturnType<typeof generateTags>,
  displayTags: DisplayTag[]
) {
  currentTagResult = tagResult;
  currentDisplayTags = displayTags;

  let html = "";

  // Category + domain context (unchanged)
  html += `<span class="tag tag-category">${tagResult.category}</span>`;
  if (tagResult.domainContext) {
    html += `<span class="tag tag-domain">${tagResult.domainContext}</span>`;
  }

  // Display tags with source-aware styling
  for (const dt of displayTags) {
    // Skip removed tags based on source
    if (dt.source === "tier1" && removedTopics.has(dt.name)) continue;
    if (
      (dt.source === "collective_consensus" || dt.source === "collective_keyword") &&
      removedCollectiveTags.has(dt.name)
    ) continue;

    const isCollective = dt.source === "collective_consensus" || dt.source === "collective_keyword";
    const tagClasses = [
      "tag",
      "tag-topic",
      isCollective ? "tag-collective" : "",
      dt.isSuggested ? "tag-suggested" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const tooltip = isCollective ? ' title="Community tag"' : "";
    const dataSource = isCollective ? "collective" : "tier1";

    html += `<span class="${tagClasses}"${tooltip}>${dt.name}<button class="tag-remove" data-topic="${dt.name}" data-source="${dataSource}" aria-label="Remove ${dt.name}">&times;</button></span>`;
  }

  tagsPreview.innerHTML = html;

  // Attach remove handlers
  tagsPreview.querySelectorAll(".tag-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const topic = (btn as HTMLButtonElement).dataset.topic;
      const source = (btn as HTMLButtonElement).dataset.source;
      if (topic) {
        if (source === "collective") {
          removedCollectiveTags.add(topic);
        } else {
          removedTopics.add(topic);
        }
        renderDisplayTags(tagResult, displayTags);
      }
    });
  });
}

// ─── Save View Init ──────────────────────────────────────────

async function initSaveView() {
  showView("save");
  saveStatus.textContent = "Loading page info...";
  btnSave.disabled = true;

  // Populate account bar
  await populateAccountBar();

  // Get page meta from content script
  currentMeta = await getPageMeta();

  if (!currentMeta) {
    // Fallback: get basic info from tabs API
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentMeta = {
      url: tab?.url ?? "",
      title: tab?.title ?? "",
      description: "",
      favicon: tab?.favIconUrl ?? "",
      ogImage: "",
      metaKeywords: [],
      articleTags: [],
      jsonLdType: null,
      headings: [],
    };
  }

  // Fill form
  inputTitle.value = currentMeta.title;
  displayUrl.textContent = currentMeta.url;
  favicon.src = currentMeta.favicon;
  favicon.onerror = () => { favicon.style.display = "none"; };

  // Check for duplicate (async, non-blocking)
  isDuplicate = false;
  duplicateBanner.style.display = "none";
  btnSave.textContent = "Save";
  chrome.runtime.sendMessage(
    { type: "CHECK_DUPLICATE", url: currentMeta.url } as ExtensionMessage
  ).then((resp: { data: DuplicateResult } | undefined) => {
    if (resp?.data?.exists) {
      isDuplicate = true;
      const savedDate = resp.data.bookmark?.created_at
        ? new Date(resp.data.bookmark.created_at).toLocaleDateString()
        : "";
      duplicateDate.textContent = savedDate ? `on ${savedDate}` : "";
      duplicateBanner.style.display = "flex";
      btnSave.textContent = "Update";
    }
  }).catch(() => {
    // Duplicate check failed — proceed normally
  });

  // Check offline queue status
  chrome.runtime.sendMessage(
    { type: "GET_QUEUE_STATUS" } as ExtensionMessage
  ).then((resp: { count: number } | undefined) => {
    if (resp?.count && resp.count > 0) {
      saveStatus.innerHTML = `<span class="save-queued-info">${resp.count} bookmark(s) pending sync</span>`;
    }
  }).catch(() => {});

  // Generate tags with AI orchestration (Tier 1 → 2 → 3)
  removedTopics = new Set();
  removedCollectiveTags = new Set();
  acceptedCollectiveTags = new Set();
  currentAISource = "ai_tier1";

  // Helper to fetch consensus and merge with a given tagResult
  const fetchAndMergeConsensus = (tagResult: TagResult) => {
    if (!currentMeta) return;
    fetchConsensusTags(currentMeta.url).then((consensusTags) => {
      if (consensusTags.length > 0 && currentMeta) {
        const displayTags = mergeWithCollective(tagResult, consensusTags, currentMeta.title);
        for (const dt of displayTags) {
          if (dt.source === "collective_consensus" || dt.source === "collective_keyword") {
            acceptedCollectiveTags.add(dt.name);
          }
        }
        renderDisplayTags(tagResult, displayTags);
      }
    }).catch(() => {});
  };

  const metaForAI = currentMeta;
  generateTagsWithAI(
    metaForAI,
    // onTier1 — immediate render
    ({ tagResult, source }) => {
      currentAISource = source;
      renderTagsPreview(tagResult);
      fetchAndMergeConsensus(tagResult);
    },
    // onUpgrade — AI tags replace Tier 1
    ({ tagResult, source }) => {
      currentAISource = source;
      removedTopics = new Set();
      acceptedCollectiveTags = new Set();
      renderTagsPreview(tagResult);
      fetchAndMergeConsensus(tagResult);
    }
  ).catch(() => {
    // AI orchestration failed — Tier 1 already rendered
  });

  // Capture screenshot preview
  currentScreenshotUrl = await captureScreenshotPreview();
  if (currentScreenshotUrl) {
    screenshotImg.src = currentScreenshotUrl;
    screenshotPreview.classList.remove("hidden");
  } else {
    screenshotPreview.classList.add("hidden");
    toggleScreenshot.checked = false;
  }

  saveStatus.textContent = "";
  btnSave.disabled = false;
}

// ─── Toggle screenshot preview ───────────────────────────────

toggleScreenshot.addEventListener("change", () => {
  if (toggleScreenshot.checked && currentScreenshotUrl) {
    screenshotPreview.classList.remove("hidden");
  } else {
    screenshotPreview.classList.add("hidden");
  }
});

// ─── Save ────────────────────────────────────────────────────

function showSaveError(message: string) {
  saveStatus.innerHTML = `<span class="save-error"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}</span>`;
}

function showSaveQueued(pendingCount: number) {
  saveStatus.innerHTML = `<span class="save-queued">Saved offline — will sync when online (${pendingCount} pending)</span>`;
}

btnSave.addEventListener("click", async () => {
  if (!currentMeta) return;

  btnSave.disabled = true;

  // Immediately switch to success view with loading spinner
  showSavingState();

  try {
    // Send save to background service worker
    // Parse comma-separated user tags
    const userTags = inputUserTags.value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    // Compute final accepted collective tags (shown minus removed)
    const finalAccepted = [...acceptedCollectiveTags].filter(
      (t) => !removedCollectiveTags.has(t)
    );

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      data: {
        url: currentMeta.url,
        title: inputTitle.value,
        userTags,
        captureScreenshot: toggleScreenshot.checked,
        meta: currentMeta,
        removedTopics: [...removedTopics],
        acceptedCollectiveTags: finalAccepted,
        removedCollectiveTags: [...removedCollectiveTags],
        aiSource: currentAISource,
      },
    } as ExtensionMessage);

    if (response?.success) {
      showSuccessWithPreview();
    } else if (response?.error === "__OFFLINE__") {
      // Go back to save view for offline state
      showView("save");
      const queueResp = await chrome.runtime.sendMessage({
        type: "GET_QUEUE_STATUS",
      } as ExtensionMessage);
      showSaveQueued(queueResp?.count ?? 1);
      btnSave.disabled = false;
    } else {
      showView("save");
      showSaveError(response?.error ?? "Failed to save.");
      btnSave.disabled = false;
    }
  } catch (err) {
    showView("save");
    showSaveError(err instanceof Error ? err.message : "Failed to save.");
    btnSave.disabled = false;
  }
});

// ─── Dashboard links ─────────────────────────────────────────

function openDashboard() {
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? "http://localhost:3000";
  chrome.tabs.create({ url: dashboardUrl });
  window.close();
}

btnOpenDashboard.addEventListener("click", openDashboard);
btnDashboardFooter.addEventListener("click", openDashboard);

// ─── Success with Preview + Auto-Dismiss ─────────────────────

const AUTO_DISMISS_MS = 2000;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function showSavingState() {
  // Show success view with loading spinner, hide saved content
  successLoading.style.display = "flex";
  successSaved.style.display = "none";
  timerProgress.style.transition = "none";
  timerProgress.style.width = "0%";
  showView("success");
}

function showSuccessWithPreview() {
  // Switch from loading to saved content
  successLoading.style.display = "none";
  successSaved.style.display = "flex";

  // Populate preview from current save data
  successTitle.textContent = inputTitle.value || currentMeta?.url || "";

  // Domain
  try {
    const hostname = new URL(currentMeta?.url ?? "").hostname;
    successDomain.textContent = hostname;
  } catch {
    successDomain.textContent = "";
  }

  // Favicon
  if (currentMeta?.favicon) {
    successFavicon.src = currentMeta.favicon;
    successFavicon.style.display = "block";
    successFavicon.onerror = () => { successFavicon.style.display = "none"; };
  } else {
    successFavicon.style.display = "none";
  }

  // Screenshot
  if (currentScreenshotUrl && toggleScreenshot.checked) {
    successScreenshotImg.src = currentScreenshotUrl;
    successScreenshot.classList.remove("hidden");
  } else {
    successScreenshot.classList.add("hidden");
  }

  // Tags
  let tagsHtml = "";
  if (currentTagResult) {
    if (currentTagResult.category && currentTagResult.category !== "Other") {
      tagsHtml += `<span class="tag tag-category">${currentTagResult.category}</span>`;
    }
    const topics = currentTagResult.topics.filter((t) => !removedTopics.has(t));
    for (const t of topics.slice(0, 3)) {
      tagsHtml += `<span class="tag tag-topic">${t}</span>`;
    }
  }
  successTags.innerHTML = tagsHtml;

  // Show view
  showView("success");

  // Start timer bar animation: reset to full, then animate to 0
  timerProgress.style.transition = "none";
  timerProgress.style.width = "100%";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      timerProgress.style.transition = `width ${AUTO_DISMISS_MS}ms linear`;
      timerProgress.style.width = "0%";
    });
  });

  // Auto-close popup when timer finishes
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    window.close();
  }, AUTO_DISMISS_MS);
}

// Pause timer on hover (user is reading/clicking)
const successViewEl = document.getElementById("success-view") as HTMLDivElement;
successViewEl.addEventListener("mouseenter", () => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  // Freeze at current width
  const computedWidth = timerProgress.getBoundingClientRect().width;
  const parentWidth = timerProgress.parentElement!.getBoundingClientRect().width;
  const pct = parentWidth > 0 ? (computedWidth / parentWidth) * 100 : 0;
  timerProgress.style.transition = "none";
  timerProgress.style.width = `${pct}%`;
});

successViewEl.addEventListener("mouseleave", () => {
  // Resume from current position
  const currentPct = parseFloat(timerProgress.style.width) || 0;
  const remainingMs = (currentPct / 100) * AUTO_DISMISS_MS;
  if (remainingMs <= 100) {
    window.close();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      timerProgress.style.transition = `width ${remainingMs}ms linear`;
      timerProgress.style.width = "0%";
    });
  });
  dismissTimer = setTimeout(() => {
    window.close();
  }, remainingMs);
});

// ─── Init ────────────────────────────────────────────────────

(async () => {
  try {
    const isAuthed = await checkAuth();
    if (isAuthed) {
      await initSaveView();
    } else {
      showView("auth");
    }
  } catch {
    showView("auth");
  }
})();
