"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { GoogleIcon } from "@/components/ui/google-icon";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const mouseTarget = useRef({ x: 0, y: 0 });
  const mouseCurrent = useRef({ x: 0, y: 0 });
  const rafId = useRef<number>(0);

  const supabase = createSupabaseBrowser();

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;

    // Skip mouse tracking on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let hovering = false;
    const MAX_OFFSET = 25;

    const onMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      mouseTarget.current = {
        x: ((e.clientX - cx) / (rect.width / 2)) * MAX_OFFSET,
        y: ((e.clientY - cy) / (rect.height / 2)) * MAX_OFFSET,
      };
      hovering = true;
    };

    const onMouseLeave = () => {
      hovering = false;
      mouseTarget.current = { x: 0, y: 0 };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      const factor = hovering ? 0.04 : 0.02;
      mouseCurrent.current = {
        x: lerp(mouseCurrent.current.x, mouseTarget.current.x, factor),
        y: lerp(mouseCurrent.current.y, mouseTarget.current.y, factor),
      };
      el.style.setProperty("--mouse-x", `${mouseCurrent.current.x}px`);
      el.style.setProperty("--mouse-y", `${mouseCurrent.current.y}px`);
      rafId.current = requestAnimationFrame(tick);
    };

    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseleave", onMouseLeave);
    rafId.current = requestAnimationFrame(tick);

    return () => {
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="login-page">
      {/* Left — decorative panel with animated blurred logo */}
      <div className="login-left" ref={leftRef}>
        <div className="login-blur-wrapper">
          <img
            src="/nest-blur-asset.svg"
            alt=""
            className="login-blur-asset"
            draggable={false}
          />
        </div>
        <div className="login-frost" />
      </div>

      {/* Right — login form */}
      <div className="login-right">
        <div className="login-card">
          <div className="login-brand">
            <Logo variant="full" size="md" />
            <div className="login-subtitle-block">
              <p className="login-subtitle">
                Save links and screenshots from the internet.
              </p>
              <p className="login-subtitle">
                AI organizes them automatically.
              </p>
            </div>
          </div>

          <Button
            variant="google"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleIcon size={16} />
            <span>{loading ? "Signing in…" : "Continue with Google"}</span>
          </Button>

          {error && <p className="login-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
