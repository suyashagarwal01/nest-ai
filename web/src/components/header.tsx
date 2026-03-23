"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";

interface HeaderProps {
  userEmail?: string;
}

const tabs = [
  { label: "Saved", href: "/" },
  { label: "Branches", href: "/collections" },
  { label: "Settings", href: "/settings" },
] as const;

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowser();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="header">
      <Link href="/" className="header-logo-link">
        <Logo variant="full" size="sm" layout="horizontal" />
      </Link>

      <nav className="header-tabs">
        {tabs.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`header-tab ${isActive(href) ? "header-tab--active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-right">
        {userEmail && (
          <span className="header-email">{userEmail}</span>
        )}
        <button
          onClick={handleSignOut}
          className="header-logout-btn"
          title="Sign out"
        >
          <LogOut size={16} color="var(--color-error)" />
        </button>
      </div>
    </header>
  );
}
