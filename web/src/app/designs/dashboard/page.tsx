"use client";

/**
 * Dashboard Login — rendered for Figma capture.
 * Google-only auth (no email/password).
 */

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

export default function DashboardDesignsPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8F8F8",
      padding: 48,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{ marginBottom: 40, textAlign: "center" as const }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 }}>
          inSpace — Dashboard Login
        </h1>
        <p style={{ fontSize: 13, color: "#999" }}>
          Google-only auth · Web dashboard
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* Login card mock */}
        <div style={{
          width: 460,
          background: "#FAFAFA",
          borderRadius: 12,
          border: "1px solid #E0E0E0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 360,
            padding: 32,
          }}>
            <div style={{ width: "100%", maxWidth: 320 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, textAlign: "center" as const, color: "#111", marginBottom: 4, letterSpacing: -0.5 }}>
                inSpace
              </h2>
              <p style={{ textAlign: "center" as const, color: "#666", fontSize: 14, marginBottom: 32 }}>
                Your bookmarks, organized by AI.
              </p>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 16px",
                background: "#FFFFFF",
                border: "1px solid #E0E0E0",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                width: "100%",
                boxSizing: "border-box" as const,
              }}>
                <GoogleIcon />
                Continue with Google
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
