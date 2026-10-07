import type { Metadata } from "next";
import "./globals.css";
import { defaultFont } from "@/util/fonts";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations/pt-BR";

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
    <ClerkProvider
      localization={ptBR}
      appearance={{
        variables: {
          colorPrimary: "#fb923c",
          colorBackground: "#1c1917",
          colorForeground: "#ffffff",
          colorMutedForeground: "#d6d3d1",
          colorInput: "#292524",
          colorInputForeground: "#ffffff",
          colorBorder: "#57534e",
        },
        elements: {
          socialButtonsBlockButton: {
            backgroundColor: "#27272a",
            color: "#ffffff",
          },
          formFieldInput: {
            backgroundColor: "#09090b",
            color: "#ffffff",
            borderColor: "#fb923c",
          },
          otpCodeFieldInput: {
            backgroundColor: "#292524",
            color: "#ffffff",
            borderColor: "#a8a29e",
            caretColor: "#fb923c",
          },
          formResendCodeLink: { color: "#fdba74" },
          formButtonPrimary: { color: "#000000" },
        },
      }}
    >
      {children}
    </ClerkProvider>
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
