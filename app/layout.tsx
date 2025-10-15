import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { defaultFont } from "@/util/fonts";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
