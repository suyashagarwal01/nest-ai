"use client";

import { List, LayoutGrid } from "lucide-react";

interface ViewSwitcherProps {
  view: "list" | "grid";
  onChange: (view: "list" | "grid") => void;
}

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="view-switcher">
      <button
        onClick={() => onChange("list")}
        className={`view-switcher-btn ${view === "list" ? "view-switcher-btn--active" : ""}`}
        title="List view"
      >
        <List size={18} />
      </button>
      <button
        onClick={() => onChange("grid")}
        className={`view-switcher-btn ${view === "grid" ? "view-switcher-btn--active" : ""}`}
        title="Grid view"
      >
        <LayoutGrid size={18} />
      </button>
    </div>
  );
}
