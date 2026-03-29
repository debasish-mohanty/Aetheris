import type { Metadata, Viewport } from "next";
import "../app/globals.css";

export const metadata: Metadata = {
  title: "Roleplay Chat",
  description: "Simple roleplay chat with your AI characters",
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-screen bg-slate-900 text-slate-100">
      <body className="antialiased">{children}</body>
    </html>
  );
}
