import { getSupabase } from "../lib/supabase";
import { generateTags, mergeWithCollective } from "../lib/tagger";
import { generateTagsWithAI } from "../lib/ai-tagger-orchestrator";
import { fetchConsensusTags, normalizeTag } from "../lib/collective-intelligence";
import { initVocabCache, applyVocabulary } from "../lib/user-preferences";
import { initInterestVector, boostWithInterests } from "../lib/interest-vector";
import type { PageMeta, ExtensionMessage, DisplayTag, DuplicateResult, TagResult } from "../lib/types";

// ─── DOM Elements ────────────────────────────────────────────

const authView = document.getElementById("auth-view") as HTMLDivElement;
const saveView = document.getElementById("save-view") as HTMLDivElement;
const successView = document.getElementById("success-view") as HTMLDivElement;

// Auth
const btnGoogleSignin = document.getElementById("btn-google-signin") as HTMLButtonElement;
const authError = document.getElementById("auth-error") as HTMLParagraphElement;

// Header
const userAvatarImg = document.getElementById("user-avatar-img") as HTMLImageElement;
const userAvatarInitial = document.getElementById("user-avatar-initial") as HTMLSpanElement;
const userName = document.getElementById("user-name") as HTMLSpanElement;
const btnDashboardHeader = document.getElementById("btn-dashboard-header") as HTMLButtonElement;

// Save — form
const inputTitle = document.getElementById("input-title") as HTMLInputElement;
const titleClear = document.getElementById("title-clear") as HTMLButtonElement;
const displayUrl = document.getElementById("display-url") as HTMLSpanElement;
const tagsPreview = document.getElementById("tags-preview") as HTMLDivElement;
const inputUserTags = document.getElementById("input-user-tags") as HTMLInputElement;
const screenshotPreview = document.getElementById("screenshot-preview") as HTMLDivElement;
const screenshotImg = document.getElementById("screenshot-img") as HTMLImageElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const duplicateBanner = document.getElementById("duplicate-banner") as HTMLDivElement;
const skeletonLoader = document.getElementById("skeleton-loader") as HTMLDivElement;
const contentLoaded = document.getElementById("content-loaded") as HTMLDivElement;
const btnStickyWrap = document.getElementById("btn-sticky-wrap") as HTMLDivElement;

// Status states
const statusSaving = document.getElementById("status-saving") as HTMLDivElement;
const statusError = document.getElementById("status-error") as HTMLDivElement;
const statusSuccess = document.getElementById("status-success") as HTMLDivElement;
const errorText = document.getElementById("error-text") as HTMLSpanElement;

// Success
const btnOpenDashboard = document.getElementById("btn-open-dashboard") as HTMLButtonElement;
const timerProgress = document.getElementById("timer-progress") as HTMLDivElement;
const successScreenshot = document.getElementById("success-screenshot") as HTMLDivElement;
const successScreenshotImg = document.getElementById("success-screenshot-img") as HTMLImageElement;

// ─── State ───────────────────────────────────────────────────

let currentMeta: PageMeta | null = null;
let currentScreenshotUrl: string | null = null;
let removedTopics: Set<string> = new Set();
let removedCollectiveTags: Set<string> = new Set();
let acceptedCollectiveTags: Set<string> = new Set();
let currentAISource: "ai_tier1" | "ai_tier2" | "ai_tier3" = "ai_tier1";
let isDuplicate = false;
let savedTitle = "";
let savedTags: Set<string> = new Set();

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
  const fullName = meta.full_name || meta.name || user.email || "User";
  const avatarUrl = meta.avatar_url || meta.picture || "";

  // Show first name only
  const firstName = fullName.includes("@")
    ? fullName.split("@")[0]
    : fullName.split(" ")[0];

  userName.textContent = firstName;

  // Avatar: show profile picture if available, initials as fallback
  const initial = firstName.charAt(0).toUpperCase();
  if (avatarUrl) {
    userAvatarImg.src = avatarUrl;
    userAvatarImg.style.display = "block";
    userAvatarInitial.style.display = "none";
    userAvatarImg.onerror = () => {
      userAvatarImg.style.display = "none";
      userAvatarInitial.style.display = "";
      userAvatarInitial.textContent = initial;
    };
  } else {
    userAvatarImg.style.display = "none";
    userAvatarInitial.style.display = "";
    userAvatarInitial.textContent = initial;
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

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: data.url,
      interactive: true,
    });

    if (!responseUrl) {
      authError.textContent = "Sign-in was cancelled!";
      btnGoogleSignin.disabled = false;
      return;
    }

    const url = new URL(responseUrl);
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      authError.textContent = "Failed to complete sign-in. Missing tokens.";
      btnGoogleSignin.disabled = false;
      return;
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      authError.textContent = sessionError.message;
      btnGoogleSignin.disabled = false;
      return;
    }

    await initSaveView();
  } catch (err) {
    authError.textContent = err instanceof Error ? err.message : "Sign-in failed.";
    btnGoogleSignin.disabled = false;
  }
});

// ─── Title Input Clear Button ─────────────────────────────────

function updateTitleClear() {
  titleClear.classList.toggle("hidden", !inputTitle.value);
}

inputTitle.addEventListener("input", () => {
  updateTitleClear();
  checkDuplicateChanges();
});
titleClear.addEventListener("click", () => {
  inputTitle.value = "";
  updateTitleClear();
  checkDuplicateChanges();
  inputTitle.focus();
});
inputUserTags.addEventListener("input", checkDuplicateChanges);

function getCurrentTagNames(): Set<string> {
  const tags = new Set<string>();
  // Get topic/custom tags from data-topic attributes (reliable, no text parsing)
  tagsPreview.querySelectorAll(".ext-tag-remove").forEach((btn) => {
    const topic = (btn as HTMLButtonElement).dataset.topic;
    if (topic) tags.add(topic);
  });
  // Include user-typed tags from input
  inputUserTags.value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .forEach((t) => tags.add(t));
  return tags;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

function checkDuplicateChanges() {
  if (!isDuplicate) return;
  const titleChanged = inputTitle.value !== savedTitle;
  const tagsChanged = !setsEqual(getCurrentTagNames(), savedTags);
  btnSave.disabled = !(titleChanged || tagsChanged);
}

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

// ─── Tag Normalization (match service worker pipeline) ────

function normalizeTopics(topics: string[]): string[] {
  let result = topics.map(normalizeTag);
  result = applyVocabulary(result);
  result = boostWithInterests(result);
  // Deduplicate (normalization may merge names)
  const seen = new Set<string>();
  return result.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

// ─── Tag Rendering ───────────────────────────────────────

function renderTagsPreview(tagResult: ReturnType<typeof generateTags>) {
  // Normalize topics to match what the service worker saves
  tagResult.topics = normalizeTopics(tagResult.topics);

  let html = "";
  html += `<span class="ext-tag ext-tag--category">${tagResult.category}</span>`;
  if (tagResult.domainContext) {
    html += `<span class="ext-tag ext-tag--domain">${tagResult.domainContext}</span>`;
  }
  html += tagResult.topics
    .filter((t) => !removedTopics.has(t))
    .map(
      (t) =>
        `<span class="ext-tag ext-tag--custom">${t}<button class="ext-tag-remove" data-topic="${t}" aria-label="Remove ${t}">&times;</button></span>`
    )
    .join("");
  tagsPreview.innerHTML = html;

  attachTagRemoveHandlers(tagResult);
  checkDuplicateChanges();
}

function renderDisplayTags(
  tagResult: ReturnType<typeof generateTags>,
  displayTags: DisplayTag[]
) {
  // Normalize topics to match what the service worker saves
  tagResult.topics = normalizeTopics(tagResult.topics);
  // Also normalize display tag names
  for (const dt of displayTags) {
    dt.name = normalizeTag(dt.name);
  }

  let html = "";

  html += `<span class="ext-tag ext-tag--category">${tagResult.category}</span>`;
  if (tagResult.domainContext) {
    html += `<span class="ext-tag ext-tag--domain">${tagResult.domainContext}</span>`;
  }

  for (const dt of displayTags) {
    if (dt.source === "tier1" && removedTopics.has(dt.name)) continue;
    if (
      (dt.source === "collective_consensus" || dt.source === "collective_keyword") &&
      removedCollectiveTags.has(dt.name)
    ) continue;

    const dataSource = (dt.source === "collective_consensus" || dt.source === "collective_keyword")
      ? "collective" : "tier1";

    html += `<span class="ext-tag ext-tag--custom">${dt.name}<button class="ext-tag-remove" data-topic="${dt.name}" data-source="${dataSource}" aria-label="Remove ${dt.name}">&times;</button></span>`;
  }

  tagsPreview.innerHTML = html;

  // Attach remove handlers
  tagsPreview.querySelectorAll(".ext-tag-remove").forEach((btn) => {
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
        checkDuplicateChanges();
      }
    });
  });
}

function attachTagRemoveHandlers(tagResult: ReturnType<typeof generateTags>) {
  tagsPreview.querySelectorAll(".ext-tag-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const topic = (btn as HTMLButtonElement).dataset.topic;
      if (topic) {
        removedTopics.add(topic);
        renderTagsPreview(tagResult);
        checkDuplicateChanges();
      }
    });
  });
}

// ─── Save View Init ──────────────────────────────────────────

/** Show skeleton, hide real content and button */
function showSkeleton() {
  skeletonLoader.style.display = "flex";
  skeletonLoader.classList.remove("ext-hiding");
  contentLoaded.style.display = "none";
  contentLoaded.classList.remove("ext-fade-in");
  btnStickyWrap.style.display = "none";
  btnStickyWrap.classList.remove("ext-fade-in");
}

/** Fade out skeleton, then fade in real content and button */
function revealContent() {
  // Fade out skeleton
  skeletonLoader.classList.add("ext-hiding");
  setTimeout(() => {
    skeletonLoader.style.display = "none";
    // Fade in content
    contentLoaded.style.display = "flex";
    contentLoaded.classList.add("ext-fade-in");
    btnStickyWrap.style.display = "block";
    btnStickyWrap.classList.add("ext-fade-in");
  }, 200);
}

/** Mark body as ready — triggers the entrance animation */
function markReady() {
  document.body.classList.add("ext-ready");
}

/** Fade out body then close popup */
function closePopup() {
  document.body.classList.remove("ext-ready");
  document.body.classList.add("ext-closing");
  setTimeout(() => window.close(), 200);
}

async function initSaveView() {
  saveView.classList.remove("ext-hiding");
  showView("save");
  showSkeleton();
  btnSave.disabled = true;

  // Reset button and duplicate banner
  isDuplicate = false;
  savedTitle = "";
  savedTags = new Set();
  duplicateBanner.style.display = "none";
  btnSave.textContent = "Save to Nest";
  btnSave.classList.remove("ext-btn-save--update");

  // Populate account bar (shows immediately in header, above skeleton)
  await populateAccountBar();

  // Trigger entrance animation now that layout is ready
  markReady();

  // Get page meta from content script
  currentMeta = await getPageMeta();

  if (!currentMeta) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentMeta = {
      url: tab?.url ?? "",
      title: tab?.title ?? "",
      description: "",
      favicon: tab?.favIconUrl ?? "",
      ogImage: "",
      metaKeywords: [],
      articleTags: [],
      ogType: null,
      jsonLdType: null,
      headings: [],
    };
  }

  const meta = currentMeta;

  // Fill form (hidden behind skeleton)
  inputTitle.value = meta.title;
  updateTitleClear();
  displayUrl.textContent = meta.url;

  // Reset tag state
  removedTopics = new Set();
  removedCollectiveTags = new Set();
  acceptedCollectiveTags = new Set();
  currentAISource = "ai_tier1";

  // Run critical async ops in parallel behind the skeleton:
  // 1. Duplicate check
  // 2. Tier 1 tag generation (sync, but wrapped in AI orchestrator)
  // 3. Screenshot capture
  const duplicateCheck = chrome.runtime.sendMessage(
    { type: "CHECK_DUPLICATE", url: meta.url } as ExtensionMessage
  ).then((resp: { data: DuplicateResult } | undefined) => {
    if (resp?.data?.exists) {
      isDuplicate = true;
      savedTitle = resp.data.bookmark?.title ?? inputTitle.value;
      savedTags = new Set<string>(resp.data.tags ?? []);
      duplicateBanner.style.display = "flex";
      btnSave.textContent = "Update";
      btnSave.classList.add("ext-btn-save--update");
      btnSave.disabled = true;
    }
  }).catch(() => {});

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

  // Tier 1 tags render synchronously inside onTier1 callback
  let tier1Ready: () => void;
  const tier1Promise = new Promise<void>((resolve) => { tier1Ready = resolve; });

  generateTagsWithAI(
    meta,
    ({ tagResult, source }) => {
      currentAISource = source;
      renderTagsPreview(tagResult);
      fetchAndMergeConsensus(tagResult);
      tier1Ready();
    },
    ({ tagResult, source }) => {
      // AI upgrade (Tier 2/3) — updates in place after reveal, which is fine
      currentAISource = source;
      removedTopics = new Set();
      acceptedCollectiveTags = new Set();
      renderTagsPreview(tagResult);
      fetchAndMergeConsensus(tagResult);
    }
  ).catch(() => {});

  const screenshotCapture = captureScreenshotPreview().then((url) => {
    currentScreenshotUrl = url;
    if (url) {
      screenshotImg.src = url;
      screenshotPreview.classList.remove("hidden");
    } else {
      screenshotPreview.classList.add("hidden");
    }
  });

  // Wait for all critical ops before revealing
  await Promise.all([duplicateCheck, tier1Promise, screenshotCapture]);

  // Reveal content and enable button
  revealContent();
  if (isDuplicate) {
    checkDuplicateChanges();
  } else {
    btnSave.disabled = false;
  }
}

// ─── Save ────────────────────────────────────────────────────

btnSave.addEventListener("click", async () => {
  if (!currentMeta) return;

  btnSave.disabled = true;
  showSavingState();

  try {
    const userTags = inputUserTags.value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const finalAccepted = [...acceptedCollectiveTags].filter(
      (t) => !removedCollectiveTags.has(t)
    );

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      data: {
        url: currentMeta.url,
        title: inputTitle.value,
        userTags,
        captureScreenshot: true,
        meta: currentMeta,
        removedTopics: [...removedTopics],
        acceptedCollectiveTags: finalAccepted,
        removedCollectiveTags: [...removedCollectiveTags],
        aiSource: currentAISource,
      },
    } as ExtensionMessage);

    if (response?.success) {
      showSuccessState();
    } else if (response?.error === "__OFFLINE__") {
      showView("save");
      btnSave.disabled = false;
    } else {
      showErrorState(response?.error ?? "Failed to save.");
    }
  } catch (err) {
    showErrorState(err instanceof Error ? err.message : "Failed to save.");
  }
});

// ─── Dashboard links ─────────────────────────────────────────

function openDashboard() {
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? "http://localhost:3000";
  chrome.tabs.create({ url: dashboardUrl });
  closePopup();
}

btnOpenDashboard.addEventListener("click", openDashboard);
btnDashboardHeader.addEventListener("click", openDashboard);

// ─── Status States ───────────────────────────────────────────

function showSavingState() {
  // Fade out save view, then swap to saving state
  saveView.classList.add("ext-hiding");
  setTimeout(() => {
    statusSaving.style.display = "flex";
    statusError.style.display = "none";
    statusSuccess.style.display = "none";
    showView("success");
    // Fade in the status view
    successView.classList.add("ext-fade-in");
  }, 250);
}

function showErrorState(message: string) {
  // Crossfade from saving → error
  statusSaving.style.display = "none";
  statusError.style.display = "flex";
  statusError.classList.add("ext-fade-in");
  statusSuccess.style.display = "none";
  errorText.textContent = message;
  showView("success");

  // Allow going back to save view by clicking
  statusError.onclick = () => {
    saveView.classList.remove("ext-hiding");
    showView("save");
    btnSave.disabled = false;
    statusError.onclick = null;
  };
}

function showSuccessState() {
  // Crossfade from saving → success
  statusSaving.style.display = "none";
  statusError.style.display = "none";
  statusSuccess.style.display = "flex";
  statusSuccess.classList.add("ext-fade-in");

  // Screenshot thumbnail
  if (currentScreenshotUrl) {
    successScreenshotImg.src = currentScreenshotUrl;
    successScreenshot.classList.remove("hidden");
  } else {
    successScreenshot.classList.add("hidden");
  }

  showView("success");

  // Start timer bar animation
  timerProgress.style.transition = "none";
  timerProgress.style.width = "100%";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      timerProgress.style.transition = `width ${AUTO_DISMISS_MS}ms linear`;
      timerProgress.style.width = "0%";
    });
  });

  // Auto-close popup
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = setTimeout(() => {
    closePopup();
  }, AUTO_DISMISS_MS);
}

// ─── Auto-Dismiss Timer ──────────────────────────────────────

const AUTO_DISMISS_MS = 3000;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

// Pause timer on hover
const successViewEl = document.getElementById("success-view") as HTMLDivElement;
successViewEl.addEventListener("mouseenter", () => {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  const computedWidth = timerProgress.getBoundingClientRect().width;
  const parentWidth = timerProgress.parentElement!.getBoundingClientRect().width;
  const pct = parentWidth > 0 ? (computedWidth / parentWidth) * 100 : 0;
  timerProgress.style.transition = "none";
  timerProgress.style.width = `${pct}%`;
});

successViewEl.addEventListener("mouseleave", () => {
  const currentPct = parseFloat(timerProgress.style.width) || 0;
  const remainingMs = (currentPct / 100) * AUTO_DISMISS_MS;
  if (remainingMs <= 100) {
    closePopup();
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      timerProgress.style.transition = `width ${remainingMs}ms linear`;
      timerProgress.style.width = "0%";
    });
  });
  dismissTimer = setTimeout(() => {
    closePopup();
  }, remainingMs);
});

// ─── Init ────────────────────────────────────────────────────

(async () => {
  try {
    // Initialize caches so tag normalization matches the service worker
    await Promise.all([initVocabCache(), initInterestVector()]);

    const isAuthed = await checkAuth();
    if (isAuthed) {
      await initSaveView();
    } else {
      showView("auth");
      markReady();
    }
  } catch {
    showView("auth");
  }
})();
