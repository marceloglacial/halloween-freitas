import { UserImageModalProvider } from "@/components/pages/fotos/user-image-modal-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Galeria de Fotos - Halloween dos Freitas",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <UserImageModalProvider>{children}</UserImageModalProvider>;
}
