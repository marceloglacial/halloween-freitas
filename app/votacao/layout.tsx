import type { Metadata } from "next";
import LogoutButton from "@/components/logout-button";

export const metadata: Metadata = {
  title: "Votação - Halloween dos Freitas",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="fixed top-0 right-0 z-20 p-4 sm:p-6">
        <LogoutButton className="rounded-lg bg-orange-400 px-4 py-2 font-semibold text-black shadow-lg hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:cursor-wait disabled:opacity-60" />
      </div>
      {children}
    </>
  );
}
