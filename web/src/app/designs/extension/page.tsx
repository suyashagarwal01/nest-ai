"use client";

/**
 * Extension UI — all states + component interaction states rendered at 360px for Figma capture.
 */

/* ── Inline SVGs ─────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ── Design Tokens ─────────────────────────────────────── */

const t = {
  bg: "#FFFFFF", bgSec: "#F5F5F5", bgHover: "#E8E8E8",
  text: "#111111", textSec: "#666666", textTer: "#999999", textPh: "#AAAAAA",
  border: "#E0E0E0", borderFocus: "#111111",
  accent: "#111111", accentText: "#FFFFFF",
  success: "#22C55E", error: "#EF4444",
  tag: "#F0F0F0", tagText: "#444444",
  collectiveBg: "#e8f4fd", collectiveBorder: "#90caf9", collectiveText: "#1565c0",
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  rSm: 4, rMd: 8, rLg: 12, rFull: 9999,
  shadow: "0 1px 3px rgba(0,0,0,0.08)",
};

/* ── Shared Components ──────────────────────────────────── */

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontFamily: t.font, fontSize: 11, color: t.textTer, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{label}</span>
      <div style={{ width: 360, background: t.bg, borderRadius: t.rLg, border: `1px solid ${t.border}`, boxShadow: t.shadow, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Input({ placeholder, value, focused }: { placeholder: string; value?: string; focused?: boolean }) {
  return (
    <div style={{
      width: "100%", padding: "10px 12px",
      border: `1px solid ${focused ? t.borderFocus : t.border}`,
      borderRadius: t.rMd, fontSize: 14, fontFamily: t.font,
      color: value ? t.text : t.textPh, background: t.bg, boxSizing: "border-box" as const,
    }}>
      {value || placeholder}
    </div>
  );
}

function Btn({ children, variant = "primary", full = true, disabled, hovered }: { children: React.ReactNode; variant?: "primary" | "secondary" | "google"; full?: boolean; disabled?: boolean; hovered?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: hovered ? "#333" : t.accent, color: t.accentText },
    secondary: { background: hovered ? t.bgHover : t.bgSec, color: t.text },
    google: { background: hovered ? "#f8f9fa" : t.bg, color: t.text, border: `1px solid ${t.border}`, boxShadow: hovered ? t.shadow : "none" },
  };
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      padding: "10px 16px", borderRadius: t.rMd, fontSize: 14, fontWeight: variant === "google" ? 500 : 600,
      fontFamily: t.font, width: full ? "100%" : "auto", boxSizing: "border-box" as const,
      cursor: "pointer", opacity: disabled ? 0.5 : 1, ...styles[variant],
    }}>
      {children}
    </div>
  );
}

function AccountBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: "#4285F4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: t.accentText, fontFamily: t.font }}>S</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#333", fontFamily: t.font }}>Suyash Agarwal</span>
      </div>
      <span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font, cursor: "pointer" }}>Sign out</span>
    </div>
  );
}

function Tag({ label, category, collective, removable }: { label: string; category?: boolean; collective?: boolean; removable?: boolean }) {
  const bg = category ? t.accent : collective ? t.collectiveBg : t.tag;
  const color = category ? t.accentText : collective ? t.collectiveText : t.tagText;
  const border = collective ? `1px dashed ${t.collectiveBorder}` : "none";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: bg, border, borderRadius: t.rFull, fontSize: 12, color, fontFamily: t.font, fontWeight: category ? 500 : 400 }}>
      {label}
      {removable && <span style={{ fontSize: 14, color: collective ? t.collectiveText : t.textTer, marginRight: -4, cursor: "pointer" }}>&times;</span>}
    </span>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div style={{ width: 36, height: 20, borderRadius: 10, background: checked ? t.accent : t.border, position: "relative" as const, flexShrink: 0 }}>
      <div style={{ width: 16, height: 16, borderRadius: 8, background: t.bg, position: "absolute" as const, top: 2, left: checked ? 18 : 2, boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
    </div>
  );
}

function Footer({ label = "View Dashboard" }: { label?: string }) {
  return <div style={{ textAlign: "center" as const, paddingTop: 4 }}><span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font, cursor: "pointer" }}>{label}</span></div>;
}

function Screenshot({ domain, color }: { domain: string; color: string }) {
  return (
    <div style={{ width: "100%", height: 140, borderRadius: t.rMd, overflow: "hidden", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color, fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>{domain}</div>
    </div>
  );
}

function UrlRow({ icon, url }: { icon: string; url: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
      <div style={{ width: 16, height: 16, borderRadius: 2, background: icon, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{url}</span>
    </div>
  );
}

function TimerBar({ pct }: { pct: number }) {
  return (
    <div style={{ width: "100%", height: 3, background: t.border, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: t.accent, borderRadius: 2 }} />
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 24, height: 24, borderRadius: 12, border: `2.5px solid ${t.border}`, borderTopColor: t.accent }} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: t.font, marginBottom: 8, marginTop: 48 }}>{children}</h2>;
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 12, color: t.textTer, fontFamily: t.font, marginBottom: 24 }}>{children}</p>;
}

/* ── STATE 1: Auth ────────────────────────────────────────── */

function AuthDefault() {
  return (
    <Frame label="Auth — Default">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: t.font, letterSpacing: -0.5 }}>inSpace</div>
        <div style={{ fontSize: 13, color: t.textSec, fontFamily: t.font, marginBottom: 8 }}>Smart bookmarks, everywhere.</div>
        <Btn variant="google"><GoogleIcon />Sign in with Google</Btn>
      </div>
    </Frame>
  );
}

function AuthHover() {
  return (
    <Frame label="Auth — Button Hover">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: t.font, letterSpacing: -0.5 }}>inSpace</div>
        <div style={{ fontSize: 13, color: t.textSec, fontFamily: t.font, marginBottom: 8 }}>Smart bookmarks, everywhere.</div>
        <Btn variant="google" hovered><GoogleIcon />Sign in with Google</Btn>
      </div>
    </Frame>
  );
}

function AuthLoading() {
  return (
    <Frame label="Auth — Loading">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: t.font, letterSpacing: -0.5 }}>inSpace</div>
        <div style={{ fontSize: 13, color: t.textSec, fontFamily: t.font, marginBottom: 8 }}>Smart bookmarks, everywhere.</div>
        <Btn variant="google" disabled><GoogleIcon />Signing in...</Btn>
      </div>
    </Frame>
  );
}

function AuthError() {
  return (
    <Frame label="Auth — Error">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: t.font, letterSpacing: -0.5 }}>inSpace</div>
        <div style={{ fontSize: 13, color: t.textSec, fontFamily: t.font, marginBottom: 8 }}>Smart bookmarks, everywhere.</div>
        <Btn variant="google"><GoogleIcon />Sign in with Google</Btn>
        <div style={{ fontSize: 12, color: t.error, fontFamily: t.font, textAlign: "center" as const }}>Sign-in was cancelled.</div>
      </div>
    </Frame>
  );
}

/* ── STATE 2: Save Form ───────────────────────────────────── */

function SaveDefault() {
  return (
    <Frame label="Save — Default">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <Screenshot domain="github.com" color="#6366f1" />
        <Input placeholder="Page title" value="vercel/next.js: The React Framework" />
        <UrlRow icon="#24292e" url="github.com/vercel/next.js" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Development" category />
          <Tag label="GitHub repository" />
          <Tag label="react" removable />
          <Tag label="framework" removable />
          <Tag label="open-source" removable />
        </div>
        <Input placeholder="Add tag(s), separated by commas" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>
        <Btn>Save</Btn>
        <Footer />
      </div>
    </Frame>
  );
}

function SaveHoverBtn() {
  return (
    <Frame label="Save — Button Hover">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <Screenshot domain="github.com" color="#6366f1" />
        <Input placeholder="Page title" value="vercel/next.js: The React Framework" />
        <UrlRow icon="#24292e" url="github.com/vercel/next.js" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Development" category />
          <Tag label="react" removable />
          <Tag label="framework" removable />
        </div>
        <Input placeholder="Add tag(s), separated by commas" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>
        <Btn hovered>Save</Btn>
        <Footer />
      </div>
    </Frame>
  );
}

function SaveInputFocused() {
  return (
    <Frame label="Save — Input Focused">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <Input placeholder="Page title" value="Attention Is All You Need" focused />
        <UrlRow icon="#b31b1b" url="arxiv.org/abs/1706.03762" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Research" category />
          <Tag label="arXiv paper" />
          <Tag label="ai" removable />
          <Tag label="machine-learning" removable />
        </div>
        <Input placeholder="Add tag(s), separated by commas" value="transformers, nlp" focused />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={false} />
        </div>
        <Btn>Save</Btn>
        <Footer />
      </div>
    </Frame>
  );
}

function SaveWithCollective() {
  return (
    <Frame label="Save — Collective Tags">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <Screenshot domain="react.dev" color="#61dafb" />
        <Input placeholder="Page title" value="React — The library for web and native UIs" />
        <UrlRow icon="#61dafb" url="react.dev" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Documentation" category />
          <Tag label="React docs" />
          <Tag label="react" removable />
          <Tag label="hooks" removable />
          <span style={{ color: t.textTer, fontSize: 12, display: "flex", alignItems: "center", padding: "0 2px" }}>&middot;</span>
          <Tag label="frontend" collective removable />
          <Tag label="ui-library" collective removable />
        </div>
        <Input placeholder="Add tag(s), separated by commas" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>
        <Btn>Save</Btn>
        <Footer />
      </div>
    </Frame>
  );
}

function SaveDuplicate() {
  return (
    <Frame label="Save — Duplicate Detected">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: t.rMd, fontSize: 12, fontWeight: 500, color: "#92400E", fontFamily: t.font }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          Already saved on 2/28/2026 — update?
        </div>
        <Input placeholder="Page title" value="vercel/next.js: The React Framework" />
        <UrlRow icon="#24292e" url="github.com/vercel/next.js" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Development" category />
          <Tag label="react" removable />
          <Tag label="framework" removable />
        </div>
        <Input placeholder="Add a note" value="Check the App Router docs" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>
        <Btn>Update</Btn>
        <Footer />
      </div>
    </Frame>
  );
}

function SaveError() {
  return (
    <Frame label="Save — Error">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <Input placeholder="Page title" value="Some Page Title" />
        <UrlRow icon="#999" url="example.com/some-page" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Other" category />
        </div>
        <Input placeholder="Add tag(s), separated by commas" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>
        <Btn>Save</Btn>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 500, color: t.error, fontFamily: t.font }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          Not authenticated. Please sign in first.
        </div>
      </div>
    </Frame>
  );
}

function SaveOffline() {
  return (
    <Frame label="Save — Offline Queued">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar />
        <Input placeholder="Page title" value="Some Offline Page" />
        <UrlRow icon="#999" url="example.com/offline" />
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <Tag label="Other" category />
        </div>
        <Input placeholder="Add tag(s), separated by commas" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: t.tagText, fontFamily: t.font }}>Capture screenshot</span>
          <Toggle checked={false} />
        </div>
        <Btn>Save</Btn>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#B45309", fontFamily: t.font, textAlign: "center" as const }}>
          Saved offline — will sync when online (2 pending)
        </div>
      </div>
    </Frame>
  );
}

/* ── STATE 3: Saving (transition) ─────────────────────────── */

function SavingSpinner() {
  return (
    <Frame label="Saving — Spinner">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <TimerBar pct={0} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "32px 0" }}>
          <Spinner />
          <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec, fontFamily: t.font }}>Saving...</span>
        </div>
      </div>
    </Frame>
  );
}

/* ── STATE 4: Success ─────────────────────────────────────── */

function SuccessPreview({ pct, label }: { pct: number; label: string }) {
  return (
    <Frame label={label}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <TimerBar pct={pct} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Screenshot thumb */}
          <div style={{ width: 100, height: 68, borderRadius: t.rMd, overflow: "hidden", background: "#1a1a2e", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#6366f1", fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>github.com</div>
          </div>
          {/* Meta */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: t.success, color: t.accentText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.success, fontFamily: t.font }}>Saved</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: t.text, fontFamily: t.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, margin: 0 }}>
              vercel/next.js: The React Framework
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 2, background: "#24292e" }} />
              <span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font }}>github.com</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginTop: 2 }}>
              <span style={{ padding: "2px 8px", background: t.accent, color: t.accentText, borderRadius: t.rFull, fontSize: 11, fontFamily: t.font, fontWeight: 500 }}>Development</span>
              <span style={{ padding: "2px 8px", background: t.tag, color: t.tagText, borderRadius: t.rFull, fontSize: 11, fontFamily: t.font }}>react</span>
              <span style={{ padding: "2px 8px", background: t.tag, color: t.tagText, borderRadius: t.rFull, fontSize: 11, fontFamily: t.font }}>framework</span>
            </div>
          </div>
        </div>
        <Footer label="View in Dashboard" />
      </div>
    </Frame>
  );
}

function SuccessNoScreenshot() {
  return (
    <Frame label="Success — No Screenshot">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <TimerBar pct={50} />
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Meta only, no thumbnail */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: t.success, color: t.accentText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.success, fontFamily: t.font }}>Saved</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: t.text, fontFamily: t.font, margin: 0 }}>
              Attention Is All You Need
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 14, height: 14, borderRadius: 2, background: "#b31b1b" }} />
              <span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font }}>arxiv.org</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginTop: 2 }}>
              <span style={{ padding: "2px 8px", background: t.accent, color: t.accentText, borderRadius: t.rFull, fontSize: 11, fontFamily: t.font, fontWeight: 500 }}>Research</span>
              <span style={{ padding: "2px 8px", background: t.tag, color: t.tagText, borderRadius: t.rFull, fontSize: 11, fontFamily: t.font }}>ai</span>
              <span style={{ padding: "2px 8px", background: t.tag, color: t.tagText, borderRadius: t.rFull, fontSize: 11, fontFamily: t.font }}>machine-learning</span>
            </div>
          </div>
        </div>
        <Footer label="View in Dashboard" />
      </div>
    </Frame>
  );
}

/* ── COMPONENT STATES ─────────────────────────────────────── */

function ComponentStates() {
  return (
    <>
      <SectionTitle>Component Interaction States</SectionTitle>
      <SectionSub>Button, input, toggle, and tag states at the component level</SectionSub>

      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 32, marginBottom: 48 }}>
        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 200 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Primary Button</span>
          <Btn full={false}>Default</Btn>
          <Btn full={false} hovered>Hovered</Btn>
          <Btn full={false} disabled>Disabled</Btn>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 200 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Secondary Button</span>
          <Btn variant="secondary" full={false}>Default</Btn>
          <Btn variant="secondary" full={false} hovered>Hovered</Btn>
          <Btn variant="secondary" full={false} disabled>Disabled</Btn>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 240 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Google Button</span>
          <Btn variant="google" full={false}><GoogleIcon />Default</Btn>
          <Btn variant="google" full={false} hovered><GoogleIcon />Hovered</Btn>
          <Btn variant="google" full={false} disabled><GoogleIcon />Disabled</Btn>
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Input Field</span>
          <Input placeholder="Placeholder text" />
          <Input placeholder="With value" value="Some text entered" />
          <Input placeholder="Focused state" value="Editing..." focused />
        </div>

        {/* Toggles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Toggle</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Toggle checked={false} />
            <span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font }}>Off</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Toggle checked={true} />
            <span style={{ fontSize: 12, color: t.textSec, fontFamily: t.font }}>On</span>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Tags</span>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            <Tag label="Category" category />
            <Tag label="Domain context" />
            <Tag label="topic" removable />
            <Tag label="community-tag" collective removable />
          </div>
        </div>

        {/* Timer Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 200 }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Timer Bar</span>
          <TimerBar pct={100} />
          <TimerBar pct={66} />
          <TimerBar pct={33} />
          <TimerBar pct={0} />
        </div>
      </div>
    </>
  );
}

/* ── PAGE ──────────────────────────────────────────────────── */

export default function ExtensionDesignsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8F8F8", padding: 48, fontFamily: t.font }}>
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div style={{ marginBottom: 40, textAlign: "center" as const }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 4 }}>inSpace — Extension UI States</h1>
          <p style={{ fontSize: 13, color: t.textTer }}>360px popup &middot; All screens &middot; All interaction states</p>
        </div>

        {/* Auth states */}
        <SectionTitle>1. Authentication</SectionTitle>
        <SectionSub>Google sign-in flow with all states</SectionSub>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 32, marginBottom: 48 }}>
          <AuthDefault />
          <AuthHover />
          <AuthLoading />
          <AuthError />
        </div>

        {/* Save form states */}
        <SectionTitle>2. Save Form</SectionTitle>
        <SectionSub>Bookmark saving with screenshot, tags, duplicate detection, errors</SectionSub>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 32, marginBottom: 48 }}>
          <SaveDefault />
          <SaveHoverBtn />
          <SaveInputFocused />
          <SaveWithCollective />
          <SaveDuplicate />
          <SaveError />
          <SaveOffline />
        </div>

        {/* Saving transition */}
        <SectionTitle>3. Saving Transition</SectionTitle>
        <SectionSub>Immediate transition to spinner while bookmark saves</SectionSub>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 32, marginBottom: 48 }}>
          <SavingSpinner />
        </div>

        {/* Success states */}
        <SectionTitle>4. Success &amp; Auto-Dismiss</SectionTitle>
        <SectionSub>Saved preview with countdown timer bar (2s, pauses on hover)</SectionSub>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 32, marginBottom: 48 }}>
          <SuccessPreview pct={100} label="Success — Timer Start" />
          <SuccessPreview pct={50} label="Success — Timer 50%" />
          <SuccessPreview pct={10} label="Success — Timer End" />
          <SuccessNoScreenshot />
        </div>

        {/* Component states */}
        <ComponentStates />
      </div>
    </div>
  );
}
