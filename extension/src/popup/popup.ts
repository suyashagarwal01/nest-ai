import { getSupabase } from "../lib/supabase";
import { generateTags } from "../lib/tagger";
import type { PageMeta, ExtensionMessage } from "../lib/types";

// ─── DOM Elements ────────────────────────────────────────────

const authView = document.getElementById("auth-view") as HTMLDivElement;
const saveView = document.getElementById("save-view") as HTMLDivElement;
const successView = document.getElementById("success-view") as HTMLDivElement;

// Auth
const btnGoogleSignin = document.getElementById("btn-google-signin") as HTMLButtonElement;
const btnEmailSignin = document.getElementById("btn-email-signin") as HTMLButtonElement;
const inputEmail = document.getElementById("input-email") as HTMLInputElement;
const inputPassword = document.getElementById("input-password") as HTMLInputElement;
const authError = document.getElementById("auth-error") as HTMLParagraphElement;

// Save
const inputTitle = document.getElementById("input-title") as HTMLInputElement;
const displayUrl = document.getElementById("display-url") as HTMLSpanElement;
const favicon = document.getElementById("favicon") as HTMLImageElement;
const tagsPreview = document.getElementById("tags-preview") as HTMLDivElement;
const inputNote = document.getElementById("input-note") as HTMLTextAreaElement;
const toggleScreenshot = document.getElementById("toggle-screenshot") as HTMLInputElement;
const screenshotPreview = document.getElementById("screenshot-preview") as HTMLDivElement;
const screenshotImg = document.getElementById("screenshot-img") as HTMLImageElement;
const btnSave = document.getElementById("btn-save") as HTMLButtonElement;
const saveStatus = document.getElementById("save-status") as HTMLDivElement;
const btnSignout = document.getElementById("btn-signout") as HTMLButtonElement;

// Success
const btnOpenDashboard = document.getElementById("btn-open-dashboard") as HTMLButtonElement;

// ─── State ───────────────────────────────────────────────────

let currentMeta: PageMeta | null = null;
let currentScreenshotUrl: string | null = null;

// ─── View Management ─────────────────────────────────────────

function showView(view: "auth" | "save" | "success") {
  authView.style.display = view === "auth" ? "flex" : "none";
  saveView.style.display = view === "save" ? "flex" : "none";
  successView.style.display = view === "success" ? "flex" : "none";
}

// ─── Auth ────────────────────────────────────────────────────

async function checkAuth(): Promise<boolean> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

btnGoogleSignin.addEventListener("click", async () => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Open in new tab since popup can't handle OAuth redirect
      redirectTo: chrome.identity.getRedirectURL(),
    },
  });
  if (error) {
    authError.textContent = error.message;
  }
});

btnEmailSignin.addEventListener("click", async () => {
  const email = inputEmail.value.trim();
  const password = inputPassword.value;
  if (!email || !password) {
    authError.textContent = "Please enter email and password.";
    return;
  }

  const supabase = getSupabase();

  // Try sign in first, then sign up if not found
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // If invalid credentials, try signup
    if (signInError.message.includes("Invalid login")) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        authError.textContent = signUpError.message;
        return;
      }
      authError.textContent = "";
      authError.style.color = "#22c55e";
      authError.textContent = "Account created! Check your email to confirm.";
      return;
    }
    authError.textContent = signInError.message;
    return;
  }

  authError.textContent = "";
  await initSaveView();
});

btnSignout.addEventListener("click", async () => {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  showView("auth");
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

// ─── Save View Init ──────────────────────────────────────────

async function initSaveView() {
  showView("save");
  saveStatus.textContent = "Loading page info...";
  btnSave.disabled = true;

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
    };
  }

  // Fill form
  inputTitle.value = currentMeta.title;
  displayUrl.textContent = currentMeta.url;
  favicon.src = currentMeta.favicon;
  favicon.onerror = () => { favicon.style.display = "none"; };

  // Generate tags and show preview
  const tagResult = generateTags(currentMeta);
  tagsPreview.innerHTML = tagResult.tags
    .map((t) => `<span class="tag">${t}</span>`)
    .join("");

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
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      data: {
        url: currentMeta.url,
        title: inputTitle.value,
        note: inputNote.value,
        captureScreenshot: toggleScreenshot.checked,
        meta: currentMeta,
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

// ─── Dashboard link ──────────────────────────────────────────

btnOpenDashboard.addEventListener("click", () => {
  const dashboardUrl = import.meta.env.VITE_DASHBOARD_URL ?? "http://localhost:3000";
  chrome.tabs.create({ url: dashboardUrl });
  window.close();
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
