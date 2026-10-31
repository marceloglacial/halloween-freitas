import Link from "next/link";
import React from "react";

interface BackButtonProps {
  href: string;
  floating?: boolean;
}
const BackButton: React.FC<BackButtonProps> = ({
  href,
  floating = false,
}): React.JSX.Element => (
  <div
    className={
      floating
        ? "fixed bottom-5 left-4 z-50 sm:bottom-8 sm:left-8"
        : "absolute top-8 right-8"
    }
  >
    <Link
      className={
        floating
          ? "inline-flex min-h-12 items-center rounded-full border border-orange-300/40 bg-zinc-950/90 px-5 py-3 font-semibold text-orange-100 shadow-lg shadow-black/40 backdrop-blur transition hover:border-orange-200 hover:bg-orange-400 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300"
          : "rounded-2xl bg-orange-400 px-4 py-3 text-black lg:px-6 lg:py-4"
      }
      href={href}
    >
      ← Voltar
    </Link>
  </div>
);

export default BackButton;
