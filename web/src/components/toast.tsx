"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

interface ToastState {
  message: string;
  action?: ToastAction;
  duration: number;
}

let showToastGlobal: ((message: string, options?: ToastOptions) => void) | null =
  null;

export function showToast(message: string, options?: ToastOptions) {
  showToastGlobal?.(message, options);
}

export function ToastProvider() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => setToast(null), []);

  const show = useCallback((msg: string, options?: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
    // Force re-render to restart animation
    requestAnimationFrame(() =>
      setToast({
        message: msg,
        action: options?.action,
        duration: options?.duration ?? 2000,
      })
    );
  }, []);

  useEffect(() => {
    showToastGlobal = show;
    return () => {
      showToastGlobal = null;
    };
  }, [show]);

  useEffect(() => {
    if (!toast) return;
    timerRef.current = setTimeout(dismiss, toast.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, dismiss]);

  if (!toast) return null;

  const durationSec = toast.duration / 1000;

  return (
    <div
      className="toast"
      style={{ animationDuration: `${durationSec}s` } as React.CSSProperties}
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          className="toast-action"
          onClick={() => {
            toast.action!.onClick();
            dismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
