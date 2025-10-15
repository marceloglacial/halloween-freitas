import type { Metadata } from "next";
import "./globals.css";
import { defaultFont } from "@/util/fonts";

export const metadata: Metadata = {
  title: "Halloween dos Freitas",
  description:
    "Preparem suas vassouras e poções, pois a noite mais assustadora do ano se aproxima!",
  openGraph: {
    images: "/open-graph.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${defaultFont.className} antialiased`}>{children}</body>
    </html>
  );
}
