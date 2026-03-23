/*
 * Logo component — Nest brand mark + wordmark.
 *
 * Mark: two overlapping purple gradient ellipses (from Figma asset).
 * Wordmark: "Nest" in Instrument Serif italic.
 *
 * Variants: mark | wordmark | full (mark + wordmark stacked)
 * Sizes: sm (extension), md (login), lg (hero)
 */

export type LogoVariant = "mark" | "wordmark" | "full";
export type LogoSize = "sm" | "md" | "lg";

export type LogoLayout = "vertical" | "horizontal";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  layout?: LogoLayout;
}

const markDimensions: Record<LogoSize, { width: number; height: number }> = {
  sm: { width: 32, height: 23 },
  md: { width: 48, height: 34 },
  lg: { width: 60, height: 43 },
};

function NestMark({ size = "md" }: { size?: LogoSize }) {
  const { width, height } = markDimensions[size];
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 47.9287 34.3553"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M45.0216 20.4665C45.0216 23.4088 42.8477 26.287 38.8605 28.487C34.9085 30.6674 29.3801 32.0466 23.2199 32.0466C17.0597 32.0465 11.5321 30.6674 7.5802 28.487C3.59286 26.287 1.41907 23.4088 1.41907 20.4665C1.41917 17.5243 3.59307 14.6468 7.5802 12.4469C11.5321 10.2665 17.0597 8.88646 23.2199 8.8864C29.3801 8.8864 34.9085 10.2665 38.8605 12.447C42.8475 14.6468 45.0215 17.5243 45.0216 20.4665Z"
        stroke="url(#nest-grad-1)"
        strokeWidth="2"
      />
      <path
        d="M4.07109 11.8471C3.35032 14.5371 4.61722 17.7046 7.7142 20.7011C10.7833 23.6706 15.4904 26.2918 21.1178 27.7998C26.7454 29.3077 32.1332 29.3913 36.276 28.3542C40.4561 27.3076 43.1372 25.1979 43.858 22.508C44.5787 19.8181 43.3117 16.6504 40.2149 13.654C37.1457 10.6845 32.4379 8.06295 26.8103 6.55505C21.1829 5.04724 15.7958 4.96382 11.6531 6.00089C7.47283 7.04738 4.79194 9.1572 4.07109 11.8471Z"
        stroke="url(#nest-grad-2)"
        strokeWidth="2"
      />
      <defs>
        <linearGradient id="nest-grad-1" x1="46.0216" y1="20.4667" x2="0.418823" y2="20.4667" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CDB4EA" />
          <stop offset="1" stopColor="#9B8ED1" />
        </linearGradient>
        <linearGradient id="nest-grad-2" x1="3.10512" y1="11.5885" x2="44.8236" y2="22.7669" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CDB4EA" />
          <stop offset="1" stopColor="#9B8ED1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function NestWordmark({ size = "md" }: { size?: LogoSize }) {
  return (
    <span className={`logo-wordmark logo-wordmark--${size}`}>
      Nest
    </span>
  );
}

export function Logo({ variant = "full", size = "md", layout = "vertical" }: LogoProps) {
  if (variant === "mark") return <NestMark size={size} />;
  if (variant === "wordmark") return <NestWordmark size={size} />;

  const className = layout === "horizontal" ? "logo logo--horizontal" : "logo";

  return (
    <div className={className}>
      <NestMark size={size} />
      <NestWordmark size={size} />
    </div>
  );
}
