import Link from "next/link";
import React from "react";

interface BackButtonProps {
  href: string;
}
const BackButton: React.FC<BackButtonProps> = (props): React.JSX.Element => (
  <div className="absolute top-8 right-8">
    <Link
      className="rounded-2xl bg-orange-400 px-4 py-3 text-white lg:px-6 lg:py-4"
      type="button"
      href={props.href}
    >
      voltar
    </Link>
  </div>
);

export default BackButton;
