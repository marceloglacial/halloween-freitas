import Link from "next/link";
import React from "react";

interface BackButtonProps {
  href: string;
}
const BackButton: React.FC<BackButtonProps> = (props): React.JSX.Element => (
  <div className="absolute top-8 right-8">
    <Link
      className="rounded-2xl bg-orange-400 px-6 py-4 text-white"
      type="button"
      href={props.href}
    >
      voltar
    </Link>
  </div>
);

export default BackButton;
