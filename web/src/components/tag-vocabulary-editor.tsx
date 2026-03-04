"use client";

import { useState, useCallback, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Plus, Trash2, ArrowRight } from "lucide-react";

export function TagVocabularyEditor() {
  const supabase = createSupabaseBrowser();
  const [vocabulary, setVocabulary] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [newFrom, setNewFrom] = useState("");
  const [newTo, setNewTo] = useState("");

  const fetchVocabulary = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("tag_vocabulary")
      .eq("id", user.id)
      .single();

    setVocabulary((data?.tag_vocabulary as Record<string, string>) ?? {});
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      await fetchVocabulary();
    };
    init();
  }, [fetchVocabulary]);

  async function saveVocabulary(updated: Record<string, string>) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ tag_vocabulary: updated })
      .eq("id", user.id);

    setVocabulary(updated);
  }

  function handleAdd() {
    const from = newFrom.toLowerCase().trim();
    const to = newTo.toLowerCase().trim();
    if (!from || !to || from === to) return;

    saveVocabulary({ ...vocabulary, [from]: to });
    setNewFrom("");
    setNewTo("");
  }

  function handleRemove(key: string) {
    const updated = { ...vocabulary };
    delete updated[key];
    saveVocabulary(updated);
  }

  const entries = Object.entries(vocabulary).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-4 h-4 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Existing entries */}
      {entries.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {entries.map(([from, to]) => (
            <div
              key={from}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-sm"
            >
              <code className="text-neutral-500">{from}</code>
              <ArrowRight size={12} className="text-neutral-300 shrink-0" />
              <code className="text-neutral-900 font-medium">{to}</code>
              <button
                onClick={() => handleRemove(from)}
                className="ml-auto p-1 rounded hover:bg-neutral-100 text-neutral-400 cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="text-xs text-neutral-400 py-3 text-center mb-3">
          No vocabulary rules yet. When you rename auto-tags in the extension, rules are learned automatically.
        </p>
      )}

      {/* Add new entry */}
      <div className="flex items-center gap-2">
        <input
          value={newFrom}
          onChange={(e) => setNewFrom(e.target.value)}
          placeholder="From tag"
          className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 rounded-md outline-none focus:border-neutral-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <ArrowRight size={14} className="text-neutral-300 shrink-0" />
        <input
          value={newTo}
          onChange={(e) => setNewTo(e.target.value)}
          placeholder="To tag"
          className="flex-1 px-2 py-1.5 text-sm border border-neutral-200 rounded-md outline-none focus:border-neutral-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newFrom.trim() || !newTo.trim()}
          className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-600 disabled:opacity-30 cursor-pointer"
          title="Add rule"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
