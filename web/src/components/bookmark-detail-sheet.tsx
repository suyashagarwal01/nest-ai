"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ExternalLink, Copy, X, Trash2, Image } from "lucide-react";
import type { Bookmark, Tag } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { SideSheet } from "@/components/ui/side-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/toast";

type BookmarkRow = Bookmark & { bookmark_tags?: { tags: Tag }[] };

interface BookmarkDetailSheetProps {
  bookmark: BookmarkRow | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (bookmark: Bookmark) => void;
}

function formatFullDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function BookmarkDetailSheet({
  bookmark,
  onClose,
  onDelete,
  onUpdate,
}: BookmarkDetailSheetProps) {
  const supabase = createSupabaseBrowser();

  // Editable fields
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Track original values for dirty detection
  const originalRef = useRef({ title: "", note: "", tagNames: "" });

  // Reset form when bookmark changes
  useEffect(() => {
    if (bookmark) {
      const t = bookmark.title ?? "";
      const n = bookmark.note ?? "";
      const tagList = (bookmark.bookmark_tags ?? []).map((bt) => ({
        id: bt.tags.id,
        name: bt.tags.name,
      }));
      setTitle(t);
      setNote(n);
      setTags(tagList);
      setTagInput("");
      originalRef.current = {
        title: t,
        note: n,
        tagNames: tagList.map((tg) => tg.name).sort().join(","),
      };
    }
  }, [bookmark]);

  const isDirty = useMemo(() => {
    if (!bookmark) return false;
    const orig = originalRef.current;
    const currentTagNames = tags.map((t) => t.name).sort().join(",");
    return title !== orig.title || note !== orig.note || currentTagNames !== orig.tagNames;
  }, [bookmark, title, note, tags]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  function handleCopy() {
    if (!bookmark) return;
    navigator.clipboard.writeText(bookmark.url);
    showToast("Link copied to clipboard");
  }

  function handleOpen() {
    if (!bookmark) return;
    window.open(bookmark.url, "_blank");
  }

  function handleRemoveTag(tagId: string) {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTagsFromInput();
    }
  }

  function handleTagInputBlur() {
    addTagsFromInput();
  }

  function addTagsFromInput() {
    const raw = tagInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
    if (raw.length === 0) return;

    const existing = new Set(tags.map((t) => t.name));
    const newTags = raw.filter((n) => !existing.has(n));
    if (newTags.length > 0) {
      setTags((prev) => [
        ...prev,
        ...newTags.map((n) => ({ id: `new-${n}-${Date.now()}`, name: n })),
      ]);
    }
    setTagInput("");
  }

  async function handleSave() {
    if (!bookmark || !isDirty) return;
    setSaving(true);

    try {
      // Update bookmark title and note
      const { error: updateError } = await supabase
        .from("bookmarks")
        .update({ title, note })
        .eq("id", bookmark.id);

      if (updateError) throw updateError;

      // Sync tags: remove old junction rows, ensure tags exist, re-insert
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Delete existing bookmark_tags
      await supabase.from("bookmark_tags").delete().eq("bookmark_id", bookmark.id);

      // For each tag, upsert into tags table and create junction
      for (const tag of tags) {
        let tagId = tag.id;

        // New tags need to be inserted
        if (tagId.startsWith("new-")) {
          const { data: existing } = await supabase
            .from("tags")
            .select("id")
            .eq("user_id", userId)
            .eq("name", tag.name)
            .maybeSingle();

          if (existing) {
            tagId = existing.id;
          } else {
            const { data: created } = await supabase
              .from("tags")
              .insert({ user_id: userId, name: tag.name })
              .select("id")
              .single();
            if (created) tagId = created.id;
          }
        }

        await supabase
          .from("bookmark_tags")
          .insert({ bookmark_id: bookmark.id, tag_id: tagId });
      }

      // Update local state
      onUpdate({ ...bookmark, title, note });
      // Reset originals so dirty flag clears
      originalRef.current = {
        title,
        note,
        tagNames: tags.map((t) => t.name).sort().join(","),
      };
      showToast("Changes saved");
    } catch {
      showToast("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!bookmark) return;
    onDelete(bookmark.id);
    onClose();
  }

  function handleCancel() {
    if (!bookmark) return;
    // Reset to original values
    const tagList = (bookmark.bookmark_tags ?? []).map((bt) => ({
      id: bt.tags.id,
      name: bt.tags.name,
    }));
    setTitle(bookmark.title ?? "");
    setNote(bookmark.note ?? "");
    setTags(tagList);
    setTagInput("");
  }

  if (!bookmark) return null;

  const hasImage = !!bookmark.screenshot_url;

  const imagePanel = (
    <div className="detail-sheet-image">
      {hasImage ? (
        <img src={bookmark.screenshot_url!} alt="" />
      ) : (
        <div className="detail-sheet-image-placeholder">
          <Image size={32} />
          <span>No screenshot</span>
        </div>
      )}
    </div>
  );

  const footer = isDirty ? (
    <>
      <Button variant="secondary" size="md" onClick={handleCancel}>
        Cancel
      </Button>
      <Button variant="brand" size="md" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </>
  ) : undefined;

  return (
    <>
      <SideSheet
        open={!!bookmark}
        onClose={handleClose}
        title="Link Details"
        leftPanel={imagePanel}
        footer={footer}
      >
        <div className="detail-sheet-content">
          {/* URL (read-only) */}
          <div className="detail-field">
            <label className="detail-field-label">URL</label>
            <div className="detail-url-row">
              <a
                className="detail-url-text"
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                title={bookmark.url}
              >
                {bookmark.url}
              </a>
              <button
                className="detail-url-btn tooltip"
                data-tooltip="Open link"
                onClick={handleOpen}
              >
                <ExternalLink size={14} />
              </button>
              <button
                className="detail-url-btn tooltip"
                data-tooltip="Copy link"
                onClick={handleCopy}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Title (editable) */}
          <div className="detail-field">
            <label className="detail-field-label">Title</label>
            <input
              className="detail-field-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category (read-only) */}
          {bookmark.category && (
            <div className="detail-field">
              <label className="detail-field-label">Category</label>
              <div className="detail-categories">
                <span className="detail-category-chip detail-category-chip--active">
                  {bookmark.category}
                </span>
              </div>
            </div>
          )}

          {/* Tags (removable + addable) */}
          <div className="detail-field">
            <label className="detail-field-label">Tags</label>
            {tags.length > 0 && (
              <div className="detail-tags-list">
                {tags.map((tag) => (
                  <span key={tag.id} className="detail-tag">
                    {tag.name}
                    <button
                      className="detail-tag-remove"
                      onClick={() => handleRemoveTag(tag.id)}
                      aria-label={`Remove ${tag.name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              className="detail-tag-input"
              type="text"
              placeholder="Add tag(s), separated by commas"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={handleTagInputBlur}
            />
          </div>

          {/* Note (editable) */}
          <div className="detail-field">
            <label className="detail-field-label">Note</label>
            <textarea
              className="detail-field-textarea"
              rows={3}
              placeholder="Add a personal note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Meta + Delete */}
          <div className="detail-meta-section">
            <div className="detail-meta-row">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Saved</span>
                <span className="detail-meta-value">
                  {formatFullDate(bookmark.created_at)}
                </span>
              </div>
              {bookmark.domain && (
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Domain</span>
                  <a
                    className="detail-meta-value detail-meta-link"
                    href={`https://${bookmark.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {bookmark.domain}
                  </a>
                </div>
              )}
            </div>
            <div>
              <button className="detail-delete-btn" onClick={handleDelete}>
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </SideSheet>

      <ConfirmDialog
        open={showConfirm}
        title="Unsaved changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setShowConfirm(false);
          onClose();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
