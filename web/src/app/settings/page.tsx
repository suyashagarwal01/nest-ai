"use client";

import { useState, useCallback, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { ArrowLeft, Plus, Copy, Check } from "lucide-react";
import Link from "next/link";
import type { ApiKey } from "@/lib/types";
import { ApiKeyCard } from "@/components/api-key-card";
import { TagVocabularyEditor } from "@/components/tag-vocabulary-editor";

export default function SettingsPage() {
  const supabase = createSupabaseBrowser();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("*")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    setApiKeys((data as ApiKey[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      await fetchKeys();
    };
    init();
  }, [fetchKeys]);

  async function handleCreate() {
    setCreating(true);

    // Generate raw key: insp_ + 32 random hex bytes
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const rawKey = `insp_${hex}`;
    const keyPrefix = rawKey.slice(0, 13); // "insp_" + 8 hex chars

    // Hash the key
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: newKeyName || "Default",
    });

    if (!error) {
      setNewKeyRaw(rawKey);
      setNewKeyName("");
      setShowNameInput(false);
      await fetchKeys();
    }
    setCreating(false);
  }

  async function handleRevoke(id: string) {
    await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function handleCopy() {
    if (newKeyRaw) {
      navigator.clipboard.writeText(newKeyRaw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* API Keys Section */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">API Keys</h2>
          <p className="text-xs text-neutral-400 mb-4">
            Generate keys for third-party integrations (Zapier, Shortcuts, scripts).
            Keys are shown once at creation — store them securely.
          </p>

          {/* New key creation */}
          {newKeyRaw && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-xs font-medium text-green-800 mb-2">
                New API key created. Copy it now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded border border-green-200 font-mono break-all">
                  {newKeyRaw}
                </code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-md hover:bg-green-100 text-green-700 cursor-pointer shrink-0"
                  title="Copy"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <button
                onClick={() => setNewKeyRaw(null)}
                className="text-xs text-green-600 mt-2 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Key list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {apiKeys.map((key) => (
                <ApiKeyCard key={key.id} apiKey={key} onRevoke={handleRevoke} />
              ))}
              {apiKeys.length === 0 && !newKeyRaw && (
                <p className="text-xs text-neutral-400 py-4 text-center">
                  No active API keys
                </p>
              )}
            </div>
          )}

          {/* Create button */}
          {showNameInput ? (
            <div className="flex items-center gap-2">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (optional)"
                className="flex-1 px-3 py-1.5 text-sm border border-neutral-200 rounded-md outline-none focus:border-neutral-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowNameInput(false);
                }}
                autoFocus
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => setShowNameInput(false)}
                className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNameInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 border border-neutral-200 rounded-md hover:bg-neutral-50 cursor-pointer"
            >
              <Plus size={14} />
              Generate new key
            </button>
          )}
        </section>

        {/* Tag Preferences Section */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Tag Preferences</h2>
          <p className="text-xs text-neutral-400 mb-4">
            Tag vocabulary rules automatically rename auto-generated tags.
            Rules are learned when you rename tags in the extension, or you can add them manually.
          </p>
          <TagVocabularyEditor />
        </section>
      </main>
    </div>
  );
}
