import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Votação - Halloween dos Freitas",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
