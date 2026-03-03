"use client";

/**
 * Extension UI — all states rendered at 360px for Figma capture.
 * Uses consistent design tokens (CSS variables) so Figma picks up
 * reusable styles. Everything uses flexbox for auto-layout conversion.
 *
 * Updated: Google-only auth, account bar, "Save another" in success.
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

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Design Tokens (inline styles for clean Figma capture) ── */

const tokens = {
  // Colors
  bg: "#FFFFFF",
  bgSecondary: "#F5F5F5",
  bgHover: "#E8E8E8",
  text: "#111111",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textPlaceholder: "#AAAAAA",
  border: "#E0E0E0",
  borderFocus: "#111111",
  accent: "#111111",
  accentText: "#FFFFFF",
  success: "#22C55E",
  successLight: "#F0FDF4",
  error: "#EF4444",
  tag: "#F0F0F0",
  tagText: "#444444",
  // Typography
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  // Radii
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 12,
  radiusFull: 9999,
  // Shadows
  shadowCard: "0 1px 3px rgba(0,0,0,0.08)",
};

/* ── Shared Components ──────────────────────────────────── */

function ExtensionFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <span style={{ fontFamily: tokens.fontFamily, fontSize: 11, color: tokens.textTertiary, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{label}</span>
      <div style={{
        width: 360,
        background: tokens.bg,
        borderRadius: tokens.radiusLg,
        border: `1px solid ${tokens.border}`,
        boxShadow: tokens.shadowCard,
        overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

function InputField({ placeholder, value }: { placeholder: string; type?: string; value?: string }) {
  return (
    <div style={{
      width: "100%",
      padding: "10px 12px",
      border: `1px solid ${tokens.border}`,
      borderRadius: tokens.radiusMd,
      fontSize: 14,
      fontFamily: tokens.fontFamily,
      color: value ? tokens.text : tokens.textPlaceholder,
      background: tokens.bg,
      boxSizing: "border-box" as const,
    }}>
      {value || placeholder}
    </div>
  );
}

function PrimaryButton({ children, fullWidth = true, disabled = false }: { children: React.ReactNode; fullWidth?: boolean; disabled?: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 16px",
      background: tokens.accent,
      color: tokens.accentText,
      borderRadius: tokens.radiusMd,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: tokens.fontFamily,
      width: fullWidth ? "100%" : "auto",
      boxSizing: "border-box" as const,
      cursor: "pointer",
      opacity: disabled ? 0.5 : 1,
    }}>
      {children}
    </div>
  );
}

function SecondaryButton({ children, fullWidth = true }: { children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 16px",
      background: tokens.bgSecondary,
      color: tokens.text,
      borderRadius: tokens.radiusMd,
      fontSize: 14,
      fontWeight: 600,
      fontFamily: tokens.fontFamily,
      width: fullWidth ? "100%" : "auto",
      boxSizing: "border-box" as const,
      cursor: "pointer",
    }}>
      {children}
    </div>
  );
}

function GoogleButton() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: "10px 16px",
      background: tokens.bg,
      border: `1px solid ${tokens.border}`,
      borderRadius: tokens.radiusMd,
      fontSize: 14,
      fontWeight: 500,
      fontFamily: tokens.fontFamily,
      width: "100%",
      boxSizing: "border-box" as const,
      cursor: "pointer",
    }}>
      <GoogleIcon />
      Sign in with Google
    </div>
  );
}

function AccountBar({ name, avatarBg }: { name: string; avatarBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          background: avatarBg,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          color: tokens.accentText,
          fontFamily: tokens.fontFamily,
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#333",
          fontFamily: tokens.fontFamily,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap" as const,
        }}>
          {name}
        </span>
      </div>
      <span style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily, cursor: "pointer" }}>
        Sign out
      </span>
    </div>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      background: tokens.tag,
      borderRadius: tokens.radiusFull,
      fontSize: 12,
      color: tokens.tagText,
      fontFamily: tokens.fontFamily,
    }}>
      {label}
    </span>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: 36,
      height: 20,
      borderRadius: 10,
      background: checked ? tokens.accent : tokens.border,
      position: "relative" as const,
      flexShrink: 0,
    }}>
      <div style={{
        width: 16,
        height: 16,
        borderRadius: 8,
        background: tokens.bg,
        position: "absolute" as const,
        top: 2,
        left: checked ? 18 : 2,
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }} />
    </div>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center" as const, paddingTop: 4 }}>
      <span style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily, cursor: "pointer" }}>
        {label}
      </span>
    </div>
  );
}

/* ── State 1: Auth (Google only) ───────────────────────── */

function AuthState() {
  return (
    <ExtensionFrame label="Auth — Sign In">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: tokens.text, fontFamily: tokens.fontFamily, letterSpacing: -0.5 }}>
          inSpace
        </div>
        <div style={{ fontSize: 13, color: tokens.textSecondary, fontFamily: tokens.fontFamily, marginBottom: 8 }}>
          Smart bookmarks, everywhere.
        </div>
        <GoogleButton />
      </div>
    </ExtensionFrame>
  );
}

/* ── State 1b: Auth Error ──────────────────────────────── */

function AuthErrorState() {
  return (
    <ExtensionFrame label="Auth — Error">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 16px 16px" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: tokens.text, fontFamily: tokens.fontFamily, letterSpacing: -0.5 }}>
          inSpace
        </div>
        <div style={{ fontSize: 13, color: tokens.textSecondary, fontFamily: tokens.fontFamily, marginBottom: 8 }}>
          Smart bookmarks, everywhere.
        </div>
        <GoogleButton />
        <div style={{ fontSize: 12, color: tokens.error, fontFamily: tokens.fontFamily, textAlign: "center" as const }}>
          Sign-in was cancelled.
        </div>
      </div>
    </ExtensionFrame>
  );
}

/* ── State 2: Save (with screenshot + account bar) ──────── */

function SaveState() {
  return (
    <ExtensionFrame label="Save — With Screenshot">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar name="Suyash Agarwal" avatarBg="#4285F4" />

        {/* Screenshot preview */}
        <div style={{
          width: "100%",
          height: 140,
          borderRadius: tokens.radiusMd,
          overflow: "hidden",
          background: "#1a1a2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ color: "#6366f1", fontSize: 32, fontWeight: 700, fontFamily: "monospace" }}>
            github.com
          </div>
        </div>

        <InputField placeholder="Page title" value="vercel/next.js: The React Framework" />

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <div style={{ width: 16, height: 16, borderRadius: 2, background: "#24292e", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            github.com/vercel/next.js
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <TagPill label="development" />
          <TagPill label="react" />
          <TagPill label="framework" />
          <TagPill label="vercel" />
        </div>

        <InputField placeholder="Add a note (optional)" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: tokens.tagText, fontFamily: tokens.fontFamily }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>

        <PrimaryButton>Save</PrimaryButton>
        <FooterLink label="View Dashboard" />
      </div>
    </ExtensionFrame>
  );
}

/* ── State 2b: Save (without screenshot) ─────────────────── */

function SaveNoScreenshotState() {
  return (
    <ExtensionFrame label="Save — No Screenshot">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar name="Suyash Agarwal" avatarBg="#4285F4" />

        <InputField placeholder="Page title" value="Attention Is All You Need — arXiv" />

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <div style={{ width: 16, height: 16, borderRadius: 2, background: "#b31b1b", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
            arxiv.org/abs/1706.03762
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <TagPill label="research" />
          <TagPill label="ai" />
          <TagPill label="machine-learning" />
        </div>

        <InputField placeholder="Add a note (optional)" value="Foundational transformer paper" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: tokens.tagText, fontFamily: tokens.fontFamily }}>Capture screenshot</span>
          <Toggle checked={false} />
        </div>

        <PrimaryButton>Save</PrimaryButton>
        <FooterLink label="View Dashboard" />
      </div>
    </ExtensionFrame>
  );
}

/* ── State 2c: Saving (loading) ──────────────────────────── */

function SavingState() {
  return (
    <ExtensionFrame label="Save — Loading">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar name="Suyash Agarwal" avatarBg="#4285F4" />

        <div style={{
          width: "100%",
          height: 140,
          borderRadius: tokens.radiusMd,
          overflow: "hidden",
          background: "#1a1a2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ color: "#6366f1", fontSize: 32, fontWeight: 700, fontFamily: "monospace" }}>
            github.com
          </div>
        </div>

        <InputField placeholder="Page title" value="vercel/next.js: The React Framework" />

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <div style={{ width: 16, height: 16, borderRadius: 2, background: "#24292e", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily }}>
            github.com/vercel/next.js
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <TagPill label="development" />
          <TagPill label="react" />
          <TagPill label="framework" />
        </div>

        <InputField placeholder="Add a note (optional)" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: tokens.tagText, fontFamily: tokens.fontFamily }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>

        <PrimaryButton disabled>Save</PrimaryButton>

        <div style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily, textAlign: "center" as const }}>
          Saving...
        </div>
      </div>
    </ExtensionFrame>
  );
}

/* ── State 3: Success ────────────────────────────────────── */

function SuccessState() {
  return (
    <ExtensionFrame label="Success">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "32px 16px 16px" }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: tokens.success,
          color: tokens.accentText,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          fontWeight: 700,
        }}>
          <CheckIcon size={24} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: tokens.text, fontFamily: tokens.fontFamily, marginBottom: 4 }}>
          Saved to inSpace
        </div>
        <PrimaryButton>View Dashboard</PrimaryButton>
        <SecondaryButton>Save another</SecondaryButton>
      </div>
    </ExtensionFrame>
  );
}

/* ── State 3b: Duplicate ──────────────────────────────────── */

function DuplicateState() {
  return (
    <ExtensionFrame label="Duplicate Detected">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
        <AccountBar name="Suyash Agarwal" avatarBg="#4285F4" />

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px",
          background: "#FFF7ED",
          border: "1px solid #FED7AA",
          borderRadius: tokens.radiusMd,
          fontSize: 13,
          color: "#9A3412",
          fontFamily: tokens.fontFamily,
        }}>
          Already saved — update?
        </div>

        <InputField placeholder="Page title" value="vercel/next.js: The React Framework" />

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
          <div style={{ width: 16, height: 16, borderRadius: 2, background: "#24292e", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: tokens.textSecondary, fontFamily: tokens.fontFamily }}>
            github.com/vercel/next.js
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
          <TagPill label="development" />
          <TagPill label="react" />
          <TagPill label="framework" />
        </div>

        <InputField placeholder="Add a note (optional)" value="Check the App Router docs" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
          <span style={{ fontSize: 13, color: tokens.tagText, fontFamily: tokens.fontFamily }}>Capture screenshot</span>
          <Toggle checked={true} />
        </div>

        <PrimaryButton>Update</PrimaryButton>
        <FooterLink label="View Dashboard" />
      </div>
    </ExtensionFrame>
  );
}

/* ── Page Layout ─────────────────────────────────────────── */

export default function ExtensionDesignsPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8F8F8",
      padding: 48,
      fontFamily: tokens.fontFamily,
    }}>
      {/* Title */}
      <div style={{ marginBottom: 40, textAlign: "center" as const }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: tokens.text, marginBottom: 4 }}>
          inSpace — Extension UI States
        </h1>
        <p style={{ fontSize: 13, color: tokens.textTertiary }}>
          360px popup · Google-only auth · Account bar · All states
        </p>
      </div>

      {/* States grid */}
      <div style={{
        display: "flex",
        flexWrap: "wrap" as const,
        gap: 40,
        justifyContent: "center",
        marginBottom: 64,
      }}>
        <AuthState />
        <AuthErrorState />
        <SaveState />
        <SaveNoScreenshotState />
        <SavingState />
        <SuccessState />
        <DuplicateState />
      </div>

      {/* Design Tokens Reference */}
      <div style={{
        maxWidth: 800,
        margin: "0 auto",
        background: tokens.bg,
        borderRadius: tokens.radiusLg,
        border: `1px solid ${tokens.border}`,
        padding: 24,
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: tokens.text, marginBottom: 16 }}>
          Design Tokens
        </h2>

        {/* Colors */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: tokens.textTertiary, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>Colors</h3>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
            {[
              { name: "bg", value: "#FFFFFF" },
              { name: "bg-secondary", value: "#F5F5F5" },
              { name: "text", value: "#111111" },
              { name: "text-secondary", value: "#666666" },
              { name: "text-tertiary", value: "#999999" },
              { name: "border", value: "#E0E0E0" },
              { name: "accent", value: "#111111" },
              { name: "success", value: "#22C55E" },
              { name: "error", value: "#EF4444" },
              { name: "tag-bg", value: "#F0F0F0" },
              { name: "tag-text", value: "#444444" },
              { name: "warning-bg", value: "#FFF7ED" },
              { name: "warning-border", value: "#FED7AA" },
              { name: "warning-text", value: "#9A3412" },
            ].map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: tokens.bgSecondary, borderRadius: 6, fontSize: 11, fontFamily: "monospace" }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: c.value, border: "1px solid #ddd", flexShrink: 0 }} />
                <span style={{ color: tokens.textSecondary }}>{c.name}</span>
                <span style={{ color: tokens.textTertiary }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Typography */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: tokens.textTertiary, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>Typography</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { name: "Logo", size: "24px", weight: "700", tracking: "-0.5px" },
              { name: "Account", size: "13px", weight: "500", tracking: "0" },
              { name: "Title", size: "16px", weight: "600", tracking: "0" },
              { name: "Body", size: "14px", weight: "400", tracking: "0" },
              { name: "Button", size: "14px", weight: "600", tracking: "0" },
              { name: "Label", size: "13px", weight: "400", tracking: "0" },
              { name: "Caption", size: "12px", weight: "400", tracking: "0" },
              { name: "Tag", size: "12px", weight: "400", tracking: "0" },
              { name: "Overline", size: "11px", weight: "500", tracking: "0.5px" },
            ].map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "baseline", gap: 12, fontSize: 11, fontFamily: "monospace" }}>
                <span style={{ width: 80, color: tokens.textSecondary, flexShrink: 0 }}>{t.name}</span>
                <span style={{ color: tokens.textTertiary }}>{t.size} / {t.weight} / {t.tracking}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spacing & Radii */}
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: tokens.textTertiary, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 8 }}>Radii & Spacing</h3>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, fontSize: 11, fontFamily: "monospace" }}>
            {[
              { name: "radius-sm", value: "4px" },
              { name: "radius-md", value: "8px" },
              { name: "radius-lg", value: "12px" },
              { name: "radius-full", value: "9999px" },
              { name: "space-popup", value: "16px" },
              { name: "space-gap", value: "12px" },
              { name: "space-tag-gap", value: "6px" },
              { name: "shadow-card", value: "0 1px 3px rgba(0,0,0,0.08)" },
            ].map((s) => (
              <div key={s.name} style={{ padding: "4px 8px", background: tokens.bgSecondary, borderRadius: 6 }}>
                <span style={{ color: tokens.textSecondary }}>{s.name}: </span>
                <span style={{ color: tokens.textTertiary }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
