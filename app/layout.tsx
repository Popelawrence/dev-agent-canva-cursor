import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canva Cursor Dev Agent",
  description:
    "Turn a design brief into structured Canva design suggestions — palettes, fonts, layouts, and headlines.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
