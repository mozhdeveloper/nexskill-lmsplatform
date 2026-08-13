import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Nexskill — Learn a Skill. Prove a Skill. Build Your Future.",
    template: "%s | Nexskill",
  },
  description:
    "Nexskill is a global skills-learning marketplace and LMS: structured courses, practical assessment, instructor feedback, and verifiable certification.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
