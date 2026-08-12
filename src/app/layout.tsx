import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rank Rush",
  description: "Two teams, one ranked list. Guess deeper entries to score more points.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
