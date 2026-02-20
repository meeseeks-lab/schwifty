import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schwifty — AI Livecoding Music",
  description: "Get schwifty with AI-generated live music patterns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
