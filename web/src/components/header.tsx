"use client";

import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { LogOut, LayoutGrid, List, Layers, Download } from "lucide-react";

type ViewType = "grid" | "list" | "grouped";

interface HeaderProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onExport: (format: "json" | "csv") => void;
  userEmail?: string;
}

export function Header({ view, onViewChange, onExport, userEmail }: HeaderProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Close dropdown on click outside
  useEffect(() => {
    if (!exportOpen) return;
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportOpen]);

  const viewButtons: { key: ViewType; icon: typeof LayoutGrid; label: string }[] = [
    { key: "grid", icon: LayoutGrid, label: "Grid view" },
    { key: "list", icon: List, label: "List view" },
    { key: "grouped", icon: Layers, label: "Grouped view" },
  ];

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">inSpace</h1>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
            {viewButtons.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => onViewChange(key)}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  view === key
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-400"
                }`}
                title={label}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* Export */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400 cursor-pointer"
              title="Export bookmarks"
            >
              <Download size={16} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                <button
                  onClick={() => { onExport("json"); setExportOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 cursor-pointer"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => { onExport("csv"); setExportOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-50 cursor-pointer"
                >
                  Export CSV
                </button>
              </div>
            )}
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
