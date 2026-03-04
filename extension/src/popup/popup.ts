import { getSupabase } from "../lib/supabase";
import { generateTags } from "../lib/tagger";
import type { PageMeta, ExtensionMessage } from "../lib/types";

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
const btnOpenDashboard = document.getElementById("btn-open-dashboard") as HTMLButtonElement;
const btnSaveAnother = document.getElementById("btn-save-another") as HTMLButtonElement;

// ─── State ───────────────────────────────────────────────────

let currentMeta: PageMeta | null = null;
let currentScreenshotUrl: string | null = null;
let removedTopics: Set<string> = new Set();

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

  // Generate tags and show preview (3-layer taxonomy)
  removedTopics = new Set();
  const tagResult = generateTags(currentMeta);
  renderTagsPreview(tagResult);

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

btnSave.addEventListener("click", async () => {
  if (!currentMeta) return;

  btnSave.disabled = true;
  saveStatus.textContent = "Saving...";

  try {
    // Send save to background service worker
    // Parse comma-separated user tags
    const userTags = inputUserTags.value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const response = await chrome.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      data: {
        url: currentMeta.url,
        title: inputTitle.value,
        userTags,
        captureScreenshot: toggleScreenshot.checked,
        meta: currentMeta,
        removedTopics: [...removedTopics],
      },
    } as ExtensionMessage);

    if (response?.success) {
      showView("success");
    } else {
      saveStatus.textContent = response?.error ?? "Failed to save.";
      btnSave.disabled = false;
    }
  } catch (err) {
    saveStatus.textContent = err instanceof Error ? err.message : "Failed to save.";
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

// ─── Save Another ────────────────────────────────────────────

btnSaveAnother.addEventListener("click", async () => {
  await initSaveView();
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
