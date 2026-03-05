"use client";

/**
 * Dashboard UI — all pages, states, and component interactions for Figma capture.
 */

const t = {
  bg: "#FAFAFA", white: "#FFFFFF",
  text: "#171717", textSec: "#737373", textTer: "#A3A3A3", textPh: "#D4D4D4",
  border: "#E5E5E5", borderHover: "#D4D4D4",
  accent: "#171717", accentText: "#FFFFFF",
  success: "#22C55E", error: "#EF4444",
  font: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (<div style={{ marginBottom: 64 }}><h2 style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: t.font, marginBottom: 4 }}>{title}</h2><p style={{ fontSize: 12, color: t.textTer, fontFamily: t.font, marginBottom: 24 }}>{sub}</p>{children}</div>);
}

function PageFrame({ children, label, width = 1200 }: { children: React.ReactNode; label: string; width?: number }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}><span style={{ fontFamily: t.font, fontSize: 11, color: t.textTer, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" as const }}>{label}</span><div style={{ width, background: t.bg, borderRadius: 12, border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>{children}</div></div>);
}

function Header({ active }: { active?: string }) {
  const items = [{ icon: "📁", label: "Collections" }, { icon: "📤", label: "Import" }, { icon: "⚙️", label: "Settings" }];
  return (
    <div style={{ borderBottom: `1px solid ${t.border}`, background: t.white }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: t.font, letterSpacing: -0.5 }}>inSpace</span>
          <div style={{ display: "flex", gap: 4 }}>{items.map((n) => (<span key={n.label} style={{ padding: "6px 8px", borderRadius: 6, fontSize: 13, color: active === n.label ? t.text : t.textTer, fontFamily: t.font, cursor: "pointer", background: active === n.label ? "#F5F5F5" : "transparent" }}>{n.icon}</span>))}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", background: "#F5F5F5", borderRadius: 8, padding: 2 }}>{["▦", "☰", "▤"].map((icon, i) => (<span key={i} style={{ padding: "6px 8px", borderRadius: 6, fontSize: 13, color: i === 0 ? t.text : t.textTer, background: i === 0 ? t.white : "transparent", boxShadow: i === 0 ? "0 1px 2px rgba(0,0,0,0.05)" : "none", cursor: "pointer" }}>{icon}</span>))}</div>
          <span style={{ fontSize: 12, color: t.textTer, fontFamily: t.font }}>suyash@email.com</span>
          <span style={{ fontSize: 13, color: t.textTer, cursor: "pointer" }}>↪</span>
        </div>
      </div>
    </div>
  );
}

function Card({ title, domain, favicon, category, tags, note, ss, related, hover }: { title: string; domain: string; favicon: string; category: string; tags: string[]; note?: string; ss?: boolean; related?: boolean; hover?: boolean }) {
  return (
    <div style={{ width: 280, background: t.white, border: `1px solid ${hover ? t.borderHover : t.border}`, borderRadius: 12, overflow: "hidden", boxShadow: hover ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>
      {ss !== false && (<div style={{ aspectRatio: "16/10", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#6366f1", fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{domain}</span></div>)}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: t.text, fontFamily: t.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1 }}>{title}</span>
          {hover && (<div style={{ display: "flex", gap: 2 }}>{["🔗", "📁", "✏️", "🗑️"].map((ic, i) => (<span key={i} style={{ padding: 4, fontSize: 11, borderRadius: 4, cursor: "pointer", color: t.textTer }}>{ic}</span>))}</div>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 2, background: favicon }} />
          <span style={{ fontSize: 12, color: t.textTer, fontFamily: t.font }}>{domain}</span>
          <span style={{ fontSize: 12, color: "#D4D4D4" }}>&middot;</span>
          <span style={{ fontSize: 12, color: t.textTer, fontFamily: t.font }}>2h ago</span>
        </div>
        {note && <p style={{ fontSize: 12, color: t.textSec, fontFamily: t.font, marginTop: 8 }}>{note}</p>}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4, marginTop: 12 }}>
          <span style={{ padding: "2px 8px", background: t.accent, color: t.accentText, borderRadius: 9999, fontSize: 11, fontWeight: 500, fontFamily: t.font }}>{category}</span>
          {tags.map((tg) => (<span key={tg} style={{ padding: "2px 8px", background: "#F5F5F5", color: t.textSec, borderRadius: 9999, fontSize: 11, fontFamily: t.font }}>{tg}</span>))}
        </div>
        {related && (<div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.border}` }}><span style={{ fontSize: 11, fontWeight: 500, color: t.textSec, fontFamily: t.font }}>Related</span>{[{ t: "React 19 RC", d: "react.dev" }, { t: "Next.js Guide", d: "nextjs.org" }].map((r) => (<div key={r.t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12 }}><div style={{ width: 14, height: 14, borderRadius: 2, background: "#61dafb" }} /><span style={{ flex: 1, color: t.textSec, fontFamily: t.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{r.t}</span><span style={{ padding: "2px 6px", background: "#F5F5F5", color: t.textTer, borderRadius: 9999, fontSize: 10, fontFamily: t.font }}>2 shared</span></div>))}</div>)}
      </div>
    </div>
  );
}

function SuggestionBanner() {
  return (<div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: t.white, border: `1px solid ${t.border}`, borderRadius: 8 }}><p style={{ flex: 1, fontSize: 14, color: t.textSec, fontFamily: t.font, margin: 0 }}>You saved 4 &quot;react&quot; bookmarks this week. <span style={{ color: t.textTer }}>Create a collection?</span></p><span style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: t.accent, color: t.accentText, borderRadius: 6, fontSize: 12, fontWeight: 500, fontFamily: t.font, cursor: "pointer", whiteSpace: "nowrap" as const }}>📁 Create &quot;react&quot;</span><span style={{ fontSize: 14, color: t.textTer, cursor: "pointer" }}>✕</span></div>);
}

export default function DashboardDesignsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F0F0F0", padding: 48, fontFamily: t.font }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 48, textAlign: "center" as const }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 4 }}>inSpace — Dashboard UI States</h1>
          <p style={{ fontSize: 13, color: t.textTer }}>All pages &middot; All interaction states &middot; Component library</p>
        </div>

        {/* 1. Login */}
        <Section title="1. Login" sub="Authentication page">
          <PageFrame label="Login" width={500}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 40px" }}>
              <div style={{ width: "100%", maxWidth: 360 }}>
                <h1 style={{ fontSize: 30, fontWeight: 700, textAlign: "center" as const, color: t.text, fontFamily: t.font, marginBottom: 4, letterSpacing: -0.5 }}>inSpace</h1>
                <p style={{ textAlign: "center" as const, color: t.textSec, fontSize: 14, fontFamily: t.font, marginBottom: 32 }}>Your bookmarks, organized by AI.</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", background: t.white, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: t.font, cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  Continue with Google
                </div>
              </div>
            </div>
          </PageFrame>
        </Section>

        {/* 2. Grid view */}
        <Section title="2. Dashboard — Grid View" sub="Main page with search, filters, suggestions, bookmark cards">
          <PageFrame label="Grid View with Suggestions">
            <Header />
            <div style={{ padding: 24 }}>
              <div style={{ padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.textPh, fontFamily: t.font, marginBottom: 16, background: t.white }}>🔍 Search bookmarks...</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const }}>{["All", "Development", "Documentation", "Design", "Research", "AI", "News"].map((c, i) => (<span key={c} style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 13, fontFamily: t.font, fontWeight: 500, background: i === 0 ? t.accent : "#F5F5F5", color: i === 0 ? t.accentText : t.textSec, cursor: "pointer" }}>{c}</span>))}</div>
              <div style={{ marginBottom: 16 }}><SuggestionBanner /></div>
              <p style={{ fontSize: 12, color: t.textTer, fontFamily: t.font, marginBottom: 16 }}>24 bookmarks</p>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 16 }}>
                <Card title="vercel/next.js" domain="github.com" favicon="#24292e" category="Development" tags={["react", "framework"]} hover />
                <Card title="Tailwind CSS Docs" domain="tailwindcss.com" favicon="#38bdf8" category="Documentation" tags={["css", "utility"]} />
                <Card title="Attention Is All You Need" domain="arxiv.org" favicon="#b31b1b" category="Research" tags={["ai", "transformers"]} note="Foundational paper" ss={false} />
                <Card title="React — Web and native UIs" domain="react.dev" favicon="#61dafb" category="Documentation" tags={["react", "hooks"]} related />
              </div>
            </div>
          </PageFrame>
        </Section>

        {/* 3. Empty */}
        <Section title="3. Dashboard — Empty" sub="No bookmarks saved yet">
          <PageFrame label="Empty State" width={800}><Header /><div style={{ padding: "80px 24px", textAlign: "center" as const }}><div style={{ fontSize: 40, marginBottom: 12 }}>📚</div><h2 style={{ fontSize: 16, fontWeight: 600, color: t.text, fontFamily: t.font, marginBottom: 4 }}>No bookmarks yet</h2><p style={{ fontSize: 14, color: t.textSec, fontFamily: t.font }}>Save your first page using the Chrome extension.</p></div></PageFrame>
        </Section>

        {/* 4. Collections */}
        <Section title="4. Collections" sub="Collection list with create action">
          <PageFrame label="Collections" width={800}><Header active="Collections" /><div style={{ padding: 24 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}><h2 style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: t.font }}>Collections</h2><span style={{ padding: "8px 16px", background: t.accent, color: t.accentText, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: t.font, cursor: "pointer" }}>+ New Collection</span></div><div style={{ display: "flex", flexWrap: "wrap" as const, gap: 16 }}>{[{ n: "React Resources", c: 12, d: "Frontend framework references" }, { n: "AI Papers", c: 8, d: "Machine learning research" }, { n: "Design Inspiration", c: 5, d: "UI/UX references" }].map((col) => (<div key={col.n} style={{ width: 240, padding: 16, background: t.white, border: `1px solid ${t.border}`, borderRadius: 12, cursor: "pointer" }}><h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: t.font, marginBottom: 4 }}>{col.n}</h3><p style={{ fontSize: 12, color: t.textSec, fontFamily: t.font, marginBottom: 8 }}>{col.d}</p><span style={{ fontSize: 12, color: t.textTer, fontFamily: t.font }}>{col.c} bookmarks</span></div>))}</div></div></PageFrame>
        </Section>

        {/* 5. Public collection */}
        <Section title="5. Public Collection" sub="Shared via /c/:slug (no auth)">
          <PageFrame label="Public Collection" width={800}><div style={{ padding: "32px 24px", textAlign: "center" as const, borderBottom: `1px solid ${t.border}` }}><h1 style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: t.font, marginBottom: 4 }}>React Resources</h1><p style={{ fontSize: 14, color: t.textSec, fontFamily: t.font, marginBottom: 4 }}>A curated collection of React learning materials</p><span style={{ fontSize: 12, color: t.textTer, fontFamily: t.font }}>12 bookmarks &middot; Shared by Suyash</span></div><div style={{ padding: 24, display: "flex", flexWrap: "wrap" as const, gap: 16 }}><Card title="React 19 RC" domain="react.dev" favicon="#61dafb" category="Documentation" tags={["react", "hooks"]} /><Card title="Next.js App Router" domain="nextjs.org" favicon="#111" category="Documentation" tags={["next.js", "routing"]} /></div></PageFrame>
        </Section>

        {/* 6. Settings */}
        <Section title="6. Settings" sub="API keys + tag vocabulary editor">
          <PageFrame label="Settings" width={700}>
            <div style={{ background: t.bg }}>
              <div style={{ borderBottom: `1px solid ${t.border}`, background: t.white, padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12 }}><span style={{ fontSize: 16, color: t.textTer, cursor: "pointer" }}>←</span><span style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: t.font }}>Settings</span></div>
              <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", gap: 40 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: t.font, marginBottom: 4 }}>API Keys</h3>
                  <p style={{ fontSize: 12, color: t.textTer, fontFamily: t.font, marginBottom: 16 }}>Generate keys for third-party integrations.</p>
                  <div style={{ padding: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, marginBottom: 12 }}><p style={{ fontSize: 12, fontWeight: 500, color: "#166534", fontFamily: t.font, marginBottom: 8 }}>New API key created. Copy it now.</p><div style={{ display: "flex", alignItems: "center", gap: 8 }}><code style={{ flex: 1, fontSize: 11, background: t.white, padding: "6px 8px", borderRadius: 4, border: "1px solid #BBF7D0", fontFamily: "monospace", wordBreak: "break-all" as const }}>insp_a1b2c3d4e5f67890abcdef12345678...</code><span style={{ padding: "4px 8px", background: "#166534", color: t.accentText, borderRadius: 4, fontSize: 11, cursor: "pointer" }}>📋</span></div></div>
                  {[{ n: "Zapier", p: "insp_a1b2c3d4", l: "2 hours ago" }, { n: "Shortcuts", p: "insp_e5f67890", l: "3 days ago" }].map((k) => (<div key={k.n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: t.white, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 8 }}><div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 500, color: t.text, fontFamily: t.font }}>{k.n}</span><code style={{ fontSize: 11, padding: "2px 6px", background: "#F5F5F5", color: t.textSec, borderRadius: 4, fontFamily: "monospace" }}>{k.p}...</code></div><span style={{ fontSize: 12, color: t.textTer, fontFamily: t.font }}>Last used {k.l}</span></div><span style={{ fontSize: 13, color: t.textTer, cursor: "pointer" }}>🗑️</span></div>))}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", border: `1px solid ${t.border}`, borderRadius: 6, fontSize: 14, color: t.textSec, fontFamily: t.font, cursor: "pointer", width: "fit-content" }}>+ Generate new key</div>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: t.font, marginBottom: 4 }}>Tag Preferences</h3>
                  <p style={{ fontSize: 12, color: t.textTer, fontFamily: t.font, marginBottom: 16 }}>Vocabulary rules rename auto-generated tags.</p>
                  {[{ f: "ml", to: "machine-learning" }, { f: "js", to: "javascript" }, { f: "k8s", to: "kubernetes" }].map((v) => (<div key={v.f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: t.white, border: `1px solid ${t.border}`, borderRadius: 8, marginBottom: 6, fontSize: 14, fontFamily: "monospace" }}><code style={{ color: t.textSec }}>{v.f}</code><span style={{ color: t.textTer }}>→</span><code style={{ color: t.text, fontWeight: 500 }}>{v.to}</code><span style={{ marginLeft: "auto", fontSize: 12, color: t.textTer, cursor: "pointer" }}>🗑️</span></div>))}
                </div>
              </div>
            </div>
          </PageFrame>
        </Section>

        {/* Component states */}
        <Section title="Component Interaction States" sub="Buttons, inputs, cards, tags, banners">
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 200 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Primary Button</span>
              <span style={{ padding: "8px 16px", background: t.accent, color: t.accentText, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: t.font, textAlign: "center" as const }}>Default</span>
              <span style={{ padding: "8px 16px", background: "#333", color: t.accentText, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: t.font, textAlign: "center" as const }}>Hovered</span>
              <span style={{ padding: "8px 16px", background: t.accent, color: t.accentText, borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: t.font, textAlign: "center" as const, opacity: 0.5 }}>Disabled</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 280 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Input Field</span>
              <div style={{ padding: "8px 12px", border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.textPh, fontFamily: t.font, background: t.white }}>Placeholder</div>
              <div style={{ padding: "8px 12px", border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 14, color: t.text, fontFamily: t.font, background: t.white }}>With value</div>
              <div style={{ padding: "8px 12px", border: `1px solid ${t.accent}`, borderRadius: 8, fontSize: 14, color: t.text, fontFamily: t.font, background: t.white }}>Focused</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Category Filter</span>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 500, fontFamily: t.font, background: t.accent, color: t.accentText }}>Active</span>
                <span style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 500, fontFamily: t.font, background: "#F5F5F5", color: t.textSec }}>Default</span>
                <span style={{ padding: "6px 12px", borderRadius: 9999, fontSize: 13, fontWeight: 500, fontFamily: t.font, background: "#EBEBEB", color: t.textSec }}>Hovered</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Tags</span>
              <div style={{ display: "flex", gap: 4 }}>
                <span style={{ padding: "2px 8px", background: t.accent, color: t.accentText, borderRadius: 9999, fontSize: 11, fontWeight: 500, fontFamily: t.font }}>Category</span>
                <span style={{ padding: "2px 8px", background: "#E5E5E5", color: t.textSec, borderRadius: 9999, fontSize: 11, fontWeight: 500, fontFamily: t.font }}>Domain</span>
                <span style={{ padding: "2px 8px", background: "#F5F5F5", color: t.textSec, borderRadius: 9999, fontSize: 11, fontFamily: t.font }}>topic</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>View Toggle</span>
              <div style={{ display: "flex", background: "#F5F5F5", borderRadius: 8, padding: 2, width: "fit-content" }}>{[{ i: "▦", a: true }, { i: "☰", a: false }, { i: "▤", a: false }].map((v, idx) => (<span key={idx} style={{ padding: "6px 8px", borderRadius: 6, fontSize: 13, color: v.a ? t.text : t.textTer, background: v.a ? t.white : "transparent", boxShadow: v.a ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}>{v.i}</span>))}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Card States</span>
              <div style={{ display: "flex", gap: 16 }}>
                <Card title="Default" domain="example.com" favicon="#999" category="Other" tags={["tag"]} />
                <Card title="Hovered — actions" domain="example.com" favicon="#999" category="Other" tags={["tag"]} hover />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: t.textTer, fontFamily: t.font, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Suggestion Banner</span>
              <SuggestionBanner />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
