import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BackgroundClouds } from "@/components/marketing/BackgroundClouds";
import { FlyingWren } from "@/components/marketing/FlyingWren";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wren — Catch vulnerabilities in vibe-coded apps",
    template: "%s | Wren",
  },
  description:
    "Wren scans AI-built applications for exposed API keys, missing auth checks, and unprotected database rules before you deploy. Join the early access waitlist.",
  keywords: [
    "vulnerability scanner",
    "AI coding",
    "Cursor security",
    "Bolt app scanner",
    "vibe coding",
    "security linter",
    "wren",
  ],
  icons: {
    icon: "/assets/bird-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased text-zinc-950 bg-transparent min-h-screen relative overflow-x-clip">
        <BackgroundClouds />
        {children}

        <FlyingWren />
      </body>
    </html>
  );
}
