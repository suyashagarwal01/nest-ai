import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Nunito_Sans } from "next/font/google";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Nest: Smart Saves",
  description:
    "Save any webpage with one click, get AI-powered tags and a screenshot, and access your collection from anywhere.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nest",
  },
};

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${instrumentSerif.variable} ${nunitoSans.variable} antialiased`}
        style={{ fontFamily: "var(--font-body-alt)" }}
      >
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
