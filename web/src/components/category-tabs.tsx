"use client";

interface CategoryTabsProps {
  categories: string[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return (
    <div className="category-chips-scroll">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat === selected ? null : cat)}
          className={`category-chip ${cat === selected ? "category-chip--selected" : ""}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
