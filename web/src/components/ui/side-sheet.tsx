"use client";

import { ReactNode, useEffect, useState, useCallback, useRef } from "react";
import { X } from "lucide-react";

interface SideSheetProps {
  open: boolean;
  /** Called when user intends to close (overlay click, Escape, X button).
   *  Parent decides whether to actually close by setting open=false. */
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Content placed to the left of the main panel (e.g. an image) */
  leftPanel?: ReactNode;
}

const ANIMATION_MS = 250;

export function SideSheet({ open, onClose, title, children, footer, leftPanel }: SideSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // When open goes true → mount immediately
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    }
  }, [open]);

  // When open goes false while mounted → play exit animation then unmount
  useEffect(() => {
    if (!open && mounted && !closing) {
      setClosing(true);
      timerRef.current = setTimeout(() => {
        setClosing(false);
        setMounted(false);
      }, ANIMATION_MS);
    }
    return () => clearTimeout(timerRef.current);
  }, [open, mounted, closing]);

  // Lock body scroll
  useEffect(() => {
    if (mounted) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mounted]);

  // Escape key
  useEffect(() => {
    if (!mounted || closing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mounted, closing, onClose]);

  if (!mounted) return null;

  return (
    <>
      <div
        className={`side-sheet-overlay${closing ? " side-sheet-overlay--closing" : ""}`}
        onClick={onClose}
      />
      <div
        className={`side-sheet${closing ? " side-sheet--closing" : ""}`}
        role="dialog"
        aria-label={title}
      >
        {leftPanel}
        <div className="detail-sheet-right">
          <div className="side-sheet-header">
            <h2 className="side-sheet-heading">{title}</h2>
            <button className="side-sheet-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div className="side-sheet-body">{children}</div>
          {footer && <div className="side-sheet-footer">{footer}</div>}
        </div>
      </div>
    </>
  );
}
