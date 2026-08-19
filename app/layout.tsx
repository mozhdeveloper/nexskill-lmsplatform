import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "NexSkill — Learn a Skill. Prove a Skill. Build Your Future.",
    template: "%s | NexSkill",
  },
  description:
    "NexSkill is a global skills-learning marketplace and LMS: structured courses, practical assessment, instructor feedback, and verifiable certification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
