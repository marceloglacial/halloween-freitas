import type { Metadata } from "next";
import "./globals.css";
import { defaultFont } from "@/util/fonts";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Halloween dos Freitas",
  description:
    "Preparem suas vassouras e poções, pois a noite mais assustadora do ano se aproxima!",
  metadataBase: new URL("https://halloweendosfreitas.vercel.app/"),
  openGraph: {
    images: "/open-graph.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider>{children}</ClerkProvider>
  ) : (
    children
  );

  return (
    <html lang="pt-BR" className="scroll-smooth">
      <body className={`${defaultFont.className} antialiased`}>
        {content}
        <Toaster
          richColors
          position="bottom-center"
          offset="12vh"
          toastOptions={{
            cancelButtonStyle: {
              color: "white",
              backgroundColor: "red",
            },
            actionButtonStyle: {
              backgroundColor: "green",
            },
          }}
        />
      </body>
    </html>
  );
}
