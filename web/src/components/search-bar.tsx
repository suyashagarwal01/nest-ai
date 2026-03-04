"use client";

import { Search, X, Loader2 } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search bookmarks...",
  loading,
}: SearchBarProps) {
  return (
    <div className="relative">
      {loading ? (
        <Loader2
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin"
        />
      ) : (
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-neutral-400 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-neutral-100 text-neutral-400 cursor-pointer"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
