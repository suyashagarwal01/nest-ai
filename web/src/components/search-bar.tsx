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
  placeholder = "Search...",
  loading,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      {loading ? (
        <Loader2 size={20} className="search-bar-icon animate-spin" />
      ) : (
        <Search size={20} className="search-bar-icon" />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button onClick={() => onChange("")} className="search-bar-clear">
          <X size={20} />
        </button>
      )}
    </div>
  );
}
