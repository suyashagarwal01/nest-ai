"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Upload, FileText, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { ParsedBookmark } from "@/lib/parsers";
import { parseBrowserBookmarks } from "@/lib/parsers/browser-bookmarks";
import { parsePocketHtml } from "@/lib/parsers/pocket-html";
import { parseRaindropCsv } from "@/lib/parsers/raindrop-csv";

type Format = "browser" | "pocket" | "raindrop";

interface ImportSummary {
  imported: number;
  skipped: number;
  errors: number;
}

export default function ImportPage() {
  const supabase = createSupabaseBrowser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<Format>("browser");
  const [parsed, setParsed] = useState<ParsedBookmark[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState<string>("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      let result;
      switch (format) {
        case "browser":
          result = parseBrowserBookmarks(text);
          break;
        case "pocket":
          result = parsePocketHtml(text);
          break;
        case "raindrop":
          result = parseRaindropCsv(text);
          break;
      }
      setParsed(result.bookmarks);
      setParseErrors(result.errors);
      setSelected(new Set(result.bookmarks.map((_, i) => i)));
    };
    reader.readAsText(file);
  }

  function toggleAll() {
    if (selected.size === parsed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(parsed.map((_, i) => i)));
    }
  }

  function toggleOne(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleImport() {
    const toImport = parsed.filter((_, i) => selected.has(i));
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress(0);
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    const BATCH_SIZE = 50;
    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      const batch = toImport.slice(i, i + BATCH_SIZE);

      const rows = batch.map((b) => ({
        url: b.url,
        title: b.title || null,
        note: b.note || null,
        category: b.category || null,
        created_at: b.created_at || undefined,
      }));

      const { data, error } = await supabase
        .from("bookmarks")
        .upsert(rows, { onConflict: "user_id,url", ignoreDuplicates: true })
        .select("id, url");

      if (error) {
        errors += batch.length;
      } else {
        const insertedUrls = new Set((data ?? []).map((d) => d.url));
        imported += insertedUrls.size;
        skipped += batch.length - insertedUrls.size;

        // Insert tags for imported bookmarks
        for (const bm of batch) {
          if (bm.tags.length === 0) continue;
          const matchedRow = (data ?? []).find((d) => d.url === bm.url);
          if (!matchedRow) continue;

          for (const tagName of bm.tags) {
            // Upsert tag
            const { data: tagData } = await supabase
              .from("tags")
              .upsert({ name: tagName }, { onConflict: "user_id,name" })
              .select("id")
              .single();

            if (tagData) {
              await supabase
                .from("bookmark_tags")
                .upsert(
                  { bookmark_id: matchedRow.id, tag_id: tagData.id },
                  { onConflict: "bookmark_id,tag_id", ignoreDuplicates: true }
                );
            }
          }
        }
      }

      setProgress(Math.min(i + BATCH_SIZE, toImport.length));
    }

    setSummary({ imported, skipped, errors });
    setImporting(false);
  }

  const formats: { key: Format; label: string; accept: string; desc: string }[] = [
    { key: "browser", label: "Chrome / Firefox", accept: ".html,.htm", desc: "Exported bookmarks HTML file" },
    { key: "pocket", label: "Pocket", accept: ".html,.htm", desc: "Pocket HTML export" },
    { key: "raindrop", label: "Raindrop", accept: ".csv", desc: "Raindrop CSV export" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-400"
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Import Bookmarks</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Format selector */}
        <div className="mb-6">
          <p className="text-sm font-medium text-neutral-700 mb-2">Source format</p>
          <div className="flex gap-2">
            {formats.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFormat(f.key);
                  setParsed([]);
                  setParseErrors([]);
                  setSummary(null);
                  setFileName("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors cursor-pointer ${
                  format === f.key
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {formats.find((f) => f.key === format)?.desc}
          </p>
        </div>

        {/* File upload */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center hover:border-neutral-300 transition-colors cursor-pointer mb-6"
        >
          <Upload size={24} className="mx-auto text-neutral-300 mb-2" />
          {fileName ? (
            <p className="text-sm text-neutral-600">
              <FileText size={14} className="inline mr-1" />
              {fileName}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">
              Click to select a file or drag and drop
            </p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept={formats.find((f) => f.key === format)?.accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            {parseErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle size={14} /> {err}
              </p>
            ))}
          </div>
        )}

        {/* Preview table */}
        {parsed.length > 0 && !summary && (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-neutral-600">
                {parsed.length} bookmarks found, {selected.size} selected
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-neutral-500 hover:text-neutral-700 cursor-pointer"
              >
                {selected.size === parsed.length ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-4 max-h-[400px] overflow-y-auto">
              {parsed.map((b, i) => (
                <button
                  key={i}
                  onClick={() => toggleOne(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-neutral-100 last:border-0 transition-colors cursor-pointer ${
                    selected.has(i) ? "bg-white" : "bg-neutral-50 opacity-60"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selected.has(i)
                        ? "border-neutral-900 bg-neutral-900"
                        : "border-neutral-300"
                    }`}
                  >
                    {selected.has(i) && <Check size={10} className="text-white" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-900 truncate">
                      {b.title || b.url}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{b.url}</p>
                  </div>
                  {b.category && (
                    <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded-full shrink-0">
                      {b.category}
                    </span>
                  )}
                  {b.tags.length > 0 && (
                    <span className="text-[10px] text-neutral-400 shrink-0">
                      {b.tags.length} tag{b.tags.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Import button + progress */}
            {importing ? (
              <div>
                <div className="w-full bg-neutral-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-neutral-900 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.round((progress / selected.size) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-neutral-400 text-center">
                  Importing {progress} / {selected.size}...
                </p>
              </div>
            ) : (
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Import {selected.size} bookmark{selected.size !== 1 ? "s" : ""}
              </button>
            )}
          </>
        )}

        {/* Summary */}
        {summary && (
          <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center">
            <Check size={32} className="mx-auto text-green-600 mb-3" />
            <h2 className="text-lg font-semibold mb-2">Import Complete</h2>
            <div className="flex justify-center gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold text-neutral-900">
                  {summary.imported}
                </p>
                <p className="text-neutral-400">imported</p>
              </div>
              {summary.skipped > 0 && (
                <div>
                  <p className="text-2xl font-bold text-neutral-400">
                    {summary.skipped}
                  </p>
                  <p className="text-neutral-400">skipped</p>
                </div>
              )}
              {summary.errors > 0 && (
                <div>
                  <p className="text-2xl font-bold text-red-500">
                    {summary.errors}
                  </p>
                  <p className="text-neutral-400">errors</p>
                </div>
              )}
            </div>
            <Link
              href="/"
              className="inline-block mt-4 text-sm text-neutral-600 hover:text-neutral-900 underline"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
