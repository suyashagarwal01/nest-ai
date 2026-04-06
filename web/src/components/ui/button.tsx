"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

/*
 * Button component — all variants use design token CSS classes.
 *
 * Variants:
 *   primary   — solid dark bg, white text (Save, View Dashboard)
 *   secondary — light gray bg, dark text (Save another)
 *   ghost     — transparent bg, secondary text (Sign out, links)
 *   google    — white bg, bordered (Continue with Google)
 *
 * States: default → hover → active/pressed → disabled, focus-visible
 * Sizes: md (default), lg (wider padding)
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "google" | "brand";
export type ButtonSize = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth = false, className, children, ...props }, ref) => {
    const classes = [
      "btn",
      `btn--${variant}`,
      `btn--${size}`,
      fullWidth ? "btn--full" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
