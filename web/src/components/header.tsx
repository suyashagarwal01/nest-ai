"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { LogOut, LayoutGrid, List } from "lucide-react";

interface HeaderProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  userEmail?: string;
}

export function Header({ view, onViewChange, userEmail }: HeaderProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">inSpace</h1>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => onViewChange("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                view === "grid"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-400"
              }`}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                view === "list"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-400"
              }`}
              title="List view"
            >
              <List size={15} />
            </button>
          </div>

          {/* User + sign out */}
          {userEmail && (
            <span className="text-xs text-neutral-400 hidden sm:block">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
